import { Router } from 'express';
import { deploymentController } from '../controllers/deployment.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.get('/', authenticate, requirePermission('scheduling:view'), (req, res, next) => deploymentController.list(req, res, next));
router.get('/range', authenticate, requirePermission('scheduling:view'), (req, res, next) => deploymentController.getForDateRange(req, res, next));
router.post('/', authenticate, requirePermission('scheduling:create'), (req, res, next) => deploymentController.create(req, res, next));
router.get('/:id', authenticate, requirePermission('scheduling:view'), (req, res, next) => deploymentController.getById(req, res, next));
router.put('/:id', authenticate, requirePermission('scheduling:edit'), (req, res, next) => deploymentController.update(req, res, next));
router.post('/:id/cancel', authenticate, requirePermission('scheduling:edit'), (req, res, next) => deploymentController.cancel(req, res, next));
router.post('/:id/confirm', authenticate, (req, res, next) => deploymentController.confirm(req, res, next));
router.post('/:id/decline', authenticate, (req, res, next) => deploymentController.decline(req, res, next));

export default router;
