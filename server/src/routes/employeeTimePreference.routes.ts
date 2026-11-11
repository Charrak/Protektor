import { Router } from 'express';
import { employeeTimePreferenceController } from '../controllers/employeeTimePreference.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.use(authenticate);

// Zeitpräferenzen
router.post(
  '/employees/:employeeId/time-preferences',
  requirePermission('employees:edit'),
  (req, res, next) => employeeTimePreferenceController.create(req, res, next)
);

router.get(
  '/employees/:employeeId/time-preferences',
  requirePermission('employees:view'),
  (req, res, next) => employeeTimePreferenceController.listByEmployee(req, res, next)
);

router.put(
  '/time-preferences/:id',
  requirePermission('employees:edit'),
  (req, res, next) => employeeTimePreferenceController.update(req, res, next)
);

router.delete(
  '/time-preferences/:id',
  requirePermission('employees:edit'),
  (req, res, next) => employeeTimePreferenceController.delete(req, res, next)
);

// Zeit-Anfragen (Freiwünsche)
router.post(
  '/employees/:employeeId/time-requests',
  requirePermission('employees:edit'),
  (req, res, next) => employeeTimePreferenceController.createTimeRequest(req, res, next)
);

router.get(
  '/employees/:employeeId/time-requests',
  requirePermission('employees:view'),
  (req, res, next) => employeeTimePreferenceController.listTimeRequestsByEmployee(req, res, next)
);

router.post(
  '/time-requests/:id/approve',
  requirePermission('employees:edit'),
  (req, res, next) => employeeTimePreferenceController.approveTimeRequest(req, res, next)
);

export default router;
