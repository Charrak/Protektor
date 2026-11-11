import { Request, Response, NextFunction } from 'express';
import { replacementService } from '../services/replacement.service';

export class ReplacementController {
  /**
   * POST /replacement/search
   * Sucht Ersatz für einen Einsatz
   */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deploymentId, reason } = req.body;

      if (!deploymentId) {
        res.status(400).json({ error: 'deploymentId ist erforderlich' });
        return;
      }

      const tenantId = (req as any).tenantId;
      const result = await replacementService.findReplacement({
        deploymentId,
        tenantId,
        reason: reason || 'Ausfall'
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /replacement/execute
   * Führt den Ersatz durch
   */
  async execute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deploymentId, replacementEmployeeId, reason } = req.body;
      const userId = (req as any).userId;

      if (!deploymentId || !replacementEmployeeId) {
        res.status(400).json({ error: 'deploymentId und replacementEmployeeId sind erforderlich' });
        return;
      }

      const result = await replacementService.executeReplacement(
        deploymentId,
        replacementEmployeeId,
        reason || 'Ausfall',
        userId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const replacementController = new ReplacementController();
