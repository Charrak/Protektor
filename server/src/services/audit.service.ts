import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Audit Service
 * Protokolliert alle sicherheitsrelevanten Aktionen
 */

export interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export class AuditService {
  /**
   * Erstellt einen Audit-Log-Eintrag
   */
  async log(entry: AuditLogEntry) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          changes: entry.changes,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata,
        },
      });
    } catch (error) {
      logger.error('Audit-Log Fehler:', error);
      // Audit-Log-Fehler sollten den Hauptprozess nicht stoppen
    }
  }

  /**
   * Login-Audit
   */
  async logLogin(userId: string, success: boolean, ipAddress?: string, userAgent?: string) {
    await this.log({
      userId,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Logout-Audit
   */
  async logLogout(userId: string, ipAddress?: string) {
    await this.log({
      userId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
      ipAddress,
    });
  }

  /**
   * Create-Audit
   */
  async logCreate(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    changes: any,
    ipAddress?: string
  ) {
    await this.log({
      tenantId,
      userId,
      action: 'CREATE',
      entityType,
      entityId,
      changes,
      ipAddress,
    });
  }

  /**
   * Update-Audit
   */
  async logUpdate(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    changes: any,
    ipAddress?: string
  ) {
    await this.log({
      tenantId,
      userId,
      action: 'UPDATE',
      entityType,
      entityId,
      changes,
      ipAddress,
    });
  }

  /**
   * Delete-Audit
   */
  async logDelete(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    ipAddress?: string
  ) {
    await this.log({
      tenantId,
      userId,
      action: 'DELETE',
      entityType,
      entityId,
      ipAddress,
    });
  }

  /**
   * Permission-Denied-Audit
   */
  async logPermissionDenied(
    tenantId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId?: string,
    ipAddress?: string
  ) {
    await this.log({
      tenantId,
      userId,
      action: 'PERMISSION_DENIED',
      entityType,
      entityId,
      metadata: { attemptedAction: action },
      ipAddress,
    });
  }

  /**
   * License-Status-Change-Audit
   */
  async logLicenseChange(
    tenantId: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    ipAddress?: string
  ) {
    await this.log({
      tenantId,
      userId: changedBy,
      action: 'LICENSE_STATUS_CHANGED',
      entityType: 'Tenant',
      entityId: tenantId,
      changes: { oldStatus, newStatus },
      ipAddress,
    });
  }

  /**
   * Security-Incident-Audit
   */
  async logSecurityIncident(
    tenantId: string,
    incidentType: string,
    description: string,
    ipAddress?: string,
    metadata?: any
  ) {
    await this.log({
      tenantId,
      action: 'SECURITY_INCIDENT',
      entityType: 'Security',
      changes: { incidentType, description },
      ipAddress,
      metadata,
    });
    
    logger.warn(`[SECURITY INCIDENT] ${incidentType}: ${description}`);
  }

  /**
   * Audit-Logs für Tenant abrufen
   */
  async getTenantAuditLogs(
    tenantId: string,
    filters?: {
      action?: string;
      entityType?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    }
  ) {
    const {
      action,
      entityType,
      startDate,
      endDate,
      page = 1,
      pageSize = 50,
    } = filters || {};

    const where: any = { tenantId };

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Audit-Logs für Platform Admin
   */
  async getPlatformAuditLogs(filters?: {
    tenantId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const {
      tenantId,
      action,
      startDate,
      endDate,
      page = 1,
      pageSize = 50,
    } = filters || {};

    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tenant: {
            select: {
              companyName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Cleanup alte Audit-Logs (älter als X Tage)
   */
  async cleanupOldLogs(daysToKeep: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Audit-Log Cleanup: ${result.count} Einträge gelöscht (älter als ${daysToKeep} Tage)`);

    return result;
  }
}

export const auditService = new AuditService();
