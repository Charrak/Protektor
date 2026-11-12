import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { tenantService } from '../tenant.service';
import { prisma } from '../../config/database';

describe('TenantService', () => {
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Test-Datenbank verbinden
    await prisma.$connect();
    
    // Test-User erstellen (wird für createdById benötigt)
    const user = await prisma.user.create({
      data: {
        email: 'test-admin@protektor.test',
        firstName: 'Test',
        lastName: 'Admin',
        password: 'hashed-password',
        role: 'PLATFORM_ADMIN',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Aufräumen
    if (testTenantId) {
      await prisma.tenant.delete({ where: { id: testTenantId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Test-Tenant vor jedem Test löschen
    if (testTenantId) {
      await prisma.tenant.delete({ where: { id: testTenantId } }).catch(() => {});
    }
  });

  describe('create', () => {
    it('sollte einen neuen Tenant erstellen', async () => {
      const input = {
        companyName: 'Test Security GmbH',
        contactEmail: 'test@example.com',
        employeeLimit: 50,
      };

      const tenant = await tenantService.create(input, testUserId);

      expect(tenant).toBeDefined();
      expect(tenant.companyName).toBe(input.companyName);
      expect(tenant.contactEmail).toBe(input.contactEmail);
      expect(tenant.licenseStatus).toBe('TEST');
      expect(tenant.employeeLimit).toBe(50);

      testTenantId = tenant.id;
    });

    it('sollte einen Tenant mit Trial erstellen', async () => {
      const input = {
        companyName: 'Trial Security GmbH',
        contactEmail: 'trial@example.com',
        employeeLimit: 25,
        trialDays: 30,
      };

      const tenant = await tenantService.create(input, testUserId);

      expect(tenant.licenseStatus).toBe('TEST');

      testTenantId = tenant.id;
    });
  });

  describe('list', () => {
    it('sollte alle Tenants auflisten', async () => {
      // Test-Tenant erstellen
      const tenant = await tenantService.create(
        {
          companyName: 'List Test GmbH',
          contactEmail: 'list@example.com',
        },
        testUserId
      );

      testTenantId = tenant.id;

      const result = await tenantService.list({});

      expect(result.tenants).toBeDefined();
      expect(result.tenants.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('sollte nach Status filtern', async () => {
      const result = await tenantService.list({ status: 'ACTIVE' });

      expect(result.tenants).toBeDefined();
      result.tenants.forEach((tenant) => {
        expect(tenant.licenseStatus).toBe('ACTIVE');
      });
    });

    it('sollte nach Suchbegriff filtern', async () => {
      const tenant = await tenantService.create(
        {
          companyName: 'Unique Search Test GmbH',
          contactEmail: 'search@example.com',
        },
        testUserId
      );

      testTenantId = tenant.id;

      const result = await tenantService.list({ search: 'Unique Search' });

      expect(result.tenants.length).toBeGreaterThan(0);
      expect(result.tenants[0].companyName).toContain('Unique Search');
    });
  });

  describe('updateLicenseStatus', () => {
    it('sollte den Lizenzstatus aktualisieren', async () => {
      const tenant = await tenantService.create(
        {
          companyName: 'Status Update Test GmbH',
          contactEmail: 'status@example.com',
        },
        testUserId
      );

      testTenantId = tenant.id;

      const updated = await tenantService.updateLicenseStatus(
        tenant.id,
        'ACTIVE',
        testUserId
      );

      expect(updated.licenseStatus).toBe('ACTIVE');
    });
  });

  describe('getDashboard', () => {
    it('sollte Dashboard-Statistiken zurückgeben', async () => {
      const stats = await tenantService.getDashboard();

      expect(stats).toBeDefined();
      expect(stats.totalTenants).toBeDefined();
      expect(stats.activeTenants).toBeDefined();
      expect(stats.trialTenants).toBeDefined();
      expect(stats.suspendedTenants).toBeDefined();
      expect(stats.activeSubscriptions).toBeDefined();
      expect(stats.monthlyRecurringRevenue).toBeDefined();
    });
  });
});
