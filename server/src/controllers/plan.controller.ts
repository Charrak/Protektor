import { Request, Response, NextFunction } from 'express';
import { planService } from '../services/plan.service';

export class PlanController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const plans = await planService.list({ activeOnly });
      res.json(plans);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, slug, description, monthlyPrice, yearlyPrice, employeeLimit, features } = req.body;

      if (!name || !slug || monthlyPrice === undefined || yearlyPrice === undefined) {
        res.status(400).json({ error: 'name, slug, monthlyPrice und yearlyPrice sind erforderlich' });
        return;
      }

      const plan = await planService.create({
        name,
        slug,
        description,
        monthlyPrice,
        yearlyPrice,
        employeeLimit,
        features,
      });

      res.status(201).json(plan);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const plan = await planService.update(id, req.body);
      res.json(plan);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await planService.delete(id);
      res.json({ message: 'Tarif gelöscht' });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const plan = await planService.getById(id);
      res.json(plan);
    } catch (error) {
      next(error);
    }
  }
}

export const planController = new PlanController();
