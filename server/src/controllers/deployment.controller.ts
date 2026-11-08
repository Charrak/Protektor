import { Request, Response, NextFunction } from 'express';
import { deploymentService } from '../services/deployment.service';

export class DeploymentController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, startDate, endDate, employeeId, objectId, status, page, limit } = req.query;
      const result = await deploymentService.list({
        date: date as string,
        startDate: startDate as string,
        endDate: endDate as string,
        employeeId: employeeId as string,
        objectId: objectId as string,
        status: status as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const deployment = await deploymentService.getById(id);
      res.json(deployment);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const deployment = await deploymentService.create(req.body, req.user.id);
      res.status(201).json(deployment);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      const deployment = await deploymentService.update(id, req.body, req.user.id);
      res.json(deployment);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ error: 'Stornierungsgrund erforderlich' });
        return;
      }

      const deployment = await deploymentService.cancel(id, reason, req.user.id);
      res.json(deployment);
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const employeeId = req.body.employeeId;

      if (!employeeId) {
        res.status(400).json({ error: 'Mitarbeiter-ID erforderlich' });
        return;
      }

      const deployment = await deploymentService.confirm(id, employeeId);
      res.json(deployment);
    } catch (error) {
      next(error);
    }
  }

  async getForDateRange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate und endDate erforderlich' });
        return;
      }

      const deployments = await deploymentService.getForDateRange(startDate as string, endDate as string);
      res.json(deployments);
    } catch (error) {
      next(error);
    }
  }
}

export const deploymentController = new DeploymentController();
