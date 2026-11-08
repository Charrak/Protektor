import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

router.get('/invoices', authenticate, requirePermission('billing:invoices'), (req, res, next) => billingController.listInvoices(req, res, next));
router.post('/invoices/generate', authenticate, requirePermission('billing:invoices'), (req, res, next) => billingController.generateInvoice(req, res, next));
router.get('/payroll', authenticate, requirePermission('billing:payroll'), (req, res, next) => billingController.calculatePayroll(req, res, next));

export default router;
