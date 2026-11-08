import { Router } from 'express';
import { addonController } from '../controllers/addon.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Alle Addon-Routes erfordern Authentifizierung
router.use(authenticate);

/**
 * @route   GET /api/v1/addons
 * @desc    Listet alle verfügbaren Add-ons
 * @access  Private (alle authentifizierten Benutzer)
 */
router.get('/', addonController.listAvailable);

/**
 * @route   GET /api/v1/addons/my
 * @desc    Listet die aktiven Add-ons des aktuellen Tenants
 * @access  Private
 */
router.get('/my', addonController.listMyAddons);

/**
 * @route   GET /api/v1/addons/monthly-cost
 * @desc    Gibt die monatlichen Add-on-Kosten zurück
 * @access  Private
 */
router.get('/monthly-cost', addonController.getMonthlyCost);

/**
 * @route   POST /api/v1/addons/:addonId/activate
 * @desc    Aktiviert ein Add-on für den aktuellen Tenant
 * @access  Private (Admin)
 */
router.post('/:addonId/activate', addonController.activateAddon);

/**
 * @route   POST /api/v1/addons/:tenantAddonId/deactivate
 * @desc    Deaktiviert ein Add-on
 * @access  Private (Admin)
 */
router.post('/:tenantAddonId/deactivate', addonController.deactivateAddon);

/**
 * @route   GET /api/v1/features
 * @desc    Gibt alle Features für den aktuellen Tenant zurück
 * @access  Private
 */
router.get('/features', addonController.getMyFeatures);

/**
 * @route   GET /api/v1/features/check/:featureKey
 * @desc    Prüft ob ein bestimmtes Feature verfügbar ist
 * @access  Private
 */
router.get('/features/check/:featureKey', addonController.checkFeature);

export default router;
