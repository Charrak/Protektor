import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Cache Service für Performance-Optimierung
 */
export class CacheService {
  private cache = new Map<string, { data: any; expiry: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 Minuten

  /**
   * Daten aus Cache abrufen
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Daten im Cache speichern
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs || this.defaultTTL);
    this.cache.set(key, { data, expiry });
  }

  /**
   * Cache-Eintrag löschen
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Alle Cache-Einträge löschen
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Cache-Statistiken
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Tenant-Daten cachen
   */
  async getCachedTenant(tenantId: string): Promise<any> {
    const cacheKey = `tenant:${tenantId}`;
    let tenant = this.get<any>(cacheKey);

    if (!tenant) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          subscription: true,
          plan: true,
        },
      });

      if (tenant) {
        this.set(cacheKey, tenant, 10 * 60 * 1000); // 10 Minuten
      }
    }

    return tenant;
  }

  /**
   * Dashboard-Statistiken cachen
   */
  async getCachedDashboardStats(): Promise<any> {
    const cacheKey = 'dashboard:stats';
    let stats = this.get<any>(cacheKey);

    if (!stats) {
      const [
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        activeSubscriptions,
        trialSubscriptions,
        cancelledSubscriptions,
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { licenseStatus: 'ACTIVE' } }),
        prisma.tenant.count({ where: { licenseStatus: 'TEST' } }),
        prisma.tenant.count({ where: { licenseStatus: 'SUSPENDED' } }),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.subscription.count({ where: { status: 'TRIAL' } }),
        prisma.subscription.count({ where: { status: 'CANCELED' } }),
      ]);

      stats = {
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        activeSubscriptions,
        trialSubscriptions,
        cancelledSubscriptions,
      };

      this.set(cacheKey, stats, 5 * 60 * 1000); // 5 Minuten
    }

    return stats;
  }

  /**
   * Plan-Liste cachen
   */
  async getCachedPlans(): Promise<any[]> {
    const cacheKey = 'plans:list';
    const cached = this.get<any[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    this.set(cacheKey, plans, 30 * 60 * 1000); // 30 Minuten
    return plans;
  }

  /**
   * Employee-Liste für Tenant cachen
   */
  async getCachedEmployees(tenantId: string): Promise<any[]> {
    const cacheKey = `employees:${tenantId}`;
    const cached = this.get<any[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const employees = await prisma.employee.findMany({
      where: { tenantId },
      orderBy: { lastName: 'asc' },
    });

    this.set(cacheKey, employees, 5 * 60 * 1000); // 5 Minuten
    return employees;
  }

  /**
   * Cache für Tenant invalidieren
   */
  invalidateTenant(tenantId: string): void {
    this.delete(`tenant:${tenantId}`);
    this.delete(`employees:${tenantId}`);
    this.delete(`customers:${tenantId}`);
    this.delete(`objects:${tenantId}`);
    logger.info(`Cache invalidated for tenant: ${tenantId}`);
  }

  /**
   * Cache für Dashboard invalidieren
   */
  invalidateDashboard(): void {
    this.delete('dashboard:stats');
    logger.info('Dashboard cache invalidated');
  }
}

export const cacheService = new CacheService();
