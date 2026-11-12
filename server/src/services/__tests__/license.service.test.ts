import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { licenseService } from '../license.service';
import { prisma } from '../../config/database';

describe('LicenseService', () => {
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Test-User erstellen (wird für createdById benötigt)
    const user = await prisma.user.create({
      data: {
        email: 'license-test-admin@protektor.test',
        firstName: 'License',
        lastName: 'Admin',
        password: 'hashed-password',
        role: 'PLATFORM_ADMIN',
      },
    });
    testUserId = user.id;

    // Test-Tenant erstellen
    const tenant = await prisma.tenant.create({
      data: {
        tenantId: 'TEST-LICENSE-001',
        companyName: 'License Test GmbH',
        contactEmail: 'license@example.com',
        licenseStatus: 'ACTIVE',
        employeeLimit: 50,
        paymentGraceDays: 7,
        offlineGraceMinutes: 1440,
        createdById: testUserId,
      },
    });

    testTenantId = tenant.id;
  });

  afterAll(async () => {
    if (testTenantId) {
      await prisma.tenant.delete({ where: { id: testTenantId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('checkLicense', () => {
    it('sollte gültige Lizenz für ACTIVE Tenant zurückgeben', async () => {
      const result = await licenseService.checkLicense(testTenantId);

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.status).toBe('ACTIVE');
    });

    it('sollte ungültige Lizenz für nicht existierenden Tenant zurückgeben', async () => {
      const result = await licenseService.checkLicense('non-existent-id');

      expect(result.valid).toBe(false);
      expect(result.status).toBe('NOT_FOUND');
    });

    it('sollte Einschränkungen für RESTRICTED Tenant zurückgeben', async () => {
      // Tenant auf RESTRICTED setzen
      await prisma.tenant.update({
        where: { id: testTenantId },
        data: { licenseStatus: 'RESTRICTED' },
      });

      const result = await licenseService.checkLicense(testTenantId);

      expect(result.valid).toBe(true);
      expect(result.status).toBe('RESTRICTED');
      expect(result.restrictions).toBeDefined();
      expect(result.restrictions!.length).toBeGreaterThan(0);

      // Zurücksetzen
      await prisma.tenant.update({
        where: { id: testTenantId },
        data: { licenseStatus: 'ACTIVE' },
      });
    });

    it('sollte ungültige Lizenz für SUSPENDED Tenant zurückgeben', async () => {
      await prisma.tenant.update({
        where: { id: testTenantId },
        data: { licenseStatus: 'SUSPENDED' },
      });

      const result = await licenseService.checkLicense(testTenantId);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('SUSPENDED');

      // Zurücksetzen
      await prisma.tenant.update({
        where: { id: testTenantId },
        data: { licenseStatus: 'ACTIVE' },
      });
    });
  });

  describe('reactivateLicense', () => {
    it('sollte Lizenz reaktivieren', async () => {
      // Tenant auf SUSPENDED setzen
      await prisma.tenant.update({
        where: { id: testTenantId },
        data: { licenseStatus: 'SUSPENDED' },
      });

      await licenseService.reactivateLicense(testTenantId);

      const tenant = await prisma.tenant.findUnique({
        where: { id: testTenantId },
      });

      expect(tenant?.licenseStatus).toBe('ACTIVE');
    });
  });
});
