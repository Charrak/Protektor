import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/database';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleSlug: string;
  permissions: string[];
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  sessionId: string;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Token aus Authorization Header (Vorrang) oder Cookie
    let token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Kein Authentifizierungstoken vorhanden' });
      return;
    }

    // JWT validieren
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Benutzer und Berechtigungen laden
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, isActive: true, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
              where: { granted: true },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Benutzer nicht gefunden oder inaktiv' });
      return;
    }

    // Session prüfen
    const session = await prisma.session.findFirst({
      where: {
        userId: user.id,
        id: decoded.sessionId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sitzung abgelaufen' });
      return;
    }

    // Session-Aktivität aktualisieren
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    // Berechtigungen extrahieren
    const permissions = user.role.rolePermissions.map((rp: { permission: { slug: string } }) => rp.permission.slug);

    // User-Objekt an Request anhängen
    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleSlug: user.role.slug,
      permissions,
      sessionId: session.id,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Token abgelaufen' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'INVALID_TOKEN', message: 'Ungültiger Token' });
      return;
    }
    next(error);
  }
}
