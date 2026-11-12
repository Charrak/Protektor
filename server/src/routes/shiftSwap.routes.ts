import { Router } from 'express';
import { shiftSwapController } from '../controllers/shiftSwap.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// Alle Routes erfordern Authentifizierung
router.use(authenticate);

// POST /shift-swaps - Schichtwechsel-Anfrage erstellen
router.post('/', shiftSwapController.createShiftSwap);

// GET /shift-swaps - Alle Schichtwechsel-Anfragen
router.get('/', shiftSwapController.getShiftSwaps);

// GET /shift-swaps/:id - Einzelne Schichtwechsel-Anfrage
router.get('/:id', shiftSwapController.getShiftSwapById);

// POST /shift-swaps/:id/approve - Schichtwechsel genehmigen
router.post('/:id/approve', requirePermission('scheduling:edit'), shiftSwapController.approveShiftSwap);

// POST /shift-swaps/:id/decline - Schichtwechsel ablehnen
router.post('/:id/decline', requirePermission('scheduling:edit'), shiftSwapController.declineShiftSwap);

// POST /shift-swaps/:id/cancel - Schichtwechsel stornieren
router.post('/:id/cancel', shiftSwapController.cancelShiftSwap);

// GET /shift-swaps/:deploymentId/candidates - Ersatz-Mitarbeiter finden
router.get('/:deploymentId/candidates', requirePermission('scheduling:view'), shiftSwapController.findCandidates);

export default router;
