import { Request, Response, NextFunction } from 'express';
import { platformAdminService } from '../services/platformAdmin.service';

export class PlatformAuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
        return;
      }

      const result = await platformAdminService.login(
        username,
        password,
        req.ip || req.socket.remoteAddress || undefined,
        req.headers['user-agent']
      );

      res.cookie('platformAccessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1h
        path: '/',
      });

      res.cookie('platformRefreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
        path: '/',
      });

      res.json({
        admin: result.admin,
        sessionId: result.sessionId,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.platformAdmin?.sessionId) {
        await platformAdminService.logout(req.platformAdmin.sessionId);
      }

      res.clearCookie('platformAccessToken');
      res.clearCookie('platformRefreshToken');

      res.json({ message: 'Erfolgreich abgemeldet' });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformAdmin) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const admin = await platformAdminService.getMe(req.platformAdmin.id);
      res.json(admin);
    } catch (error) {
      next(error);
    }
  }
}

export const platformAuthController = new PlatformAuthController();
