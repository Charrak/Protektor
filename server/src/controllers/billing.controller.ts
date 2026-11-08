import { Request, Response, NextFunction } from 'express';
import { billingService } from '../services/billing.service';

export class BillingController {
  async calculatePayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId, startDate, endDate } = req.query;
      if (!employeeId || !startDate || !endDate) {
        res.status(400).json({ error: 'employeeId, startDate und endDate erforderlich' });
        return;
      }
      const result = await billingService.calculateEmployeePayroll(employeeId as string, startDate as string, endDate as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async generateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }
      const { customerId, startDate, endDate } = req.body;
      if (!customerId || !startDate || !endDate) {
        res.status(400).json({ error: 'customerId, startDate und endDate erforderlich' });
        return;
      }
      const invoice = await billingService.generateCustomerInvoice(customerId, startDate, endDate, req.user.id);
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }

  async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customerId, status, page, limit } = req.query;
      const result = await billingService.listInvoices({
        customerId: customerId as string,
        status: status as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const billingController = new BillingController();
