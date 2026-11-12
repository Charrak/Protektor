import { Request, Response } from 'express';
import { conflictService } from '../services/conflict.service';
import { asyncHandler } from '../middleware/errorHandler';

export class ConflictController {
  /**
   * GET /api/conflicts
   * Prüft alle Konflikte in einem Zeitraum
   */
  getConflicts = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate und endDate sind erforderlich',
      });
    }

    const tenantId = req.user!.tenantId;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const conflicts = await conflictService.checkConflicts(start, end, tenantId);

    res.json({
      success: true,
      data: conflicts,
      count: conflicts.length,
    });
  });

  /**
   * GET /api/conflicts/stats
   * Gibt Statistiken über Konflikte zurück
   */
  getConflictStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate und endDate sind erforderlich',
      });
    }

    const tenantId = req.user!.tenantId;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const conflicts = await conflictService.checkConflicts(start, end, tenantId);

    // Gruppiere nach Typ
    const byType = conflicts.reduce((acc, conflict) => {
      acc[conflict.type] = (acc[conflict.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Gruppiere nach Severity
    const bySeverity = conflicts.reduce((acc, conflict) => {
      acc[conflict.severity] = (acc[conflict.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        total: conflicts.length,
        byType,
        bySeverity,
        errors: bySeverity.error || 0,
        warnings: bySeverity.warning || 0,
      },
    });
  });
}

export const conflictController = new ConflictController();
