import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

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
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 Minuten
        path: '/',
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
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
        sameSite: 'strict',
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
}

export const authController = new AuthController();
