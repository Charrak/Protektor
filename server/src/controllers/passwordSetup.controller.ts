import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import bcrypt from 'bcryptjs';

/**
 * Validate password setup token and return tenant info
 */
export async function validateSetupToken(req: Request, res: Response) {
  try {
    const { token, tenant } = req.query;

    if (!token || !tenant) {
      return res.status(400).json({ error: 'Token und Tenant-ID erforderlich' });
    }

    const tenantRecord = await prisma.tenant.findUnique({
      where: { tenantId: tenant as string },
      select: {
        id: true,
        tenantId: true,
        companyName: true,
        contactEmail: true,
        passwordResetToken: true,
        passwordResetTokenExpiry: true,
      },
    });

    if (!tenantRecord) {
      return res.status(404).json({ error: 'Mandant nicht gefunden' });
    }

    if (tenantRecord.passwordResetToken !== token) {
      return res.status(400).json({ error: 'Ungültiger Token' });
    }

    if (!tenantRecord.passwordResetTokenExpiry || tenantRecord.passwordResetTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Token abgelaufen. Bitte fordern Sie einen neuen Link an.' });
    }

    return res.json({
      valid: true,
      companyName: tenantRecord.companyName,
      contactEmail: tenantRecord.contactEmail,
    });
  } catch (error) {
    logger.error('Validate setup token error:', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

/**
 * Set new password for tenant admin
 */
export async function setPassword(req: Request, res: Response) {
  try {
    const { token, tenant, password } = req.body;

    if (!token || !tenant || !password) {
      return res.status(400).json({ error: 'Alle Felder erforderlich' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }

    const tenantRecord = await prisma.tenant.findUnique({
      where: { tenantId: tenant },
      select: {
        id: true,
        contactEmail: true,
        passwordResetToken: true,
        passwordResetTokenExpiry: true,
        users: {
          take: 1,
        },
      },
    });

    if (!tenantRecord) {
      return res.status(404).json({ error: 'Mandant nicht gefunden' });
    }

    if (!tenantRecord) {
      return res.status(404).json({ error: 'Mandant nicht gefunden' });
    }

    if (tenantRecord.passwordResetToken !== token) {
      return res.status(400).json({ error: 'Ungültiger Token' });
    }

    if (!tenantRecord.passwordResetTokenExpiry || tenantRecord.passwordResetTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Token abgelaufen. Bitte fordern Sie einen neuen Link an.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update admin user password
    const adminUser = tenantRecord.users[0];
    if (adminUser) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { passwordHash: hashedPassword },
      });
    }

    // Clear token
    await prisma.tenant.update({
      where: { id: tenantRecord.id },
      data: {
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
    });

    logger.info(`Passwort gesetzt für Mandant: ${tenant}`);

    return res.json({
      success: true,
      message: 'Passwort erfolgreich gesetzt. Sie können sich jetzt anmelden.',
    });
  } catch (error) {
    logger.error('Set password error:', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
