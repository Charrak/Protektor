import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notification.service';

const router = Router();

/**
 * GET /api/v1/notifications
 * Liste aller Benachrichtigungen des aktuellen Benutzers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { isRead, type, page, limit } = req.query;

    const result = await notificationService.list(tenantId, userId, {
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      type: type as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Benachrichtigungen konnten nicht geladen werden' });
  }
});

/**
 * GET /api/v1/notifications/unread-count
 * Anzahl ungelesener Benachrichtigungen
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const result = await notificationService.getUnreadCount(tenantId, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Anzahl konnte nicht ermittelt werden' });
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 * Benachrichtigung als gelesen markieren
 */
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const notificationId = req.params.id as string;

    const notification = await notificationService.markAsRead(tenantId, userId, notificationId);
    res.json({ success: true, data: notification });
  } catch (error: any) {
    if (error.message === 'Benachrichtigung nicht gefunden') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Benachrichtigung konnte nicht aktualisiert werden' });
  }
});

/**
 * PUT /api/v1/notifications/read-all
 * Alle Benachrichtigungen als gelesen markieren
 */
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const result = await notificationService.markAllAsRead(tenantId, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Benachrichtigungen konnten nicht aktualisiert werden' });
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Benachrichtigung löschen
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const notificationId = req.params.id as string;

    const result = await notificationService.delete(tenantId, userId, notificationId);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Benachrichtigung nicht gefunden') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Benachrichtigung konnte nicht gelöscht werden' });
  }
});

export default router;
