import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { broadcastToUser } from '../config/websocket';

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'reminder'
  | 'deployment'
  | 'invoice'
  | 'document'
  | 'shift_report'
  | 'system';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
}

export class NotificationService {
  /**
   * Erstellt eine Benachrichtigung und sendet sie per WebSocket
   */
  async create(input: CreateNotificationInput) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
        },
      });

      // Echtzeit-Benachrichtigung per WebSocket
      try {
        broadcastToUser('notification:new', notification, input.userId);
      } catch (wsError) {
        // WebSocket-Fehler nicht kritisch
        logger.debug('WebSocket-Benachrichtigung fehlgeschlagen', wsError);
      }

      logger.debug(`Benachrichtigung erstellt: ${input.title} → User ${input.userId}`);
      return notification;
    } catch (error) {
      logger.error('Benachrichtigung erstellen fehlgeschlagen', error);
      throw error;
    }
  }

  /**
   * Erstellt Benachrichtigungen für mehrere Benutzer
   */
  async createBatch(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
    try {
      const notifications = await Promise.all(
        userIds.map((userId) => this.create({ ...input, userId }))
      );
      return notifications;
    } catch (error) {
      logger.error('Batch-Benachrichtigung fehlgeschlagen', error);
      throw error;
    }
  }

  /**
   * Liste der Benachrichtigungen für einen Benutzer
   */
  async list(tenantId: string, userId: string, filters: {
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { isRead, type, page = 1, limit = 20 } = filters;

    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;
    if (type) where.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Markiert eine Benachrichtigung als gelesen
   */
  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Benachrichtigung nicht gefunden');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Markiert alle Benachrichtigungen als gelesen
   */
  async markAllAsRead(tenantId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { updated: result.count };
  }

  /**
   * Löscht eine Benachrichtigung
   */
  async delete(tenantId: string, userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Benachrichtigung nicht gefunden');
    }

    await prisma.notification.delete({ where: { id: notificationId } });
    return { success: true };
  }

  /**
   * Anzahl ungelesener Benachrichtigungen
   */
  async getUnreadCount(tenantId: string, userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  // ─── Vordefinierte Benachrichtigungen ───

  /**
   * Benachrichtigung für neue Schichtzuweisung
   */
  async notifyNewDeployment(tenantId: string, userId: string, deployment: {
    id: string;
    customerName: string;
    date: Date;
    startTime: string;
    endTime: string;
  }) {
    return this.create({
      userId,
      type: 'deployment',
      title: 'Neue Schicht zugewiesen',
      message: `Schicht bei ${deployment.customerName} am ${new Date(deployment.date).toLocaleDateString('de-DE')} (${deployment.startTime} - ${deployment.endTime})`,
      resourceType: 'deployment',
      resourceId: deployment.id,
    });
  }

  /**
   * Benachrichtigung für Schichtänderung
   */
  async notifyDeploymentChanged(tenantId: string, userId: string, deployment: {
    id: string;
    customerName: string;
    change: string;
  }) {
    return this.create({
      userId,
      type: 'deployment',
      title: 'Schicht geändert',
      message: `Ihre Schicht bei ${deployment.customerName} wurde geändert: ${deployment.change}`,
      resourceType: 'deployment',
      resourceId: deployment.id,
    });
  }

  /**
   * Benachrichtigung für neue Rechnung
   */
  async notifyNewInvoice(tenantId: string, userId: string, invoice: {
    id: string;
    invoiceNumber: string;
    amount: number;
  }) {
    return this.create({
      userId,
      type: 'invoice',
      title: 'Neue Rechnung erstellt',
      message: `Rechnung ${invoice.invoiceNumber} über ${invoice.amount.toFixed(2)} € wurde erstellt.`,
      resourceType: 'invoice',
      resourceId: invoice.id,
    });
  }

  /**
   * Benachrichtigung für Zahlungserinnerung
   */
  async notifyPaymentDue(tenantId: string, userId: string, invoice: {
    id: string;
    invoiceNumber: string;
    dueDate: Date;
  }) {
    return this.create({
      userId,
      type: 'reminder',
      title: 'Zahlung fällig',
      message: `Rechnung ${invoice.invoiceNumber} ist am ${new Date(invoice.dueDate).toLocaleDateString('de-DE')} fällig.`,
      resourceType: 'invoice',
      resourceId: invoice.id,
    });
  }

  /**
   * Benachrichtigung für neues Dokument
   */
  async notifyNewDocument(tenantId: string, userId: string, document: {
    id: string;
    name: string;
    type: string;
  }) {
    return this.create({
      userId,
      type: 'document',
      title: 'Neues Dokument',
      message: `Dokument "${document.name}" (${document.type}) wurde hochgeladen.`,
      resourceType: 'document',
      resourceId: document.id,
    });
  }

  /**
   * Benachrichtigung für Schichtbericht
   */
  async notifyShiftReportSubmitted(tenantId: string, userId: string, report: {
    id: string;
    objectName: string;
    reporterName: string;
  }) {
    return this.create({
      userId,
      type: 'shift_report',
      title: 'Schichtbericht eingereicht',
      message: `${report.reporterName} hat einen Schichtbericht für ${report.objectName} eingereicht.`,
      resourceType: 'shift_report',
      resourceId: report.id,
    });
  }
}

export const notificationService = new NotificationService();
