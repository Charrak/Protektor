import { Request, Response, NextFunction } from 'express';
import { platformAdminService } from '../services/platformAdmin.service';

export interface PlatformAdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      platformAdmin?: PlatformAdminUser;
    }
  }
}

export async function platformAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.platformAccessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Kein Authentifizierungstoken vorhanden' });
      return;
    }

    const admin = await platformAdminService.validateToken(token);

    if (!admin) {
      res.status(401).json({ error: 'INVALID_TOKEN', message: 'Ungültiges oder abgelaufenes Token' });
      return;
    }

    req.platformAdmin = admin;
    next();
  } catch (error) {
    res.status(401).json({ error: 'AUTH_ERROR', message: 'Authentifizierungsfehler' });
  }
}
