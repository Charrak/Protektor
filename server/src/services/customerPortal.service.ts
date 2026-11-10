import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError, UnauthorizedError } from '../middleware/errorHandler';
import { featureService } from './feature.service';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Validierung für Portal-User erstellen
const portalUserCreateSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100),
  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100),
  customerId: z.string().uuid(),
  contactPersonId: z.string().uuid().optional(),
  role: z.enum(['invoiceViewer', 'reportViewer', 'fullAccess', 'admin']).default('invoiceViewer'),
  canViewInvoices: z.boolean().default(true),
  canViewDeployments: z.boolean().default(false),
  canViewTimeRecords: z.boolean().default(false),
  canViewReports: z.boolean().default(false),
  canApproveRecords: z.boolean().default(false),
});

export class CustomerPortalService {
  /**
   * Prüft ob ein Tenant das Customer Portal Add-on hat
   */
  async checkPortalAccess(tenantId: string): Promise<boolean> {
    const result = await featureService.hasFeature(tenantId, 'customer_portal');
    return result.enabled;
  }

  /**
   * Erstellt einen neuen Portal-User
   */
  async createPortalUser(tenantId: string, input: any, createdByUserId: string) {
    // Prüfe ob Tenant Portal-Access hat
    const hasAccess = await this.checkPortalAccess(tenantId);
    if (!hasAccess) {
      throw new UnauthorizedError('Customer Portal Add-on ist nicht aktiviert');
    }

    // Validierung
    const validation = portalUserCreateSchema.safeParse(input);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }

    const data = validation.data;

