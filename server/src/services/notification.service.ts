import { prisma } from '../config/database';
import { logger } from '../config/logger';

export type NotificationType =
  | 'deployment_assigned'
  | 'deployment_released'
  | 'deployment_cancelled'
  | 'deployment_confirmed'
  | 'deployment_declined'
  | 'shift_swap_request'
  | 'shift_swap_approved'
  | 'shift_swap_declined'
  | 'vacation_request'
  | 'vacation_approved'
  | 'vacation_declined'
  | 'time_request_approved'
  | 'time_request_declined'
  | 'general';

export class NotificationService {
  /**
   * Erstellt eine neue Notification
   */
  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
        },
      });

      logger.info(`Notification erstellt für User ${params.userId}: ${params.type}`);
      return notification;
    } catch (error) {
      logger.error('Fehler beim Erstellen der Notification:', error);
      throw error;
    }
  }

  /**
   * Erstellt Notifications für mehrere User
   */
  async createNotificationsForUsers(params: {
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
  }) {
    try {
      const notifications = await prisma.notification.createMany({
        data: params.userIds.map(userId => ({
          userId,
          type: params.type,
          title: params.title,
          message: params.message,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
        })),
      });

      logger.info(`${notifications.count} Notifications erstellt`);
      return notifications;
    } catch (error) {
      logger.error('Fehler beim Erstellen der Notifications:', error);
      throw error;
    }
  }

  /**
   * Holt alle Notifications für einen User
   */
  async getNotificationsForUser(userId: string, limit: number = 50) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return notifications;
    } catch (error) {
      logger.error('Fehler beim Laden der Notifications:', error);
      throw error;
    }
  }

  /**
   * Holt ungelesene Notifications für einen User
   */
  async getUnreadNotifications(userId: string) {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      return notifications;
    } catch (error) {
      logger.error('Fehler beim Laden der ungelesenen Notifications:', error);
      throw error;
    }
  }

  /**
   * Markiert eine Notification als gelesen
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info(`Notification ${notificationId} als gelesen markiert`);
      return notification;
    } catch (error) {
      logger.error('Fehler beim Markieren der Notification:', error);
      throw error;
    }
  }

  /**
   * Markiert alle Notifications eines Users als gelesen
   */
  async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info(`${result.count} Notifications als gelesen markiert`);
      return result;
    } catch (error) {
      logger.error('Fehler beim Markieren aller Notifications:', error);
      throw error;
    }
  }

  /**
   * Löscht eine Notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    try {
      await prisma.notification.delete({
        where: {
          id: notificationId,
          userId,
        },
      });

      logger.info(`Notification ${notificationId} gelöscht`);
    } catch (error) {
      logger.error('Fehler beim Löschen der Notification:', error);
      throw error;
    }
  }

  /**
   * Zählt ungelesene Notifications für einen User
   */
  async countUnread(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      return count;
    } catch (error) {
      logger.error('Fehler beim Zählen der Notifications:', error);
      throw error;
    }
  }

  /**
   * Benachrichtigt Mitarbeiter über neuen Einsatz
   */
  async notifyDeploymentAssigned(userId: string, deploymentId: string, deploymentDetails: {
    date: Date;
    startTime: string;
    endTime: string;
    objectName: string;
  }) {
    const dateStr = deploymentDetails.date.toLocaleDateString('de-DE');
    
    return this.createNotification({
      userId,
      type: 'deployment_assigned',
      title: 'Neuer Einsatz zugewiesen',
      message: `Du wurdest für den ${dateStr} von ${deploymentDetails.startTime} bis ${deploymentDetails.endTime} bei ${deploymentDetails.objectName} eingeplant.`,
      resourceType: 'deployment',
      resourceId: deploymentId,
    });
  }

  /**
   * Benachrichtigt Mitarbeiter über freigegebenen Einsatz
   */
  async notifyDeploymentReleased(userIds: string[], deploymentIds: string[]) {
    return this.createNotificationsForUsers({
      userIds,
      type: 'deployment_released',
      title: 'Einsätze freigegeben',
      message: `${deploymentIds.length} neue Einsätze wurden freigegeben und warten auf deine Bestätigung.`,
      resourceType: 'deployments',
    });
  }

  /**
   * Benachrichtigt über Schichtwechsel-Anfrage
   */
  async notifyShiftSwapRequest(recipientId: string, requestId: string, details: {
    requesterName: string;
    date: Date;
    objectName: string;
  }) {
    const dateStr = details.date.toLocaleDateString('de-DE');
    
    return this.createNotification({
      userId: recipientId,
      type: 'shift_swap_request',
      title: 'Schichtwechsel-Anfrage',
      message: `${details.requesterName} möchte die Schicht am ${dateStr} bei ${details.objectName} mit dir tauschen.`,
      resourceType: 'shift_swap',
      resourceId: requestId,
    });
  }

  /**
   * Benachrichtigt über Urlaubsantrag
   */
  async notifyVacationRequest(recipientId: string, requestId: string, details: {
    requesterName: string;
    startDate: Date;
    endDate: Date;
    days: number;
  }) {
    const startStr = details.startDate.toLocaleDateString('de-DE');
    const endStr = details.endDate.toLocaleDateString('de-DE');
    
    return this.createNotification({
      userId: recipientId,
      type: 'vacation_request',
      title: 'Neuer Urlaubsantrag',
      message: `${details.requesterName} hat Urlaub von ${startStr} bis ${endStr} beantragt (${details.days} Tage).`,
      resourceType: 'vacation',
      resourceId: requestId,
    });
  }
}

export const notificationService = new NotificationService();
