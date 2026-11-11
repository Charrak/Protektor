import { Router } from 'express';
import { planningGroupController } from '../controllers/planningGroup.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// Alle Routen erfordern Authentifizierung
router.use(authenticate);

// Planungsgruppen erstellen
router.post(
  '/',
  requirePermission('planning_groups:create'),
  (req, res, next) => planningGroupController.create(req, res, next)
);

// Planungsgruppen auflisten
router.get(
  '/',
  requirePermission('planning_groups:read'),
  (req, res, next) => planningGroupController.list(req, res, next)
);

// Einzelne Planungsgruppe abrufen
router.get(
  '/:id',
  requirePermission('planning_groups:read'),
  (req, res, next) => planningGroupController.getById(req, res, next)
);

// Planungsgruppe aktualisieren
router.put(
  '/:id',
  requirePermission('planning_groups:update'),
  (req, res, next) => planningGroupController.update(req, res, next)
);

// Planungsgruppe löschen
router.delete(
  '/:id',
  requirePermission('planning_groups:delete'),
  (req, res, next) => planningGroupController.delete(req, res, next)
);

// Objekte zu Planungsgruppe hinzufügen
router.post(
  '/:id/objects',
  requirePermission('planning_groups:update'),
  (req, res, next) => planningGroupController.addObjects(req, res, next)
);

// Mitarbeiter zu Planungsgruppe hinzufügen
router.post(
  '/:id/employees',
  requirePermission('planning_groups:update'),
  (req, res, next) => planningGroupController.addEmployees(req, res, next)
);

// Objekte aus Planungsgruppe entfernen
router.delete(
  '/:id/objects',
  requirePermission('planning_groups:update'),
  (req, res, next) => planningGroupController.removeObjects(req, res, next)
);

// Mitarbeiter aus Planungsgruppe entfernen
router.delete(
  '/:id/employees',
  requirePermission('planning_groups:update'),
  (req, res, next) => planningGroupController.removeEmployees(req, res, next)
);

export default router;
