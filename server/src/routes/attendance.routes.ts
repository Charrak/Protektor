import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.get('/', authenticate, requirePermission('attendance:view'), (req, res, next) => attendanceController.list(req, res, next));
router.post('/clock-in', authenticate, requirePermission('attendance:create'), (req, res, next) => attendanceController.clockIn(req, res, next));
router.post('/:id/clock-out', authenticate, requirePermission('attendance:create'), (req, res, next) => attendanceController.clockOut(req, res, next));
router.post('/:id/approve', authenticate, requirePermission('attendance:approve'), (req, res, next) => attendanceController.approve(req, res, next));
router.post('/:id/correct', authenticate, requirePermission('attendance:edit'), (req, res, next) => attendanceController.correct(req, res, next));

export default router;
