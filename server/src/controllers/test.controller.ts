import { Request, Response } from 'express';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

export class TestController {
  /**
   * GET /api/v1/test/users
   * Debug: Zeigt alle User (nur für Entwicklung)
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          failedLogins: true,
          lockedUntil: true,
          lastLogin: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      console.error('Fehler beim Laden der User:', error);
      res.status(500).json({
        success: false,
        error: 'Fehler beim Laden der User',
      });
    }
  }

  /**
   * POST /api/v1/test/check-user
   * Debug: Prüft ob User existiert und Passwort korrekt ist
   */
  async checkUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username) {
        res.status(400).json({ error: 'Username erforderlich' });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          username,
          deletedAt: null,
        },
      });

      if (!user) {
        res.json({
          success: false,
          error: 'User nicht gefunden',
          username,
        });
        return;
      }

      let passwordValid = false;
      if (password) {
        passwordValid = await bcrypt.compare(password, user.passwordHash);
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          failedLogins: user.failedLogins,
          lockedUntil: user.lockedUntil,
          lastLogin: user.lastLogin,
        },
        passwordValid,
      });
    } catch (error) {
      console.error('Fehler beim Prüfen des Users:', error);
      res.status(500).json({
        success: false,
        error: 'Fehler beim Prüfen des Users',
      });
    }
  }
}

export const testController = new TestController();