    // Prüfe ob Kunde existiert
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundError('Kunde');
    }

    // Prüfe ob E-Mail bereits existiert
    const existingUser = await prisma.customerUser.findFirst({
      where: { email: data.email, tenantId },
    });
    if (existingUser) {
      throw new ValidationError('E-Mail-Adresse wird bereits verwendet');
    }

    // Hash Passwort
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Erstelle Portal-User
    const portalUser = await prisma.customerUser.create({
      data: {
        tenantId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        customerId: data.customerId,
        contactPersonId: data.contactPersonId,
        role: data.role,
        canViewInvoices: data.canViewInvoices,
        canViewDeployments: data.canViewDeployments,
        canViewTimeRecords: data.canViewTimeRecords,
        canViewReports: data.canViewReports,
        canApproveRecords: data.canApproveRecords,
        isActive: true,
      },
    });

    // Audit-Log
    await this.logAccess(tenantId, data.customerId, createdByUserId, null, 'create_portal_user');

    logger.info(`Portal-User erstellt: ${data.email} für Kunde ${customer.companyName}`);
    return portalUser;
  }

  /**
   * Portal-Login
   */
  async login(email: string, password: string, tenantId: string) {
    // Prüfe ob Tenant Portal-Access hat
    const hasAccess = await this.checkPortalAccess(tenantId);
    if (!hasAccess) {
      throw new UnauthorizedError('Customer Portal Add-on ist nicht aktiviert');
    }

    // Finde User
    const user = await prisma.customerUser.findFirst({
      where: { email, tenantId, isActive: true },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            customerNumber: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Ungültige Anmeldedaten');
    }

    // Prüfe Passwort
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      // Erhöhe Failed-Logins
      await prisma.customerUser.update({
        where: { id: user.id },
        data: { failedLogins: { increment: 1 } },
      });
      throw new UnauthorizedError('Ungültige Anmeldedaten');
    }

    // Prüfe ob Account gesperrt ist
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account ist gesperrt. Bitte versuchen Sie es später erneut.');
    }

    // Erstelle JWT Token
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        customerId: user.customerId,
        role: user.role,
        type: 'customer_portal',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Reset Failed-Logins und aktualisiere Last-Login
    await prisma.customerUser.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lastLogin: new Date(),
        lockedUntil: null,
      },
    });

    // Audit-Log
    await this.logAccess(tenantId, user.customerId, null, user.id, 'login');

    logger.info(`Portal-Login: ${user.email}`);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        customer: user.customer,
        canViewInvoices: user.canViewInvoices,
        canViewDeployments: user.canViewDeployments,
        canViewTimeRecords: user.canViewTimeRecords,
        canViewReports: user.canViewReports,
        canApproveRecords: user.canApproveRecords,
      },
    };
  }

  /**
   * Passwort zurücksetzen
   */
  async resetPassword(email: string, tenantId: string) {
    const user = await prisma.customerUser.findFirst({
      where: { email, tenantId, isActive: true },
    });

    if (!user) {
      // Aus Sicherheitsgründen keine Fehlermeldung wenn User nicht existiert
      return { success: true, message: 'Falls ein Account existiert, wurde eine E-Mail gesendet.' };
    }

    // Generiere Reset-Token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 Stunde

    await prisma.customerUser.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry,
      },
    });

    // TODO: E-Mail senden mit Reset-Link
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    logger.info(`Password-Reset angefordert: ${user.email}`);
    return { success: true, message: 'Falls ein Account existiert, wurde eine E-Mail gesendet.' };
  }

  /**
   * Passwort mit Token setzen
   */
  async setNewPassword(resetToken: string, newPassword: string, tenantId: string) {
    if (newPassword.length < 8) {
      throw new ValidationError('Passwort muss mindestens 8 Zeichen lang sein');
    }

    const user = await prisma.customerUser.findFirst({
      where: {
        passwordResetToken: resetToken,
        tenantId,
        passwordResetTokenExpiry: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      throw new ValidationError('Ungültiger oder abgelaufener Reset-Token');
    }

    // Hash neues Passwort
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.customerUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
        failedLogins: 0,
      },
    });

    logger.info(`Passwort zurückgesetzt: ${user.email}`);
    return { success: true, message: 'Passwort wurde erfolgreich geändert.' };
  }

  /**
   * Rechnungen für Portal-User abrufen
   */
  async getInvoices(tenantId: string, customerId: string, portalUserId: string) {
    // Prüfe Berechtigung
    const user = await prisma.customerUser.findFirst({
      where: { id: portalUserId, tenantId, customerId },
    });

    if (!user || !user.canViewInvoices) {
      throw new UnauthorizedError('Keine Berechtigung zum Anzeigen von Rechnungen');
    }

    const invoices = await prisma.customerInvoice.findMany({
      where: { customerId, tenantId },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        totalAmount: true,
        status: true,
        paidAt: true,
        pdfUrl: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Audit-Log
    await this.logAccess(tenantId, customerId, null, portalUserId, 'view_invoices');

    return invoices;
  }

  /**
   * Schichtberichte für Portal-User abrufen
   */
  async getShiftReports(tenantId: string, customerId: string, portalUserId: string) {
    const user = await prisma.customerUser.findFirst({
      where: { id: portalUserId, tenantId, customerId },
    });

    if (!user || !user.canViewReports) {
      throw new UnauthorizedError('Keine Berechtigung zum Anzeigen von Berichten');
    }

    const reports = await prisma.shiftReport.findMany({
      where: { customerId, tenantId, status: 'approved' },
      include: {
        object: {
          select: {
            name: true,
            objectNumber: true,
          },
        },
      },
      orderBy: { reportDate: 'desc' },
      take: 50,
    });

    // Audit-Log
    await this.logAccess(tenantId, customerId, null, portalUserId, 'view_reports');

    return reports;
  }

  /**
   * Dokumente für Portal-User abrufen
   */
  async getDocuments(tenantId: string, customerId: string, portalUserId: string) {
    const user = await prisma.customerUser.findFirst({
      where: { id: portalUserId, tenantId, customerId },
    });

    if (!user || !user.canViewInvoices) {
      throw new UnauthorizedError('Keine Berechtigung zum Anzeigen von Dokumenten');
    }

    const documents = await prisma.customerDocument.findMany({
      where: { customerId, tenantId, deletedAt: null },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        category: true,
        description: true,
        expiryDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Audit-Log
    await this.logAccess(tenantId, customerId, null, portalUserId, 'view_documents');

    return documents;
  }

  /**
   * Zugriffsprotokoll erstellen
   */
  private async logAccess(
    tenantId: string,
    customerId: string,
    userId: string | null,
    customerUserId: string | null,
    action: string,
    resourceType?: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.customerAccessLog.create({
        data: {
          tenantId,
          customerId,
          userId,
          customerUserId,
          action,
          resourceType,
          resourceId,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      logger.error('Fehler beim Erstellen des Zugriffsprotokolls:', error);
    }
  }

  /**
   * Alle Portal-User eines Kunden abrufen
   */
  async listPortalUsers(tenantId: string, customerId: string) {
    const users = await prisma.customerUser.findMany({
      where: { customerId, tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        canViewInvoices: true,
        canViewDeployments: true,
        canViewTimeRecords: true,
        canViewReports: true,
        canApproveRecords: true,
      },
      orderBy: { lastName: 'asc' },
    });

    return users;
  }

  /**
   * Portal-User aktualisieren
   */
  async updatePortalUser(tenantId: string, portalUserId: string, updates: any) {
    const user = await prisma.customerUser.findFirst({
      where: { id: portalUserId, tenantId },
    });

    if (!user) {
      throw new NotFoundError('Portal-User');
    }

    const updated = await prisma.customerUser.update({
      where: { id: portalUserId },
      data: {
        ...(updates.firstName !== undefined && { firstName: updates.firstName }),
        ...(updates.lastName !== undefined && { lastName: updates.lastName }),
        ...(updates.role !== undefined && { role: updates.role }),
        ...(updates.canViewInvoices !== undefined && { canViewInvoices: updates.canViewInvoices }),
        ...(updates.canViewDeployments !== undefined && { canViewDeployments: updates.canViewDeployments }),
        ...(updates.canViewTimeRecords !== undefined && { canViewTimeRecords: updates.canViewTimeRecords }),
        ...(updates.canViewReports !== undefined && { canViewReports: updates.canViewReports }),
        ...(updates.canApproveRecords !== undefined && { canApproveRecords: updates.canApproveRecords }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      },
    });

    logger.info(`Portal-User aktualisiert: ${updated.email}`);
    return updated;
  }

  /**
   * Portal-User löschen
   */
  async deletePortalUser(tenantId: string, portalUserId: string) {
    const user = await prisma.customerUser.findFirst({
      where: { id: portalUserId, tenantId },
    });

    if (!user) {
      throw new NotFoundError('Portal-User');
    }

    await prisma.customerUser.delete({
      where: { id: portalUserId },
    });

    logger.info(`Portal-User gelöscht: ${user.email}`);
    return { success: true, message: 'Portal-User gelöscht' };
  }
}

export const customerPortalService = new CustomerPortalService();
