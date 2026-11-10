import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

/**
 * Audit Rollback Service
 * Ermöglicht Entwicklern, Änderungen rückgängig zu machen
 */
export class AuditRollbackService {
  /**
   * Audit-Logs für Tenant abrufen (für Entwickler)
   */
  async getTenantLogs(tenantId: string, filters?: {
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const { action, entityType, startDate, endDate, userId, page = 1, limit = 50 } = filters || {};

    const where: any = { tenantId };

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: { companyName: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Alle Logs über alle Tenants (für Platform-Admin)
   */
  async getAllLogs(filters?: {
    tenantId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { tenantId, action, entityType, startDate, endDate, page = 1, limit = 50 } = filters || {};

    const where: any = {};

    if (tenantId) where.tenantId = tenantId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: { companyName: true, tenantId: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Details eines Audit-Logs abrufen
   */
  async getLogDetails(logId: string) {
    const log = await prisma.auditLog.findUnique({
      where: { id: logId },
      include: {
        tenant: {
          select: { companyName: true, tenantId: true },
        },
      },
    });

    if (!log) {
      throw new Error('Audit-Log nicht gefunden');
    }

    return log;
  }

  /**
   * Änderung rückgängig machen (Rollback)
   */
  async rollback(logId: string, adminId: string) {
    const log = await prisma.auditLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new Error('Audit-Log nicht gefunden');
    }

    if (!log.oldValue) {
      throw new Error('Keine alten Daten für Rollback verfügbar');
    }

    if (log.action === 'CREATE') {
      // Erstellen rückgängig = Löschen
      await this.rollbackCreate(log);
    } else if (log.action === 'UPDATE') {
      // Update rückgängig = Alten Wert wiederherstellen
      await this.rollbackUpdate(log);
    } else if (log.action === 'DELETE') {
      // Löschen rückgängig = Wiederherstellen
      await this.rollbackDelete(log);
    }

    // Rollback im Audit-Log dokumentieren
    await prisma.auditLog.create({
      data: {
        tenantId: log.tenantId,
        userId: adminId,
        action: 'ROLLBACK',
        entityType: log.entityType,
        entityId: log.entityId,
        changes: {
          rolledBackLogId: logId,
          originalAction: log.action,
          originalDate: log.createdAt,
        },
        ipAddress: 'system',
      },
    });

    logger.info(`Rollback durchgeführt: Log ${logId} von Admin ${adminId}`);

    return {
      success: true,
      message: `Änderung erfolgreich rückgängig gemacht`,
      rolledBackLogId: logId,
    };
  }

  /**
   * CREATE rückgängig machen (Entity löschen)
   */
  private async rollbackCreate(log: any) {
    const entityType = log.entityType;
    const entityId = log.entityId;

    switch (entityType) {
      case 'Employee':
        await prisma.employee.delete({ where: { id: entityId } });
        break;
      case 'Customer':
        await prisma.customer.delete({ where: { id: entityId } });
        break;
      case 'Object':
        await prisma.sMSObject.delete({ where: { id: entityId } });
        break;
      case 'Deployment':
        await prisma.deployment.delete({ where: { id: entityId } });
        break;
      case 'TimeEntry':
        await prisma.timeRecord.delete({ where: { id: entityId } });
        break;
      default:
        throw new Error(`Rollback für ${entityType} nicht implementiert`);
    }
  }

  /**
   * UPDATE rückgängig machen (Alten Wert wiederherstellen)
   */
  private async rollbackUpdate(log: any) {
    const entityType = log.entityType;
    const entityId = log.entityId;
    const oldValue = log.oldValue;

    switch (entityType) {
      case 'Employee':
        await prisma.employee.update({
          where: { id: entityId },
          data: oldValue,
        });
        break;
      case 'Customer':
        await prisma.customer.update({
          where: { id: entityId },
          data: oldValue,
        });
        break;
      case 'Object':
        await prisma.sMSObject.update({
          where: { id: entityId },
          data: oldValue,
        });
        break;
      case 'Deployment':
        await prisma.deployment.update({
          where: { id: entityId },
          data: oldValue,
        });
        break;
      case 'TimeEntry':
        await prisma.timeRecord.update({
          where: { id: entityId },
          data: oldValue,
        });
        break;
      default:
        throw new Error(`Rollback für ${entityType} nicht implementiert`);
    }
  }

  /**
   * DELETE rückgängig machen (Entity wiederherstellen)
   */
  private async rollbackDelete(log: any) {
    const entityType = log.entityType;
    const oldValue = log.oldValue;

    if (!oldValue) {
      throw new Error('Keine alten Daten für Wiederherstellung verfügbar');
    }

    switch (entityType) {
      case 'Employee':
        await prisma.employee.create({ data: oldValue });
        break;
      case 'Customer':
        await prisma.customer.create({ data: oldValue });
        break;
      case 'Object':
        await prisma.sMSObject.create({ data: oldValue });
        break;
      case 'Deployment':
        await prisma.deployment.create({ data: oldValue });
        break;
      case 'TimeEntry':
        await prisma.timeRecord.create({ data: oldValue });
        break;
      default:
        throw new Error(`Rollback für ${entityType} nicht implementiert`);
    }
  }

  /**
   * Statistiken für Developer Dashboard
   */
  async getLogStats(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalLogs, last24hLogs, last7dLogs, byAction] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({
        where: { ...where, createdAt: { gte: last24h } },
      }),
      prisma.auditLog.count({
        where: { ...where, createdAt: { gte: last7d } },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
      }),
    ]);

    return {
      total: totalLogs,
      last24h: last24hLogs,
      last7d: last7dLogs,
      byAction: byAction.map((g: any) => ({
        action: g.action,
        count: g._count.action,
      })),
    };
  }
}

export const auditRollbackService = new AuditRollbackService();
