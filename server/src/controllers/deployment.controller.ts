import { Request, Response, NextFunction } from 'express';
import { deploymentService } from '../services/deployment.service';

export class DeploymentController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, startDate, endDate, employeeId, objectId, status, page, limit, releasedOnly } = req.query;
      
      // Wenn der User ein Mitarbeiter ist (nicht Admin), zeige nur freigegebene Einsätze
      const isEmployee = req.user?.roleSlug === 'employee';
      const shouldFilterReleased = releasedOnly === 'true' || (isEmployee && Boolean(employeeId));
      
      const result = await deploymentService.list({
        date: date as string,
        startDate: startDate as string,
        endDate: endDate as string,
        employeeId: employeeId as string,
        objectId: objectId as string,
        status: status as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        releasedOnly: shouldFilterReleased,
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
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      const deployment = await deploymentService.confirm(id, req.user.id);
      res.json(deployment);
    } catch (error) {
      next(error);
    }
  }

  async decline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      const { reason } = req.body;

      const deployment = await deploymentService.decline(id, req.user.id, reason);
      res.json(deployment);
    } catch (error) {
      next(error);
    }
  }

  async release(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: 'Keine Einsatz-IDs übergeben' });
        return;
      }

      const result = await deploymentService.release(ids, req.user.id);
      res.json({ success: true, ...result });
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
