import { Router } from 'express';
import { shiftReportService } from '../services/shiftReport.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

/**
 * GET /api/v1/shift-reports/customer/:customerId
 * Alle Schichtberichte für einen Kunden abrufen
 */
router.get(
  '/customer/:customerId',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const customerId = req.params.customerId as string;
      const { tenantId } = req.user!;
      
      const filters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        status: req.query.status as string | undefined,
        objectId: req.query.objectId as string | undefined,
      };

      const reports = await shiftReportService.listByCustomer(tenantId, customerId, filters);
      res.json(reports);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/shift-reports/object/:objectId
 * Alle Schichtberichte für ein Objekt abrufen
 */
router.get(
  '/object/:objectId',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const objectId = req.params.objectId as string;
      const { tenantId } = req.user!;
      const limit = parseInt(req.query.limit as string) || 50;
      const reports = await shiftReportService.listByObject(tenantId, objectId, limit);
      res.json(reports);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/shift-reports/:reportId
 * Einzelnen Schichtbericht abrufen
 */
router.get(
  '/:reportId',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const reportId = req.params.reportId as string;
      const { tenantId } = req.user!;
      const report = await shiftReportService.getById(tenantId, reportId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/shift-reports
 * Neuen Schichtbericht erstellen
 */
router.post(
  '/',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const { tenantId, id: userId } = req.user!;
      const report = await shiftReportService.create(tenantId, req.body, userId);
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/shift-reports/:reportId
 * Schichtbericht aktualisieren
 */
router.put(
  '/:reportId',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const reportId = req.params.reportId as string;
      const { tenantId, id: userId } = req.user!;
      const report = await shiftReportService.update(tenantId, reportId, req.body, userId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/shift-reports/:reportId/submit
 * Schichtbericht einreichen
 */
router.post(
  '/:reportId/submit',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const reportId = req.params.reportId as string;
      const { tenantId, id: userId } = req.user!;
      const report = await shiftReportService.submit(tenantId, reportId, userId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/shift-reports/:reportId/approve
 * Schichtbericht genehmigen
 */
router.post(
  '/:reportId/approve',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const reportId = req.params.reportId as string;
      const { tenantId, id: userId } = req.user!;
      const report = await shiftReportService.approve(tenantId, reportId, userId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/shift-reports/:reportId/archive
 * Schichtbericht archivieren
 */
router.post(
  '/:reportId/archive',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const reportId = req.params.reportId as string;
      const { tenantId, id: userId } = req.user!;
      const report = await shiftReportService.archive(tenantId, reportId, userId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/shift-reports/:reportId
 * Schichtbericht löschen
 */
router.delete(
  '/:reportId',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const reportId = req.params.reportId as string;
      const { tenantId, id: userId } = req.user!;
      await shiftReportService.delete(tenantId, reportId, userId);
      res.json({ message: 'Schichtbericht gelöscht' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/shift-reports/statistics
 * Statistiken für Schichtberichte
 */
router.get(
  '/statistics',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const { tenantId } = req.user!;
      const customerId = req.query.customerId as string | undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const stats = await shiftReportService.getStatistics(tenantId, customerId, dateFrom, dateTo);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
