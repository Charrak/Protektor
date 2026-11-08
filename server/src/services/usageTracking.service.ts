import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface TrackUsageInput {
  tenantId: string;
  resource: string; // z.B. 'employees', 'customers', 'deployments', 'api-calls'
  action: string; // z.B. 'create', 'read', 'update', 'delete'
  count?: number; // Anzahl der Operationen
  metadata?: Record<string, any>;
}

export class UsageTrackingService {
  /**
   * Trackt die Nutzung einer Ressource
   */
  async trackUsage(input: TrackUsageInput) {
    const { tenantId, resource, action, count = 1, metadata } = input;

    try {
      // Usage Event speichern
      await prisma.usageEvent.create({
        data: {
          tenantId,
          resource,
          action,
          count,
          metadata: metadata || {},
          trackedAt: new Date(),
        },
      });

      // Aggregierte Statistiken aktualisieren
      await this.updateUsageStats(tenantId, resource, action, count);

      logger.debug(`Usage getrackt: ${tenantId} - ${action} ${resource} (${count})`);
    } catch (error) {
      logger.error('Usage-Tracking-Fehler:', error);
      // Tracking-Fehler sollten den Request nicht blockieren
    }
  }

  /**
   * Aktualisiert aggregierte Nutzungsstatistiken
   */
  private async updateUsageStats(
    tenantId: string,
    resource: string,
    action: string,
    count: number
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const month = new Date(today.getFullYear(), today.getMonth(), 1);

    // Tägliche Stats
    await prisma.usageStat.upsert({
      where: {
        tenantId_resource_action_period: {
          tenantId,
          resource,
          action,
          period: today,
        },
      },
      create: {
        tenantId,
        resource,
        action,
        count,
        period: today,
        periodType: 'DAILY',
      },
      update: {
        count: { increment: count },
      },
    });

    // Monatliche Stats
    await prisma.usageStat.upsert({
      where: {
        tenantId_resource_action_period: {
          tenantId,
          resource,
          action,
          period: month,
        },
      },
      create: {
        tenantId,
        resource,
        action,
        count,
        period: month,
        periodType: 'MONTHLY',
      },
      update: {
        count: { increment: count },
      },
    });
  }

  /**
   * Ruft Nutzungsstatistiken für einen Tenant ab
   */
  async getUsageStats(
    tenantId: string,
    options: {
      resource?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      periodType?: 'DAILY' | 'MONTHLY';
    } = {}
  ) {
    const { resource, action, startDate, endDate, periodType = 'DAILY' } = options;

    const where: any = { tenantId, periodType };

    if (resource) where.resource = resource;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.period = {};
      if (startDate) where.period.gte = startDate;
      if (endDate) where.period.lte = endDate;
    }

    const stats = await prisma.usageStat.findMany({
      where,
      orderBy: { period: 'desc' },
    });

    return stats;
  }

  /**
   * Ruft aktuelle Ressourcennutzung ab (für Limit-Checks)
   */
  async getCurrentUsage(tenantId: string, resource: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant nicht gefunden');
    }

    // Aktuelle Anzahl basierend auf Ressource berechnen
    let currentCount = 0;

    switch (resource) {
      case 'employees':
        currentCount = await prisma.employee.count({
          where: { tenantId, deletedAt: null },
        });
        break;
      case 'customers':
        currentCount = await prisma.customer.count({
          where: { tenantId, deletedAt: null },
        });
        break;
      case 'objects':
        currentCount = await prisma.sMSObject.count({
          where: { tenantId },
        });
        break;
      case 'users':
        currentCount = await prisma.user.count({
          where: { tenantId, deletedAt: null },
        });
        break;
      default:
        throw new Error(`Unbekannte Ressource: ${resource}`);
    }

    return {
      resource,
      currentCount,
      limit: this.getResourceLimit(tenant, resource),
      percentage: this.getResourceLimit(tenant, resource)
        ? (currentCount / this.getResourceLimit(tenant, resource)!) * 100
        : null,
    };
  }

  /**
   * Ermittelt das Limit für eine Ressource basierend auf Tenant-Config
   */
  private getResourceLimit(tenant: any, resource: string): number | null {
    // Limits aus Tenant oder Subscription abrufen
    if (resource === 'employees') {
      return tenant.employeeLimit || null;
    }

    // Andere Ressourcen haben möglicherweise keine Limits
    return null;
  }

  /**
   * Prüft ob eine Ressource das Limit erreicht hat
   */
  async checkResourceLimit(tenantId: string, resource: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number | null;
    message?: string;
  }> {
    const usage = await this.getCurrentUsage(tenantId, resource);

    if (usage.limit === null) {
      return {
        allowed: true,
        current: usage.currentCount,
        limit: null,
      };
    }

    const allowed = usage.currentCount < usage.limit;

    return {
      allowed,
      current: usage.currentCount,
      limit: usage.limit,
      message: allowed
        ? undefined
        : `Limit für ${resource} erreicht (${usage.currentCount}/${usage.limit})`,
    };
  }

  /**
   * Generiert einen Nutzungsbericht für einen Zeitraum
   */
  async generateUsageReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ) {
    const stats = await this.getUsageStats(tenantId, {
      startDate,
      endDate,
      periodType: 'DAILY',
    });

    // Nach Ressource gruppieren
    const byResource: Record<string, Record<string, number>> = {};

    for (const stat of stats) {
      if (!byResource[stat.resource]) {
        byResource[stat.resource] = {};
      }
      if (!byResource[stat.resource][stat.action]) {
        byResource[stat.resource][stat.action] = 0;
      }
      byResource[stat.resource][stat.action] += stat.count;
    }

    return {
      tenantId,
      startDate,
      endDate,
      summary: byResource,
      totalEvents: stats.reduce((sum: number, stat: any) => sum + (stat.count || 0), 0),
    };
  }

  /**
   * Bereinigt alte Usage-Events (älter als X Tage)
   */
  async cleanupOldEvents(retentionDays: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.usageEvent.deleteMany({
      where: {
        trackedAt: { lt: cutoffDate },
      },
    });

    logger.info(`${result.count} alte Usage-Events bereinigt (älter als ${retentionDays} Tage)`);

    return result.count;
  }
}

export const usageTrackingService = new UsageTrackingService();
