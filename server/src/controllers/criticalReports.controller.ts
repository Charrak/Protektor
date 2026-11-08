import { Request, Response } from 'express';
import { criticalReportsService } from '../services/criticalReports.service';
import { logger } from '../config/logger';

/**
 * Critical Reports Controller
 * Kritische Berichte und Lösungsvorschläge
 */
export class CriticalReportsController {
  /**
   * GET /api/platform/dashboard/critical-reports
   */
  async getCriticalReports(req: Request, res: Response) {
    try {
      const reports = await criticalReportsService.generateAllReports();
      res.json({ success: true, data: reports });
    } catch (error) {
      logger.error('Get Critical Reports Error:', error);
      res.status(500).json({ error: 'Berichte konnten nicht geladen werden' });
    }
  }

  /**
   * GET /api/platform/dashboard/revenue-stats
   */
  async getRevenueStats(req: Request, res: Response) {
    try {
      const stats = await criticalReportsService.getRevenueStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Get Revenue Stats Error:', error);
      res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
    }
  }
}

export const criticalReportsController = new CriticalReportsController();
