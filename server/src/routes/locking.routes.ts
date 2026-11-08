import { Router } from 'express';
import { lockingController } from '../controllers/locking.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/acquire', authenticate, (req, res, next) => lockingController.acquireLock(req, res, next));
router.put('/:id/heartbeat', authenticate, (req, res, next) => lockingController.heartbeat(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => lockingController.releaseLock(req, res, next));
router.get('/active', authenticate, (req, res, next) => lockingController.getActiveLocks(req, res, next));
router.get('/resource/:type/:id', authenticate, (req, res, next) => lockingController.getActiveLocks(req, res, next));

export default router;
