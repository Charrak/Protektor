import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { logger } from '../config/logger';

interface PlatformLoginResult {
  admin: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export class PlatformAdminService {
  async login(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<PlatformLoginResult> {
    const admin = await prisma.platformAdmin.findUnique({
      where: { username, isActive: true },
    });

    if (!admin) {
      throw new Error('Ungültiger Benutzername oder Passwort');
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      throw new Error('Ungültiger Benutzername oder Passwort');
    }

    const sessionId = uuidv4();
    const accessToken = jwt.sign(
      { adminId: admin.id, sessionId, type: 'platform' },
      config.jwtSecret,
      { expiresIn: '1h' } as any
    );
    const refreshToken = jwt.sign(
      { adminId: admin.id, sessionId, type: 'platform' },
      config.jwtRefreshSecret,
      { expiresIn: '30d' } as any
    );

    await prisma.platformSession.create({
      data: {
        id: sessionId,
        adminId: admin.id,
        token: accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    logger.info(`Plattform-Admin angemeldet: ${admin.username}`);

    return {
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await prisma.platformSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      if (decoded.type !== 'platform') return null;

      const session = await prisma.platformSession.findUnique({
        where: { id: decoded.sessionId, isActive: true },
        include: { admin: true },
      });

      if (!session || session.expiresAt < new Date()) return null;

      return {
        id: session.admin.id,
        username: session.admin.username,
        email: session.admin.email,
        firstName: session.admin.firstName,
        lastName: session.admin.lastName,
        sessionId: session.id,
      };
    } catch {
      return null;
    }
  }

  async getMe(adminId: string) {
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) throw new Error('Admin nicht gefunden');

    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      lastLogin: admin.lastLogin,
    };
  }
}

export const platformAdminService = new PlatformAdminService();
