import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { usageTrackingService } from '../usageTracking.service';
import { prisma } from '../../config/database';

describe('UsageTrackingService', () => {
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Platform Admin erstellen (braucht keinen Tenant)
    const platformAdmin = await prisma.platformAdmin.create({
      data: {
        email: 'usage-test-admin@protektor.test',
        username: 'usage-test-admin',
        passwordHash: 'hashed-password',
        firstName: 'Usage',
        lastName: 'Admin',
      },
    });
    testUserId = platformAdmin.id;

    // Test-Tenant erstellen
    const tenant = await prisma.tenant.create({
      data: {
        tenantId: 'TEST-USAGE-001',
        companyName: 'Usage Test GmbH',
        contactEmail: 'usage@example.com',
        createdById: platformAdmin.id,
      },
    });

    testTenantId = tenant.id;
  });

  afterAll(async () => {
    if (testTenantId) {
      // Aufräumen
      await prisma.usageEvent.deleteMany({ where: { tenantId: testTenantId } }).catch(() => {});
      await prisma.usageStat.deleteMany({ where: { tenantId: testTenantId } }).catch(() => {});
      await prisma.tenant.delete({ where: { id: testTenantId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.platformAdmin.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('trackUsage', () => {
    it('sollte Usage Event tracken', async () => {
      await usageTrackingService.trackUsage({
        tenantId: testTenantId,
        resource: 'employees',
        action: 'create',
        count: 1,
      });

      const events = await prisma.usageEvent.findMany({
        where: { tenantId: testTenantId },
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].resource).toBe('employees');
      expect(events[0].action).toBe('create');
    });

    it('sollte aggregierte Statistiken erstellen', async () => {
      await usageTrackingService.trackUsage({
        tenantId: testTenantId,
        resource: 'customers',
        action: 'create',
        count: 5,
      });

      const stats = await prisma.usageStat.findMany({
        where: { tenantId: testTenantId, resource: 'customers' },
      });

      expect(stats.length).toBeGreaterThan(0);
    });
  });

  describe('getCurrentUsage', () => {
    it('sollte aktuelle Mitarbeiteranzahl zurückgeben', async () => {
      // Mitarbeiter erstellen
      await prisma.employee.create({
        data: {
          tenantId: testTenantId,
          firstName: 'Max',
          lastName: 'Mustermann',
          personnelNumber: 'MA001',
          status: 'active',
        },
      });

      const usage = await usageTrackingService.getCurrentUsage(testTenantId, 'employees');

      expect(usage).toBeDefined();
      expect(usage.resource).toBe('employees');
      expect(usage.currentCount).toBeGreaterThanOrEqual(1);
      expect(usage.limit).toBe(10);
    });
  });

  describe('checkResourceLimit', () => {
    it('sollte Limit-Check für employees durchführen', async () => {
      const result = await usageTrackingService.checkResourceLimit(testTenantId, 'employees');

      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
      expect(result.current).toBeDefined();
      expect(result.limit).toBe(10);
    });

    it('sollte Limit überschreiten wenn zu viele Mitarbeiter', async () => {
      // 10 Mitarbeiter erstellen (Limit = 10)
      for (let i = 0; i < 10; i++) {
        await prisma.employee.create({
          data: {
            tenantId: testTenantId,
            firstName: `Employee ${i}`,
            lastName: 'Test',
            personnelNumber: `MA${i.toString().padStart(3, '0')}`,
            status: 'active',
          },
        }).catch(() => {}); // Duplikate ignorieren
      }

      const result = await usageTrackingService.checkResourceLimit(testTenantId, 'employees');

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Limit erreicht');
    });
  });

  describe('generateUsageReport', () => {
    it('sollte Nutzungsbericht generieren', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const endDate = new Date();

      const report = await usageTrackingService.generateUsageReport(
        testTenantId,
        startDate,
        endDate
      );

      expect(report).toBeDefined();
      expect(report.tenantId).toBe(testTenantId);
      expect(report.startDate).toBeDefined();
      expect(report.endDate).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.totalEvents).toBeDefined();
    });
  });
});
