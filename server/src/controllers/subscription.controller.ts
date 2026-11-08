import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';

export class SubscriptionController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, status, page, limit } = req.query;
      const result = await subscriptionService.list({
        tenantId: tenantId as string,
        status: status as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, planId, billingInterval, stripeSubscriptionId, trialDays } = req.body;

      if (!tenantId || !planId || !billingInterval) {
        res.status(400).json({ error: 'tenantId, planId und billingInterval sind erforderlich' });
        return;
      }

      const subscription = await subscriptionService.create({
        tenantId,
        planId,
        billingInterval,
        stripeSubscriptionId,
        trialDays,
      });

      res.status(201).json(subscription);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const subscription = await subscriptionService.update(id, req.body);
      res.json(subscription);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const atPeriodEnd = req.body.atPeriodEnd !== false;
      const subscription = await subscriptionService.cancel(id, atPeriodEnd);
      res.json(subscription);
    } catch (error) {
      next(error);
    }
  }

  async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const subscription = await subscriptionService.reactivate(id);
      res.json(subscription);
    } catch (error) {
      next(error);
    }
  }

  async getByTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.params.tenantId as string;
      const subscription = await subscriptionService.getByTenant(tenantId);
      res.json(subscription);
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionController = new SubscriptionController();
