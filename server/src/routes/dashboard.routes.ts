import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.get('/', authenticate, requirePermission('dashboard:view'), (req, res, next) =>
  dashboardController.getDashboard(req, res, next),
);

export default router;
