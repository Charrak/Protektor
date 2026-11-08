import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.get('/', authenticate, requirePermission('customers:view'), (req, res, next) => customerController.list(req, res, next));
router.post('/', authenticate, requirePermission('customers:create'), (req, res, next) => customerController.create(req, res, next));
router.get('/:id', authenticate, requirePermission('customers:view'), (req, res, next) => customerController.getById(req, res, next));
router.put('/:id', authenticate, requirePermission('customers:edit'), (req, res, next) => customerController.update(req, res, next));
router.delete('/:id', authenticate, requirePermission('customers:delete'), (req, res, next) => customerController.delete(req, res, next));

router.post('/:id/contacts', authenticate, requirePermission('customers:edit'), (req, res, next) => customerController.addContactPerson(req, res, next));
router.put('/:id/contacts/:cid', authenticate, requirePermission('customers:edit'), (req, res, next) => customerController.updateContactPerson(req, res, next));
router.delete('/:id/contacts/:cid', authenticate, requirePermission('customers:edit'), (req, res, next) => customerController.deleteContactPerson(req, res, next));

export default router;
