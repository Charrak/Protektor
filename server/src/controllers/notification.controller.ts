import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  /**
   * GET /notifications
   * Holt alle Notifications für den aktuellen User
   */
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await notificationService.getNotificationsForUser(req.user.id, limit);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/unread
   * Holt ungelesene Notifications für den aktuellen User
   */
  async getUnreadNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const notifications = await notificationService.getUnreadNotifications(req.user.id);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/count
   * Zählt ungelesene Notifications für den aktuellen User
   */
  async countUnread(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const count = await notificationService.countUnread(req.user.id);

      res.json({
        success: true,
        count,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/:id/read
   * Markiert eine Notification als gelesen
   */
  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, req.user.id);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/read-all
   * Markiert alle Notifications als gelesen
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const result = await notificationService.markAllAsRead(req.user.id);

      res.json({
        success: true,
        count: result.count,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /notifications/:id
   * Löscht eine Notification
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const { id } = req.params;
      await notificationService.deleteNotification(id, req.user.id);

      res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
