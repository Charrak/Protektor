import { Router } from 'express';
import { replacementController } from '../controllers/replacement.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// Alle Routen erfordern Authentifizierung
router.use(authenticate);

// Ersatz suchen
router.post(
  '/search',
  requirePermission('scheduling:edit'),
  (req, res, next) => replacementController.search(req, res, next)
);

// Ersatz durchführen
router.post(
  '/execute',
  requirePermission('scheduling:edit'),
  (req, res, next) => replacementController.execute(req, res, next)
);

export default router;
