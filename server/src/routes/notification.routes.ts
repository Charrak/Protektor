import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Alle Routes erfordern Authentifizierung
router.use(authenticate);

// GET /notifications - Alle Notifications
router.get('/', notificationController.getNotifications);

// GET /notifications/unread - Ungelesene Notifications
router.get('/unread', notificationController.getUnreadNotifications);

// GET /notifications/count - Anzahl ungelesener Notifications
router.get('/count', notificationController.countUnread);

// PUT /notifications/read-all - Alle als gelesen markieren
router.put('/read-all', notificationController.markAllAsRead);

// PUT /notifications/:id/read - Einzelne als gelesen markieren
router.put('/:id/read', notificationController.markAsRead);

// DELETE /notifications/:id - Notification löschen
router.delete('/:id', notificationController.deleteNotification);

export default router;
