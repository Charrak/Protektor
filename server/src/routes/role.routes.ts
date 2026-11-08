import { Router } from 'express';
import { roleController } from '../controllers/role.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.get('/', authenticate, requirePermission('admin:roles'), (req, res, next) => roleController.list(req, res, next));
router.post('/', authenticate, requirePermission('admin:roles'), (req, res, next) => roleController.create(req, res, next));
router.get('/permissions', authenticate, requirePermission('admin:roles'), (req, res, next) => roleController.listPermissions(req, res, next));
router.get('/:id', authenticate, requirePermission('admin:roles'), (req, res, next) => roleController.getById(req, res, next));
router.put('/:id', authenticate, requirePermission('admin:roles'), (req, res, next) => roleController.update(req, res, next));
router.put('/:id/permissions', authenticate, requirePermission('admin:roles'), (req, res, next) => roleController.setPermissions(req, res, next));
router.delete('/:id', authenticate, requirePermission('admin:roles'), (req, res, next) => roleController.delete(req, res, next));

export default router;
