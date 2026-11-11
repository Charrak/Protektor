import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from './email.service';
import { ensureDefaultRoles } from './defaultRoles.service';
import crypto from 'crypto';

export interface CreateTenantInput {
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: any;
  taxNumber?: string;
  vatId?: string;
  employeeLimit?: number;
  planId?: string;
  trialDays?: number;
}

export interface UpdateTenantInput {
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: any;
  taxNumber?: string;
  vatId?: string;
  isActive?: boolean;
  employeeLimit?: number;
  featureFlags?: any;
  paymentGraceDays?: number;
  offlineGraceMinutes?: number;
  notes?: string;
}

export class TenantService {
  async list(query: { search?: string; status?: string; page?: number; limit?: number }) {
    const { search, status, page = 1, limit = 25 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { tenantId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.licenseStatus = status;

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'TRIAL'] } },
            include: { plan: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { users: true, employees: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    return {
      tenants: tenants.map((t: any) => ({
        id: t.id,
        tenantId: t.tenantId,
        companyName: t.companyName,
        contactEmail: t.contactEmail,
        licenseStatus: t.licenseStatus,
        isActive: t.isActive,
        employeeCount: t._count.employees,
        userCount: t._count.users,
        employeeLimit: t.employeeLimit,
        currentSubscription: t.subscriptions[0]
          ? {
              planName: t.subscriptions[0].plan.name,
              status: t.subscriptions[0].status,
              billingInterval: t.subscriptions[0].billingInterval,
              currentPeriodEnd: t.subscriptions[0].currentPeriodEnd,
            }
          : null,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tenant) throw new NotFoundError('Mandant');
    return tenant;
  }

  async getByTenantId(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) throw new NotFoundError('Mandant');
    return tenant;
  }

  async create(input: CreateTenantInput, platformAdminId: string) {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Mandant erstellen
      const tenantId = `TNT-${uuidv4().substring(0, 8).toUpperCase()}`;
      const tenant = await tx.tenant.create({
        data: {
          tenantId,
          companyName: input.companyName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          address: input.address,
          taxNumber: input.taxNumber,
          vatId: input.vatId,
          employeeLimit: input.employeeLimit || 50,
          licenseStatus: input.trialDays ? 'TEST' : 'ACTIVE',
          createdById: platformAdminId,
        },
      });

      // 2. Trial-Abonnement erstellen falls gewünscht
      if (input.trialDays && input.planId) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + input.trialDays);

        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: input.planId,
            status: 'TRIAL',
            billingInterval: 'MONTHLY',
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEnd,
            trialStart: new Date(),
            trialEnd,
            monthlyRevenue: 0,
          },
        });
      }

      // 3. Standardrollen und Berechtigungen erstellen
      await ensureDefaultRoles(tx, tenant.id);

      // 4. Admin-Benutzer erstellen
      const tempPassword = crypto.randomBytes(12).toString('base64').substring(0, 12);
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const adminRole = await tx.role.findUniqueOrThrow({
        where: { tenantId_slug: { tenantId: tenant.id, slug: 'admin' } },
      });

      await tx.user.create({
        data: {
          tenantId: tenant.id,
          username: input.contactEmail,
          email: input.contactEmail,
          passwordHash: hashedPassword,
          firstName: 'Administrator',
          lastName: input.companyName,
          isActive: true,
          roleId: adminRole.id,
        },
      });

      return { tenant, tempPassword };
    });

    // 5. Willkommens-E-Mail erst nach erfolgreichem Commit senden
    try {
      await emailService.sendWelcomeEmail(result.tenant.id, result.tempPassword);
      logger.info(`Willkommens-E-Mail gesendet an: ${result.tenant.contactEmail}`);
    } catch (emailError) {
      logger.error(`Fehler beim Senden der Willkommens-E-Mail: ${emailError}`);
      // Tenant wurde erfolgreich erstellt, E-Mail-Fehler ist nicht kritisch
    }

    logger.info(`Mandant erstellt: ${result.tenant.companyName} (${result.tenant.tenantId})`);
    return result.tenant;
  }

  async update(id: string, input: UpdateTenantInput, platformAdminId: string) {
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Mandant');

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(input.companyName !== undefined && { companyName: input.companyName }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
        ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.taxNumber !== undefined && { taxNumber: input.taxNumber }),
        ...(input.vatId !== undefined && { vatId: input.vatId }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.employeeLimit !== undefined && { employeeLimit: input.employeeLimit }),
        ...(input.featureFlags !== undefined && { featureFlags: input.featureFlags }),
        ...(input.paymentGraceDays !== undefined && { paymentGraceDays: input.paymentGraceDays }),
        ...(input.offlineGraceMinutes !== undefined && { offlineGraceMinutes: input.offlineGraceMinutes }),
        ...(input.notes !== undefined && { notes: input.notes }),
        modifiedById: platformAdminId,
      },
    });

    logger.info(`Mandant aktualisiert: ${tenant.companyName}`);
    return tenant;
  }

  async updateLicenseStatus(id: string, status: string, platformAdminId: string) {
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        licenseStatus: status as any,
        modifiedById: platformAdminId,
      },
    });

    logger.info(`Lizenzstatus geändert: ${tenant.companyName} → ${status}`);
    return tenant;
  }

  async getDashboard() {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      activeSubscriptions,
      totalRevenue,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { licenseStatus: 'ACTIVE' } }),
      prisma.tenant.count({ where: { licenseStatus: 'TEST' } }),
      prisma.tenant.count({ where: { licenseStatus: { in: ['SUSPENDED', 'CANCELLED'] } } }),
      prisma.subscription.count({ where: { status: { in: ['ACTIVE', 'TRIAL'] } } }),
      prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { monthlyRevenue: true },
      }),
    ]);

    return {
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      activeSubscriptions,
      monthlyRecurringRevenue: Number(totalRevenue._sum.monthlyRevenue || 0),
      yearlyRecurringRevenue: Number(totalRevenue._sum.monthlyRevenue || 0) * 12,
    };
  }
}

export const tenantService = new TenantService();
