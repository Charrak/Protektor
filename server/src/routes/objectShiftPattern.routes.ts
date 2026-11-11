import { Router } from 'express';
import { objectShiftPatternController } from '../controllers/objectShiftPattern.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// Alle Routen erfordern Authentifizierung
router.use(authenticate);

// Schichtmuster für ein Objekt
router.post(
  '/objects/:objectId/shift-patterns',
  requirePermission('objects:edit'),
  (req, res, next) => objectShiftPatternController.create(req, res, next)
);

router.get(
  '/objects/:objectId/shift-patterns',
  requirePermission('objects:view'),
  (req, res, next) => objectShiftPatternController.listByObject(req, res, next)
);

router.put(
  '/shift-patterns/:id',
  requirePermission('objects:edit'),
  (req, res, next) => objectShiftPatternController.update(req, res, next)
);

router.delete(
  '/shift-patterns/:id',
  requirePermission('objects:edit'),
  (req, res, next) => objectShiftPatternController.delete(req, res, next)
);

export default router;
