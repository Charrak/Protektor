import { Request, Response, NextFunction } from 'express';
import { objectShiftPatternService } from '../services/objectShiftPattern.service';

export class ObjectShiftPatternController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { objectId } = req.params;
      const pattern = await objectShiftPatternService.create(
        req.user.tenantId || req.user.id,
        objectId,
        req.body,
        req.user.id
      );

      res.status(201).json({ success: true, data: pattern });
    } catch (error) {
      next(error);
    }
  }

  async listByObject(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { objectId } = req.params;
      const patterns = await objectShiftPatternService.listByObject(
        req.user.tenantId || req.user.id,
        objectId
      );

      res.json({
        success: true,
        data: patterns.map(p => ({
          ...p,
          startTime: p.startTime.toISOString().substr(11, 5),
          endTime: p.endTime.toISOString().substr(11, 5)
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const pattern = await objectShiftPatternService.update(
        req.user.tenantId || req.user.id,
        id,
        req.body
      );

      res.json({ success: true, data: pattern });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      await objectShiftPatternService.delete(req.user.tenantId || req.user.id, id);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export const objectShiftPatternController = new ObjectShiftPatternController();
