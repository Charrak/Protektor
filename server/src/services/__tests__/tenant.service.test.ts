import { randomUUID } from 'crypto';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { tenantService } from '../tenant.service';
import { prisma } from '../../config/database';

vi.mock('../email.service', () => ({
  emailService: { sendWelcomeEmail: vi.fn().mockResolvedValue(undefined) },
}));

const testRunId = randomUUID().replace(/-/g, '').slice(0, 12);

describe('TenantService', () => {
  let testTenantIds: string[] = [];
  let testUserId: string;

  async function createTestTenant(input: Parameters<typeof tenantService.create>[0]) {
    const tenant = await tenantService.create(input, testUserId);
    testTenantIds.push(tenant.id);
    return tenant;
  }

  async function removeTestTenant(tenantId: string) {
    const roles = await prisma.role.findMany({ where: { tenantId }, select: { id: true } });
    const roleIds = roles.map(({ id }) => id);
    await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.role.deleteMany({ where: { tenantId } });
    await prisma.subscription.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  }

  beforeAll(async () => {
    // Test-Datenbank verbinden
    await prisma.$connect();
    
    // Platform Admin erstellen (braucht keinen Tenant)
    const platformAdmin = await prisma.platformAdmin.create({
      data: {
        email: `test-admin-${testRunId}@protektor.test`,
        username: `test-admin-${testRunId}`,
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'Admin',
      },
    });
    testUserId = platformAdmin.id;
  });

  afterEach(async () => {
    for (const tenantId of testTenantIds.splice(0)) {
      await removeTestTenant(tenantId);
    }
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.platformAdmin.delete({ where: { id: testUserId } });
    }
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('sollte einen neuen Tenant erstellen', async () => {
      const input = {
        companyName: 'Test Security GmbH',
        contactEmail: 'test@example.com',
        employeeLimit: 50,
      };

      const tenant = await createTestTenant(input);

      expect(tenant).toBeDefined();
      expect(tenant.companyName).toBe(input.companyName);
      expect(tenant.contactEmail).toBe(input.contactEmail);
      expect(tenant.licenseStatus).toBe('ACTIVE');
      expect(tenant.employeeLimit).toBe(50);
    });

    it('sollte einen Tenant mit Trial erstellen', async () => {
      const input = {
        companyName: 'Trial Security GmbH',
        contactEmail: 'trial@example.com',
        employeeLimit: 25,
        trialDays: 30,
      };

      const tenant = await createTestTenant(input);

      expect(tenant.licenseStatus).toBe('TEST');
    });
  });

  describe('list', () => {
    it('sollte alle Tenants auflisten', async () => {
      // Test-Tenant erstellen
      await createTestTenant({
        companyName: 'List Test GmbH',
        contactEmail: 'list@example.com',
      });

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
      await createTestTenant({
        companyName: 'Unique Search Test GmbH',
        contactEmail: 'search@example.com',
      });

      const result = await tenantService.list({ search: 'Unique Search' });

      expect(result.tenants.length).toBeGreaterThan(0);
      expect(result.tenants[0].companyName).toContain('Unique Search');
    });
  });

  describe('updateLicenseStatus', () => {
    it('sollte den Lizenzstatus aktualisieren', async () => {
      const tenant = await createTestTenant({
        companyName: 'Status Update Test GmbH',
        contactEmail: 'status@example.com',
      });

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
