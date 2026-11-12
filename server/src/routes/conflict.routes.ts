import express from 'express';
import { conflictController } from '../controllers/conflict.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Alle Routes benötigen Authentifizierung
router.use(authenticate);

// GET /api/conflicts - Konflikte im Zeitraum prüfen
router.get('/', conflictController.getConflicts);

// GET /api/conflicts/stats - Konflikt-Statistiken
router.get('/stats', conflictController.getConflictStats);

export default router;
