import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { logger } from '../config/logger';

interface LoginResult {
  user: {
    id: string;
    tenantId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: {
      id: string;
      name: string;
      slug: string;
    };
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export class AuthService {
  /**
   * Benutzer anmelden
   */
  async login(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    // Benutzer laden
    const user = await prisma.user.findFirst({
      where: { username, deletedAt: null },
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
      throw new Error('Ungültiger Benutzername oder Passwort');
    }

    // Konto gesperrt?
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new Error(`Konto gesperrt. Versuch es in ${minutesLeft} Minuten erneut.`);
    }

    // Konto aktiv?
    if (!user.isActive) {
      throw new Error('Konto deaktiviert. Bitte Administrator kontaktieren.');
    }

    // Passwort prüfen
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      // Fehlversuche erhöhen
      const failedLogins = user.failedLogins + 1;
      const updateData: any = { failedLogins };

      if (failedLogins >= config.maxFailedLogins) {
        updateData.lockedUntil = new Date(Date.now() + config.lockoutDurationMs);
        logger.warn(`Konto gesperrt wegen zu vieler Fehlversuche: ${username}`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new Error('Ungültiger Benutzername oder Passwort');
    }

    // Fehlversuche zurücksetzen
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    // Session erstellen
    const sessionId = uuidv4();
    const accessToken = jwt.sign(
      { userId: user.id, sessionId },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    );
    const refreshToken = jwt.sign(
      { userId: user.id, sessionId },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn } as SignOptions
    );

    // Session in DB speichern
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        token: accessToken,
        refreshToken,
        ipAddress: ipAddress || '',
        userAgent: userAgent || '',
        expiresAt: new Date(Date.now() + config.sessionTimeoutMs),
      },
    });

    // Alte inaktive Sessions aufräumen (mehr als 3 gleichzeitige)
    const activeSessions = await prisma.session.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeSessions.length > 3) {
      const sessionsToDelete = activeSessions.slice(3);
      await prisma.session.updateMany({
        where: { id: { in: sessionsToDelete.map((s: { id: string }) => s.id) } },
        data: { isActive: false },
      });
    }

    // Berechtigungen extrahieren
    const permissions = user.role.rolePermissions.map((rp: { permission: { slug: string } }) => rp.permission.slug);

    logger.info(`Benutzer angemeldet: ${username} (${user.role.slug})`);

    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: {
          id: user.role.id,
          name: user.role.name,
          slug: user.role.slug,
        },
        permissions,
      },
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Benutzer abmelden
   */
  async logout(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  /**
   * Token erneuern
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { userId: string; sessionId: string };

      // Session prüfen
      const session = await prisma.session.findFirst({
        where: {
          userId: decoded.userId,
          id: decoded.sessionId,
          isActive: true,
        },
      });

      if (!session) {
        throw new Error('Sitzung nicht mehr aktiv');
      }

      // Neuen Token generieren
      const newAccessToken = jwt.sign(
        { userId: decoded.userId, sessionId: decoded.sessionId },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn } as SignOptions
      );

      // Session aktualisieren
      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: newAccessToken,
          lastActivityAt: new Date(),
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken,
      };
    } catch (error) {
      throw new Error('Token-Erneuerung fehlgeschlagen');
    }
  }

  /**
   * Benutzerinformationen abrufen
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
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
      throw new Error('Benutzer nicht gefunden');
    }

    const permissions = user.role.rolePermissions.map((rp: { permission: { slug: string } }) => rp.permission.slug);

    return {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: {
        id: user.role.id,
        name: user.role.name,
        slug: user.role.slug,
      },
      permissions,
      lastLogin: user.lastLogin,
    };
  }

  /**
   * Passwort ändern
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Benutzer nicht gefunden');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new Error('Aktuelles Passwort ist falsch');

    if (newPassword.length < 8) {
      throw new Error('Neues Passwort muss mindestens 8 Zeichen lang sein');
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Alle anderen Sitzungen beenden
    await prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    logger.info(`Passwort geändert für Benutzer: ${user.username}`);
  }
}

export const authService = new AuthService();
