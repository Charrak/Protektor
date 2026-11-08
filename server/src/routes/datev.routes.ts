import { Router } from 'express';
import { datevController } from '../controllers/datev.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// Alle DATEV-Routes erfordern Authentifizierung
router.use(authenticate);

/**
 * @route   POST /api/v1/datev/export
 * @desc    Generiert DATEV-Export für Abrechnungszeitraum
 * @access  Private (Admin, Manager)
 */
router.post(
  '/export',
  requirePermission('billing.create'),
  datevController.generateExport
);

/**
 * @route   GET /api/v1/datev/export/:year/:month/download
 * @desc    Lädt DATEV-Export herunter
 * @access  Private (Admin, Manager)
 */
router.get(
  '/export/:year/:month/download',
  requirePermission('billing.read'),
  datevController.downloadExport
);

/**
 * @route   GET /api/v1/datev/validate
 * @desc    Validiert Mitarbeiter-Daten für DATEV
 * @access  Private (Admin)
 */
router.get(
  '/validate',
  requirePermission('employee.manage'),
  datevController.validateData
);

/**
 * @route   GET /api/v1/datev/summary/:year/:month
 * @desc    Zeigt DATEV-Export Zusammenfassung
 * @access  Private (Admin, Manager)
 */
router.get(
  '/summary/:year/:month',
  requirePermission('billing.read'),
  datevController.getSummary
);

export default router;
