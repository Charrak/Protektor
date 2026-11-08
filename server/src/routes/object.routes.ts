import { Router } from 'express';
import { objectController } from '../controllers/object.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.get('/', authenticate, requirePermission('objects:view'), (req, res, next) => objectController.list(req, res, next));
router.post('/', authenticate, requirePermission('objects:create'), (req, res, next) => objectController.create(req, res, next));
router.get('/:id', authenticate, requirePermission('objects:view'), (req, res, next) => objectController.getById(req, res, next));
router.put('/:id', authenticate, requirePermission('objects:edit'), (req, res, next) => objectController.update(req, res, next));
router.put('/:id/requirements', authenticate, requirePermission('objects:edit'), (req, res, next) => objectController.setRequirements(req, res, next));

export default router;
