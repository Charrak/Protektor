import { Request, Response, NextFunction } from 'express';
import { shiftSwapService } from '../services/shiftSwap.service';

export class ShiftSwapController {
  /**
   * POST /shift-swaps
   * Erstellt eine neue Schichtwechsel-Anfrage
   */
  async createShiftSwap(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const { deploymentId, reason, notes } = req.body;

      const shiftSwap = await shiftSwapService.createShiftSwap({
        deploymentId,
        requesterId: req.user.id,
        reason,
        notes,
      });

      res.status(201).json({
        success: true,
        data: shiftSwap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /shift-swaps
   * Holt alle Schichtwechsel-Anfragen
   */
  async getShiftSwaps(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const { status, employeeId, limit } = req.query;

      const shiftSwaps = await shiftSwapService.getShiftSwaps({
        tenantId: req.user.tenantId,
        status: status as any,
        employeeId: employeeId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: shiftSwaps,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /shift-swaps/:id
   * Holt eine einzelne Schichtwechsel-Anfrage
   */
  async getShiftSwapById(req: Request, res: Response, next: NextFunction) {
    try {
      const shiftSwap = await shiftSwapService.getShiftSwapById(req.params.id);

      res.json({
        success: true,
        data: shiftSwap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /shift-swaps/:id/approve
   * Genehmigt eine Schichtwechsel-Anfrage
   */
  async approveShiftSwap(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const { replacementEmployeeId } = req.body;

      const shiftSwap = await shiftSwapService.approveShiftSwap({
        shiftSwapId: req.params.id,
        approverId: req.user.id,
        replacementEmployeeId,
      });

      res.json({
        success: true,
        data: shiftSwap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /shift-swaps/:id/decline
   * Lehnt eine Schichtwechsel-Anfrage ab
   */
  async declineShiftSwap(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const { reason } = req.body;

      const shiftSwap = await shiftSwapService.declineShiftSwap({
        shiftSwapId: req.params.id,
        approverId: req.user.id,
        reason,
      });

      res.json({
        success: true,
        data: shiftSwap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /shift-swaps/:id/cancel
   * Storniert eine Schichtwechsel-Anfrage
   */
  async cancelShiftSwap(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const shiftSwap = await shiftSwapService.cancelShiftSwap({
        shiftSwapId: req.params.id,
        requesterId: req.user.id,
      });

      res.json({
        success: true,
        data: shiftSwap,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /shift-swaps/:deploymentId/candidates
   * Findet potenzielle Ersatz-Mitarbeiter
   */
  async findCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
      }

      const candidates = await shiftSwapService.findReplacementCandidates({
        deploymentId: req.params.deploymentId,
        tenantId: req.user.tenantId,
      });

      res.json({
        success: true,
        data: candidates,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const shiftSwapController = new ShiftSwapController();
