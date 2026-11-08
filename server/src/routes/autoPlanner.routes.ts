import { Router } from 'express';
import { autoPlannerController } from '../controllers/autoPlanner.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.post('/suggest', authenticate, requirePermission('scheduling:auto_plan'), (req, res, next) => autoPlannerController.findCandidates(req, res, next));

export default router;
