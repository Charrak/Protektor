import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler';
import { z } from 'zod';

// Validierung für Mahnung erstellen
const reminderCreateSchema = z.object({
  invoiceId: z.string().uuid(),
  customerId: z.string().uuid(),
  reminderLevel: z.enum(['reminder1', 'reminder2', 'reminder3']),
  reminderDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  amountDue: z.number().min(0),
  lateFees: z.number().min(0).default(0),
  subject: z.string().min(1).max(200),
  message: z.string().min(1),
  notes: z.string().optional(),
  sentVia: z.enum(['email', 'post', 'portal']).optional(),
});

export class ReminderService {
  /**
   * Liste aller Mahnungen für einen Kunden
   */
  async listByCustomer(tenantId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError('Kunde');

    const reminders = await prisma.reminder.findMany({
      where: { customerId, tenantId },
      include: {
        customer: { select: { companyName: true, customerNumber: true } },
        invoice: { select: { invoiceNumber: true, invoiceDate: true, totalAmount: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ reminderDate: 'desc' }],
    });

    return reminders;
  }

  /**
   * Liste aller Mahnungen für eine Rechnung
   */
  async listByInvoice(tenantId: string, invoiceId: string) {
    const reminders = await prisma.reminder.findMany({
      where: { invoiceId, tenantId },
      include: {
        customer: { select: { companyName: true, customerNumber: true } },
        invoice: { select: { invoiceNumber: true, invoiceDate: true, totalAmount: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ reminderLevel: 'asc' }],
    });

    return reminders;
  }

  /**
   * Einzelne Mahnung abrufen
   */
  async getById(tenantId: string, reminderId: string) {
    const reminder = await prisma.reminder.findFirst({
      where: { id: reminderId, tenantId },
      include: {
        customer: { select: { companyName: true, customerNumber: true } },
        invoice: { select: { invoiceNumber: true, invoiceDate: true, totalAmount: true, status: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!reminder) throw new NotFoundError('Mahnung');
    return reminder;
  }

  /**
   * Mahnung erstellen
   */
  async create(tenantId: string, input: any, userId: string) {
    // Validierung
    const validation = reminderCreateSchema.safeParse(input);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }

    const data = validation.data;

    // Kunde prüfen
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError('Kunde');

    // Rechnung prüfen
    const invoice = await prisma.customerInvoice.findFirst({
      where: { id: data.invoiceId, tenantId, customerId: data.customerId },
    });
    if (!invoice) throw new NotFoundError('Rechnung');

    // Prüfen ob Mahnung dieser Stufe bereits existiert
    const existing = await prisma.reminder.findFirst({
      where: { invoiceId: data.invoiceId, tenantId, reminderLevel: data.reminderLevel },
    });
    if (existing) {
      throw new ConflictError(`Mahnung Stufe ${data.reminderLevel} existiert bereits für diese Rechnung`);
    }

    // Prüfen ob niedrigere Stufe bereits existiert (außer bei reminder1)
    if (data.reminderLevel === 'reminder2') {
      const level1 = await prisma.reminder.findFirst({
        where: { invoiceId: data.invoiceId, tenantId, reminderLevel: 'reminder1' },
      });
      if (!level1) {
        throw new ValidationError('Erste Mahnung muss vor zweiter Mahnung erstellt werden');
      }
    }
    if (data.reminderLevel === 'reminder3') {
      const level2 = await prisma.reminder.findFirst({
        where: { invoiceId: data.invoiceId, tenantId, reminderLevel: 'reminder2' },
      });
      if (!level2) {
        throw new ValidationError('Zweite Mahnung muss vor dritter Mahnung erstellt werden');
      }
    }

    const reminder = await prisma.reminder.create({
      data: {
        tenantId,
        invoiceId: data.invoiceId,
        customerId: data.customerId,
        reminderLevel: data.reminderLevel,
        reminderDate: new Date(data.reminderDate),
        dueDate: new Date(data.dueDate),
        amountDue: data.amountDue,
        lateFees: data.lateFees,
        subject: data.subject,
        message: data.message,
        notes: data.notes,
        sentVia: data.sentVia,
        sentAt: data.sentVia ? new Date() : null,
        createdById: userId,
      },
    });

    // Update Customer.reminderStatus
    const reminderStatusMap = {
      reminder1: 'reminder1' as const,
      reminder2: 'reminder2' as const,
      reminder3: 'reminder3' as const,
    };
    await prisma.customer.update({
      where: { id: data.customerId },
      data: { reminderStatus: reminderStatusMap[data.reminderLevel] },
    });

    // Update Invoice.reminderStatus
    await prisma.customerInvoice.update({
      where: { id: data.invoiceId },
      data: { reminderStatus: reminderStatusMap[data.reminderLevel] },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'create', 'reminder', reminder.id, null, data);

    logger.info(`Mahnung erstellt: ${data.reminderLevel} für Rechnung ${invoice.invoiceNumber}`);
    return reminder;
  }

  /**
   * Mahnung als bezahlt markieren
   */
  async markAsPaid(tenantId: string, reminderId: string, userId: string) {
    const reminder = await prisma.reminder.findFirst({
      where: { id: reminderId, tenantId, paidAt: null },
    });

    if (!reminder) throw new ValidationError('Mahnung nicht gefunden oder bereits bezahlt');

    const updated = await prisma.reminder.update({
      where: { id: reminderId },
      data: { paidAt: new Date() },
    });

    // Update Rechnung auf paid
    await prisma.customerInvoice.update({
      where: { id: reminder.invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'markAsPaid', 'reminder', reminderId, null, null);

    logger.info(`Mahnung als bezahlt markiert: ${reminderId}`);
    return updated;
  }

  /**
   * Mahnung versenden (sentAt setzen)
   */
  async markAsSent(tenantId: string, reminderId: string, sentVia: 'email' | 'post' | 'portal', userId: string) {
    const reminder = await prisma.reminder.findFirst({
      where: { id: reminderId, tenantId },
    });

    if (!reminder) throw new NotFoundError('Mahnung');

    const updated = await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        sentVia,
        sentAt: new Date(),
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'send', 'reminder', reminderId, null, null);

    logger.info(`Mahnung versendet: ${reminderId} via ${sentVia}`);
    return updated;
  }

  /**
   * Offene Mahnungen abrufen (nicht bezahlt)
   */
  async getOpenReminders(tenantId: string, customerId?: string) {
    const where: any = {
      tenantId,
      paidAt: null,
    };

    if (customerId) where.customerId = customerId;

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        customer: { select: { companyName: true, customerNumber: true, invoiceEmail: true } },
        invoice: { select: { invoiceNumber: true, invoiceDate: true, totalAmount: true, dueDate: true } },
      },
      orderBy: [{ reminderDate: 'asc' }],
    });

    return reminders;
  }

  /**
   * Überfällige Rechnungen ohne Mahnung finden
   */
  async getOverdueInvoicesWithoutReminder(tenantId: string) {
    const now = new Date();

    // Alle überfälligen Rechnungen
    const overdueInvoices = await prisma.customerInvoice.findMany({
      where: {
        tenantId,
        status: { not: 'paid' },
        dueDate: { lt: now },
      },
      include: {
        customer: { select: { companyName: true, customerNumber: true, invoiceEmail: true } },
      },
    });

    // Prüfe welche noch keine Mahnung haben
    const withoutReminder = [];
    for (const invoice of overdueInvoices) {
      const existingReminder = await prisma.reminder.findFirst({
        where: { invoiceId: invoice.id, tenantId },
      });
      if (!existingReminder) {
        withoutReminder.push(invoice);
      }
    }

    return withoutReminder;
  }

  /**
   * Statistiken für Mahnwesen
   */
  async getStatistics(tenantId: string) {
    const now = new Date();

    const [totalReminders, openReminders, paidReminders, overdueInvoices] = await Promise.all([
      prisma.reminder.count({ where: { tenantId } }),
      prisma.reminder.count({ where: { tenantId, paidAt: null } }),
      prisma.reminder.count({ where: { tenantId, paidAt: { not: null } } }),
      prisma.customerInvoice.count({
        where: {
          tenantId,
          status: { not: 'paid' },
          dueDate: { lt: now },
        },
      }),
    ]);

    // Summe offener Forderungen
    const openAmount = await prisma.reminder.aggregate({
      where: { tenantId, paidAt: null },
      _sum: { amountDue: true, lateFees: true },
    });

    return {
      totalReminders,
      openReminders,
      paidReminders,
      overdueInvoices,
      openAmount: {
        due: openAmount._sum.amountDue || 0,
        fees: openAmount._sum.lateFees || 0,
        total: (openAmount._sum.amountDue || 0) + (openAmount._sum.lateFees || 0),
      },
    };
  }

  /**
   * Mahnung löschen
   */
  async delete(tenantId: string, reminderId: string, userId: string) {
    const reminder = await prisma.reminder.findFirst({
      where: { id: reminderId, tenantId },
    });

    if (!reminder) throw new NotFoundError('Mahnung');

    await prisma.reminder.delete({
      where: { id: reminderId },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'delete', 'reminder', reminderId, reminder, null);

    logger.info(`Mahnung gelöscht: ${reminderId}`);
  }

  /**
   * Audit-Log erstellen
   */
  private async logAudit(
    tenantId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValue: any,
    newValue: any
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          oldValue: oldValue || undefined,
          newValue: newValue || undefined,
        },
      });
    } catch (error) {
      logger.error('Fehler beim Erstellen des Audit-Logs:', error);
    }
  }
}

export const reminderService = new ReminderService();
