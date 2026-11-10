import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
        return;
      }

      const result = await authService.login(
        username,
        password,
        req.ip || req.socket.remoteAddress || undefined,
        req.headers['user-agent']
      );

      // Tokens in HttpOnly-Cookies setzen
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 Minuten
        path: '/',
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Tage
        path: '/',
      });

      res.json({
        user: result.user,
        sessionId: result.sessionId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('gesperrt')) {
        res.status(423).json({ error: error.message });
        return;
      }
      if (error instanceof Error && error.message.includes('Ungültig')) {
        res.status(401).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.sessionId) {
        await authService.logout(req.user.sessionId);
      }

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.json({ message: 'Erfolgreich abgemeldet' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ error: 'Kein Refresh-Token vorhanden' });
        return;
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });

      res.json({
        message: 'Token erneuert',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      res.status(401).json({ error: 'Token-Erneuerung fehlgeschlagen' });
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const user = await authService.getMe(req.user.id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/auth/password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
        return;
      }

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      // Cookies löschen (Benutzer muss sich neu anmelden)
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.json({ message: 'Passwort erfolgreich geändert. Bitte erneut anmelden.' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Sendet eine E-Mail mit Reset-Link an die angegebene E-Mail-Adresse
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'E-Mail-Adresse erforderlich' });
        return;
      }

      // User suchen
      const user = await prisma.user.findFirst({
        where: { email, isActive: true, deletedAt: null },
        include: { tenant: true },
      });

      // Immer Erfolg zurückgeben (Security: keine Info, ob E-Mail existiert)
      // Aber im Dev-Mode geben wir den Token trotzdem zurück
      const isDev = process.env.NODE_ENV === 'development';

      if (user) {
        // Reset-Token generieren (gültig für 1 Stunde)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde

        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: resetToken,
            passwordResetTokenExpiry: resetTokenExpiry,
          },
        });

        // Im Dev-Mode: Token in Response zurückgeben
        if (isDev) {
          res.json({
            message: 'Reset-Link wurde gesendet',
            resetToken, // Nur im Dev-Mode!
            resetUrl: `http://localhost:3000/reset-password?token=${resetToken}`,
          });
        } else {
          // In Production: E-Mail senden
          const resetUrl = `${req.headers.origin || 'https://sms-platform.de'}/reset-password?token=${resetToken}`;
          // TODO: E-Mail-Versand implementieren
          // await emailService.sendPasswordResetEmail(user.email, resetUrl);
          res.json({ message: 'Reset-Link wurde gesendet' });
        }
      } else {
        res.json({ message: 'Reset-Link wurde gesendet' });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * Setzt ein neues Passwort mit dem Reset-Token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token und neues Passwort erforderlich' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
        return;
      }

      // User mit gültigem Token suchen
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetTokenExpiry: { gte: new Date() },
          isActive: true,
          deletedAt: null,
        },
      });

      if (!user) {
        res.status(400).json({ error: 'Ungültiger oder abgelaufener Reset-Token' });
        return;
      }

      // Passwort hashen und speichern
      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetTokenExpiry: null,
          failedLogins: 0,
          lockedUntil: null,
        },
      });

      res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
