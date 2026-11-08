import { Request, Response, NextFunction } from 'express';
import { autoPlannerService } from '../services/autoPlanner.service';

export class AutoPlannerController {
  async findCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectId, date, startTime, endTime, requiredCount } = req.body;

      if (!objectId || !date || !startTime || !endTime || !requiredCount) {
        res.status(400).json({ error: 'Alle Felder erforderlich: objectId, date, startTime, endTime, requiredCount' });
        return;
      }

      const candidates = await autoPlannerService.findCandidates({
        objectId,
        date,
        startTime,
        endTime,
        requiredCount,
      });

      res.json({ candidates });
    } catch (error) {
      next(error);
    }
  }
}

export const autoPlannerController = new AutoPlannerController();
