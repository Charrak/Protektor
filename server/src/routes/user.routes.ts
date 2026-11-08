import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.get('/', authenticate, requirePermission('admin:users'), (req, res, next) => userController.list(req, res, next));
router.post('/', authenticate, requirePermission('admin:users'), (req, res, next) => userController.create(req, res, next));
router.get('/:id', authenticate, requirePermission('admin:users'), (req, res, next) => userController.getById(req, res, next));
router.put('/:id', authenticate, requirePermission('admin:users'), (req, res, next) => userController.update(req, res, next));
router.delete('/:id', authenticate, requirePermission('admin:users'), (req, res, next) => userController.delete(req, res, next));
router.put('/:id/password', authenticate, requirePermission('admin:users'), (req, res, next) => userController.resetPassword(req, res, next));

export default router;
