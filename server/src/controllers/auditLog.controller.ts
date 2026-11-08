import { Request, Response } from 'express';
import { auditRollbackService } from '../services/auditRollback.service';
import { logger } from '../config/logger';

/**
 * Audit Log Controller (für Entwickler/Platform-Admins)
 */
export class AuditLogController {
  /**
   * GET /api/platform/audit-logs
   * Alle Logs (Platform-Admin)
   */
  async getAllLogs(req: Request, res: Response) {
    try {
      const { tenantId, action, entityType, startDate, endDate, page, limit } = req.query;

      const filters: any = {};
      if (tenantId) filters.tenantId = tenantId as string;
      if (action) filters.action = action as string;
      if (entityType) filters.entityType = entityType as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await auditRollbackService.getAllLogs(filters);
      res.json(result);
    } catch (error) {
      logger.error('Get All Logs Error:', error);
      res.status(500).json({ error: 'Logs konnten nicht geladen werden' });
    }
  }

  /**
   * GET /api/platform/audit-logs/tenant/:tenantId
   * Logs für spezifischen Tenant
   */
  async getTenantLogs(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId as string;
      const { action, entityType, startDate, endDate, userId, page, limit } = req.query;

      const filters: any = {};
      if (action) filters.action = action as string;
      if (entityType) filters.entityType = entityType as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (userId) filters.userId = userId as string;
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await auditRollbackService.getTenantLogs(tenantId, filters);
      res.json(result);
    } catch (error) {
      logger.error('Get Tenant Logs Error:', error);
      res.status(500).json({ error: 'Logs konnten nicht geladen werden' });
    }
  }

  /**
   * GET /api/platform/audit-logs/:logId
   * Details eines Logs
   */
  async getLogDetails(req: Request, res: Response) {
    try {
      const logId = req.params.logId as string;
      const log = await auditRollbackService.getLogDetails(logId);
      res.json({ data: log });
    } catch (error) {
      logger.error('Get Log Details Error:', error);
      res.status(500).json({ error: 'Log-Details konnten nicht geladen werden' });
    }
  }

  /**
   * POST /api/platform/audit-logs/:logId/rollback
   * Änderung rückgängig machen
   */
  async rollback(req: Request, res: Response) {
    try {
      const logId = req.params.logId as string;
      const adminId = (req as any).adminId || 'system';

      const result = await auditRollbackService.rollback(logId, adminId);

      res.json(result);
    } catch (error) {
      logger.error('Rollback Error:', error);
      res.status(500).json({
        error: 'Rollback fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    }
  }

  /**
   * GET /api/platform/audit-logs/stats
   * Statistiken
   */
  async getStats(req: Request, res: Response) {
    try {
      const { tenantId } = req.query;
      const stats = await auditRollbackService.getLogStats(tenantId as string);
      res.json({ data: stats });
    } catch (error) {
      logger.error('Get Stats Error:', error);
      res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
    }
  }
}

export const auditLogController = new AuditLogController();
