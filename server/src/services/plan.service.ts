import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError } from '../middleware/errorHandler';

export interface CreatePlanInput {
  name: string;
  slug: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  employeeLimit?: number;
  features?: any;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  employeeLimit?: number;
  features?: any;
  isActive?: boolean;
}

export class PlanService {
  /**
   * Liste aller Pläne
   */
  async list(query: { activeOnly?: boolean } = {}) {
    const where: any = {};
    if (query.activeOnly) where.isActive = true;

    const plans = await prisma.plan.findMany({
      where,
      include: {
        _count: { select: { subscriptions: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      monthlyPrice: p.monthlyPrice,
      yearlyPrice: p.yearlyPrice,
      employeeLimit: p.employeeLimit,
      features: p.features,
      isActive: p.isActive,
      subscriptionCount: p._count.subscriptions,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Plan erstellen
   */
  async create(input: CreatePlanInput): Promise<any> {
    // Slug-Duplikat prüfen
    const existing = await prisma.plan.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new ConflictError('Tarif-Slug ist bereits vergeben');
    }

    const plan = await prisma.plan.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        monthlyPrice: input.monthlyPrice,
        yearlyPrice: input.yearlyPrice,
        employeeLimit: input.employeeLimit,
        features: input.features || {
          scheduling: true,
          timeTracking: true,
          billing: true,
          autoPlanning: false,
          apiAccess: false,
          prioritySupport: false,
        },
      },
    });

    logger.info(`Plan erstellt: ${plan.name} (${plan.slug})`);
    return plan;
  }

  /**
   * Plan aktualisieren
   */
  async update(id: string, input: UpdatePlanInput): Promise<any> {
    const existing = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundError('Tarif');

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.monthlyPrice !== undefined && { monthlyPrice: input.monthlyPrice }),
        ...(input.yearlyPrice !== undefined && { yearlyPrice: input.yearlyPrice }),
        ...(input.employeeLimit !== undefined && { employeeLimit: input.employeeLimit }),
        ...(input.features !== undefined && { features: input.features }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    logger.info(`Plan aktualisiert: ${plan.name}`);
    return plan;
  }

  /**
   * Plan löschen (nur wenn keine aktiven Subscriptions)
   */
  async delete(id: string): Promise<void> {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    if (!plan) throw new NotFoundError('Tarif');

    if (plan._count.subscriptions > 0) {
      throw new ConflictError('Tarif kann nicht gelöscht werden, da er noch von Subscriptions verwendet wird');
    }

    await prisma.plan.delete({ where: { id } });
    logger.info(`Plan gelöscht: ${plan.name}`);
  }

  /**
   * Plan nach ID finden
   */
  async getById(id: string) {
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) throw new NotFoundError('Tarif');
    return plan;
  }

  /**
   * Plan nach Slug finden
   */
  async getBySlug(slug: string) {
    const plan = await prisma.plan.findUnique({
      where: { slug },
    });

    if (!plan) throw new NotFoundError('Tarif');
    return plan;
  }
}

export const planService = new PlanService();
