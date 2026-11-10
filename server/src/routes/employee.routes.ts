import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { trackCreateOperation } from '../middleware/usageTracker';

const router = Router();

// Mitarbeiter-CRUD
router.get('/', authenticate, requirePermission('employees:view'), (req, res, next) => employeeController.list(req, res, next));
router.post('/', authenticate, requirePermission('employees:create'), trackCreateOperation('employees'), (req, res, next) => employeeController.create(req, res, next));
router.get('/:id', authenticate, requirePermission('employees:view'), (req, res, next) => employeeController.getById(req, res, next));
router.put('/:id', authenticate, requirePermission('employees:edit'), (req, res, next) => employeeController.update(req, res, next));
router.delete('/:id', authenticate, requirePermission('employees:delete'), (req, res, next) => employeeController.delete(req, res, next));

// Qualifikationen
router.post('/:id/qualifications', authenticate, requirePermission('employees:edit'), (req, res, next) => employeeController.addQualification(req, res, next));
router.put('/:id/qualifications/:qid', authenticate, requirePermission('employees:edit'), (req, res, next) => employeeController.updateQualification(req, res, next));
router.delete('/:id/qualifications/:qid', authenticate, requirePermission('employees:edit'), (req, res, next) => employeeController.removeQualification(req, res, next));

// Verfügbarkeiten
router.post('/:id/availabilities', authenticate, requirePermission('employees:edit'), (req, res, next) => employeeController.addAvailability(req, res, next));
router.put('/:id/availabilities/:aid/approve', authenticate, requirePermission('employees:edit'), (req, res, next) => employeeController.approveAvailability(req, res, next));

export default router;
