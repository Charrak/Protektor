import { Router } from 'express';
import { reminderService } from '../services/reminder.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

/**
 * GET /api/v1/reminders/customer/:customerId
 * Alle Mahnungen für einen Kunden abrufen
 */
router.get(
  '/customer/:customerId',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const customerId = req.params.customerId as string;
      const { tenantId } = req.user!;
      const reminders = await reminderService.listByCustomer(tenantId, customerId);
      res.json(reminders);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reminders/invoice/:invoiceId
 * Alle Mahnungen für eine Rechnung abrufen
 */
router.get(
  '/invoice/:invoiceId',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const invoiceId = req.params.invoiceId as string;
      const { tenantId } = req.user!;
      const reminders = await reminderService.listByInvoice(tenantId, invoiceId);
      res.json(reminders);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reminders/:reminderId
 * Einzelne Mahnung abrufen
 */
router.get(
  '/:reminderId',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const reminderId = req.params.reminderId as string;
      const { tenantId } = req.user!;
      const reminder = await reminderService.getById(tenantId, reminderId);
      res.json(reminder);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/reminders
 * Neue Mahnung erstellen
 */
router.post(
  '/',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const { tenantId, id: userId } = req.user!;
      const reminder = await reminderService.create(tenantId, req.body, userId);
      res.status(201).json(reminder);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/reminders/:reminderId/mark-paid
 * Mahnung als bezahlt markieren
 */
router.post(
  '/:reminderId/mark-paid',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const reminderId = req.params.reminderId as string;
      const { tenantId, id: userId } = req.user!;
      const reminder = await reminderService.markAsPaid(tenantId, reminderId, userId);
      res.json(reminder);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/reminders/:reminderId/mark-sent
 * Mahnung als versendet markieren
 */
router.post(
  '/:reminderId/mark-sent',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const reminderId = req.params.reminderId as string;
      const { sentVia } = req.body;
      const { tenantId, id: userId } = req.user!;
      
      if (!sentVia || !['email', 'post', 'portal'].includes(sentVia)) {
        res.status(400).json({ error: 'sentVia muss email, post oder portal sein' });
        return;
      }
      
      const reminder = await reminderService.markAsSent(tenantId, reminderId, sentVia, userId);
      res.json(reminder);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reminders/open
 * Offene Mahnungen abrufen
 */
router.get(
  '/open',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const { tenantId } = req.user!;
      const customerId = req.query.customerId as string | undefined;
      const reminders = await reminderService.getOpenReminders(tenantId, customerId);
      res.json(reminders);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reminders/overdue-invoices
 * Überfällige Rechnungen ohne Mahnung finden
 */
router.get(
  '/overdue-invoices',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const { tenantId } = req.user!;
      const invoices = await reminderService.getOverdueInvoicesWithoutReminder(tenantId);
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reminders/statistics
 * Statistiken für Mahnwesen
 */
router.get(
  '/statistics',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const { tenantId } = req.user!;
      const stats = await reminderService.getStatistics(tenantId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/reminders/:reminderId
 * Mahnung löschen
 */
router.delete(
  '/:reminderId',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const reminderId = req.params.reminderId as string;
      const { tenantId, id: userId } = req.user!;
      await reminderService.delete(tenantId, reminderId, userId);
      res.json({ message: 'Mahnung gelöscht' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
