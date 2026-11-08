import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError } from '../middleware/errorHandler';

export interface CreateSubscriptionInput {
  tenantId: string;
  planId: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  stripeSubscriptionId?: string;
  trialDays?: number;
}

export interface UpdateSubscriptionInput {
  status?: string;
  planId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

export class SubscriptionService {
  /**
   * Liste aller Subscriptions
   */
  async list(query: { tenantId?: string; status?: string; page?: number; limit?: number }) {
    const { tenantId, status, page = 1, limit = 25 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          tenant: { select: { tenantId: true, companyName: true, contactEmail: true } },
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions: subscriptions.map((s: any) => ({
        id: s.id,
        tenantId: s.tenantId,
        tenant: s.tenant,
        plan: s.plan,
        status: s.status,
        billingInterval: s.billingInterval,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        trialStart: s.trialStart,
        trialEnd: s.trialEnd,
        cancelAt: s.cancelAt,
        canceledAt: s.canceledAt,
        monthlyRevenue: s.monthlyRevenue,
        createdAt: s.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Subscription erstellen
   */
  async create(input: CreateSubscriptionInput): Promise<any> {
    // Tenant prüfen
    const tenant = await prisma.tenant.findUnique({
      where: { id: input.tenantId },
    });

    if (!tenant) throw new NotFoundError('Mandant');

    // Plan prüfen
    const plan = await prisma.plan.findUnique({
      where: { id: input.planId },
    });

    if (!plan) throw new NotFoundError('Tarif');

    // Trial-Zeitraum berechnen
    const now = new Date();
    const trialEnd = input.trialDays
      ? new Date(now.getTime() + input.trialDays * 24 * 60 * 60 * 1000)
      : null;

    const periodEnd = trialEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        tenantId: input.tenantId,
        planId: input.planId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        status: input.trialDays ? 'TRIAL' : 'ACTIVE',
        billingInterval: input.billingInterval,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialStart: trialEnd ? now : null,
        trialEnd,
        monthlyRevenue: input.billingInterval === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice,
      },
      include: {
        tenant: true,
        plan: true,
      },
    });

    // Tenant-Lizenzstatus aktualisieren
    await prisma.tenant.update({
      where: { id: input.tenantId },
      data: {
        licenseStatus: input.trialDays ? 'TEST' : 'ACTIVE',
      },
    });

    logger.info(`Subscription erstellt: Tenant ${tenant.tenantId}, Plan ${plan.name}`);
    return subscription;
  }

  /**
   * Subscription aktualisieren
   */
  async update(id: string, input: UpdateSubscriptionInput): Promise<any> {
    const existing = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundError('Subscription');

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(input.status !== undefined && { status: input.status as any }),
        ...(input.planId !== undefined && { planId: input.planId }),
        ...(input.currentPeriodEnd !== undefined && { currentPeriodEnd: input.currentPeriodEnd }),
        ...(input.cancelAtPeriodEnd !== undefined && { cancelAt: input.cancelAtPeriodEnd ? new Date() : null }),
      },
    });

    logger.info(`Subscription aktualisiert: ${id}`);
    return subscription;
  }

  /**
   * Subscription kündigen
   */
  async cancel(id: string, atPeriodEnd: boolean = true): Promise<any> {
    const existing = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundError('Subscription');

    const now = new Date();
    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELED',
        cancelAt: atPeriodEnd ? existing.currentPeriodEnd : now,
        canceledAt: now,
        endedAt: atPeriodEnd ? null : now,
      },
    });

    // Tenant auf CANCELLED setzen (sofort oder am Periodenende)
    if (!atPeriodEnd) {
      await prisma.tenant.update({
        where: { id: existing.tenantId },
        data: { licenseStatus: 'CANCELLED' },
      });
    }

    logger.info(`Subscription gekündigt: ${id}`);
    return subscription;
  }

  /**
   * Subscription reaktivieren
   */
  async reactivate(id: string): Promise<any> {
    const existing = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundError('Subscription');

    if (existing.status !== 'CANCELED') {
      throw new ConflictError('Nur gekündigte Subscriptions können reaktiviert werden');
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        cancelAt: null,
        canceledAt: null,
        endedAt: null,
      },
    });

    // Tenant wieder aktivieren
    await prisma.tenant.update({
      where: { id: existing.tenantId },
      data: { licenseStatus: 'ACTIVE' },
    });

    logger.info(`Subscription reaktiviert: ${id}`);
    return subscription;
  }

  /**
   * Subscription für Tenant finden
   */
  async getByTenant(tenantId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscription;
  }
}

export const subscriptionService = new SubscriptionService();
