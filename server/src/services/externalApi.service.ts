import { PrismaClient } from '@prisma/client';
import { auditService } from './audit.service';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

/**
 * External API Service
 * Ermöglicht Kunden den Zugriff über API (als Add-on verkaufbar)
 */
export class ExternalApiService {
  /**
   * Validiert API-Key und gibt Tenant zurück
   */
  async validateApiKey(apiKey: string) {
    const key = await prisma.apiKey.findFirst({
      where: {
        key: apiKey,
        isActive: true,
        type: 'external',
      },
    });

    if (!key) return null;

    // Last Used aktualisieren
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsed: new Date() },
    });

    return key;
  }

  /**
   * Prüft Rate Limit für API-Key
   */
  async checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const count = await prisma.auditLog.count({
      where: {
        entityType: 'API_CALL',
        entityId: apiKeyId,
        createdAt: { gte: oneDayAgo },
      },
    });

    const limit = 10000; // 10.000 Requests/Tag
    const remaining = Math.max(0, limit - count);

    return {
      allowed: count < limit,
      remaining,
    };
  }

  /**
   * GET /api/external/employees
   */
  async listEmployees(tenantId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 50 } = filters || {};

    const where: any = { tenantId };
    if (status) where.status = status;

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastName: 'asc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          personnelNumber: true,
          status: true,
          employmentType: true,
          createdAt: true,
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      data: employees,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * POST /api/external/employees
   */
  async createEmployee(tenantId: string, data: any, apiKeyId: string) {
    const employee = await prisma.employee.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        personnelNumber: data.personnelNumber,
        status: data.status || 'active',
        employmentType: data.employmentType || 'full_time',
      },
    });

    await auditService.logCreate(tenantId, apiKeyId, 'Employee', employee.id, data, 'api');
    return employee;
  }

  /**
   * GET /api/external/customers
   */
  async listCustomers(tenantId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 50 } = filters || {};

    const where: any = { tenantId };
    if (status) where.status = status;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { companyName: 'asc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * POST /api/external/customers
   */
  async createCustomer(tenantId: string, data: any, apiKeyId: string) {
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        companyName: data.companyName,
        customerNumber: data.customerNumber,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        status: data.status || 'active',
      },
    });

    await auditService.logCreate(tenantId, apiKeyId, 'Customer', customer.id, data, 'api');
    return customer;
  }

  /**
   * GET /api/external/deployments
   */
  async listDeployments(tenantId: string, filters?: { dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
    const { dateFrom, dateTo, page = 1, limit = 50 } = filters || {};

    const where: any = { tenantId };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: { select: { firstName: true, lastName: true } },
          object: { select: { name: true } },
        },
      }),
      prisma.deployment.count({ where }),
    ]);

    return {
      data: deployments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * POST /api/external/time-entries
   */
  async createTimeEntry(tenantId: string, data: any, apiKeyId: string) {
    const entry = await prisma.timeRecord.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        hours: data.hours,
        type: data.type || 'REGULAR',
        notes: data.notes,
        status: 'pending',
      },
    });

    await auditService.logCreate(tenantId, apiKeyId, 'TimeEntry', entry.id, data, 'api');
    return entry;
  }

  /**
   * GET /api/external/objects
   */
  async listObjects(tenantId: string, filters?: { customerId?: string; page?: number; limit?: number }) {
    const { customerId, page = 1, limit = 50 } = filters || {};

    const where: any = { tenantId };
    if (customerId) where.customerId = customerId;

    const [objects, total] = await Promise.all([
      prisma.sMSObject.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.sMSObject.count({ where }),
    ]);

    return {
      data: objects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Webhook registrieren
   */
  async registerWebhook(tenantId: string, data: { url: string; events: string[] }, apiKeyId: string) {
    const webhook = await prisma.webhook.create({
      data: {
        tenantId,
        url: data.url,
        events: data.events,
        isActive: true,
      },
    });

    await auditService.logCreate(tenantId, apiKeyId, 'Webhook', webhook.id, data, 'api');
    return webhook;
  }

  /**
   * Webhooks für Tenant auflisten
   */
  async listWebhooks(tenantId: string) {
    return prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const externalApiService = new ExternalApiService();
