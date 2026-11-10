import { Router } from 'express';
import { customerDocumentService } from '../services/customerDocument.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

/**
 * GET /api/v1/customer-documents/customer/:customerId
 * Alle Dokumente für einen Kunden abrufen
 */
router.get(
  '/customer/:customerId',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const customerId = req.params.customerId as string;
      const { tenantId, id: userId } = req.user!;
      const documents = await customerDocumentService.listByCustomer(tenantId, customerId);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/customer-documents/:documentId
 * Einzelnes Dokument abrufen
 */
router.get(
  '/:documentId',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const documentId = req.params.documentId as string;
      const { tenantId } = req.user!;
      const document = await customerDocumentService.getById(tenantId, documentId);
      res.json(document);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/customer-documents
 * Neues Dokument erstellen
 */
router.post(
  '/',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const { tenantId, id: userId } = req.user!;
      const document = await customerDocumentService.create(tenantId, req.body, userId);
      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/customer-documents/:documentId/verify
 * Dokument verifizieren
 */
router.put(
  '/:documentId/verify',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const documentId = req.params.documentId as string;
      const { tenantId, id: userId } = req.user!;
      const document = await customerDocumentService.verify(tenantId, documentId, userId);
      res.json(document);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/customer-documents/:documentId
 * Dokument löschen (Soft-Delete)
 */
router.delete(
  '/:documentId',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      const documentId = req.params.documentId as string;
      const { tenantId, id: userId } = req.user!;
      await customerDocumentService.delete(tenantId, documentId, userId);
      res.json({ message: 'Dokument gelöscht' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/customer-documents/expiring?days=90
 * Ablaufende Dokumente abrufen
 */
router.get(
  '/expiring/all',
  authenticate,
  requirePermission('admin:audit_log'),
  async (req, res, next) => {
    try {
      const { tenantId } = req.user!;
      const days = parseInt(req.query.days as string) || 90;
      const documents = await customerDocumentService.getExpiring(tenantId, days);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/customer-documents/deletable/all
 * Löschbare Dokumente abrufen (Aufbewahrungsfrist abgelaufen)
 */
router.get(
  '/deletable/all',
  authenticate,
  requirePermission('admin:audit_log'),
  async (req, res, next) => {
    try {
      const { tenantId } = req.user!;
      const documents = await customerDocumentService.getDeletable(tenantId);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/customer-documents/:documentId/permanent-delete
 * Dokument physisch löschen (nach Aufbewahrungsfrist)
 */
router.post(
  '/:documentId/permanent-delete',
  authenticate,
  requirePermission('admin:settings'),
  async (req, res, next) => {
    try {
      const documentId = req.params.documentId as string;
      const { tenantId, id: userId } = req.user!;
      await customerDocumentService.permanentDelete(tenantId, documentId, userId);
      res.json({ message: 'Dokument physisch gelöscht' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/customer-documents/:documentId/versions
 * Versionshistorie eines Dokuments abrufen
 */
router.get(
  '/:documentId/versions',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const documentId = req.params.documentId as string;
      const { tenantId } = req.user!;
      const versions = await customerDocumentService.getVersionHistory(tenantId, documentId);
      res.json(versions);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/customer-documents/customer/:customerId/grouped
 * Dokumente nach Kategorie gruppiert abrufen
 */
router.get(
  '/customer/:customerId/grouped',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      const customerId = req.params.customerId as string;
      const { tenantId } = req.user!;
      const grouped = await customerDocumentService.getGroupedByCategory(tenantId, customerId);
      res.json(grouped);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
