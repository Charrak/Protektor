import { Request, Response, NextFunction } from 'express';
import { objectService } from '../services/object.service';

export class ObjectController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, customerId, isActive, page, limit } = req.query;
      const result = await objectService.list({
        search: search as string,
        customerId: customerId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
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
      const obj = await objectService.getById(id, req.user!.tenantId);
      res.json(obj);
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

      const { objectNumber, customerId, name } = req.body;

      if (!objectNumber || !customerId || !name) {
        res.status(400).json({ error: 'Objektnummer, Kunde und Name sind erforderlich' });
        return;
      }

      const obj = await objectService.create(req.body, req.user.id);
      res.status(201).json(obj);
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
      const obj = await objectService.update(id, req.body, req.user.id);
      res.json(obj);
    } catch (error) {
      next(error);
    }
  }

  async setRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      const { requirements } = req.body;

      if (!Array.isArray(requirements)) {
        res.status(400).json({ error: 'requirements muss ein Array sein' });
        return;
      }

      await objectService.setRequirements(id, requirements, req.user.tenantId, req.user.id);
      res.json({ message: 'Anforderungen aktualisiert' });
    } catch (error) {
      next(error);
    }
  }
}

export const objectController = new ObjectController();
