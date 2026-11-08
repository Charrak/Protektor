import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError } from '../middleware/errorHandler';

export class ObjectService {
  async list(query: { search?: string; customerId?: string; isActive?: boolean; page?: number; limit?: number }) {
    const { search, customerId, isActive, page = 1, limit = 25 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { objectNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (customerId) where.customerId = customerId;
    if (isActive !== undefined) where.isActive = isActive;

    const [objects, total] = await Promise.all([
      prisma.sMSObject.findMany({
        where,
        include: {
          customer: { select: { id: true, companyName: true, customerNumber: true } },
          _count: { select: { requirements: true, deployments: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.sMSObject.count({ where }),
    ]);

    return {
      objects: objects.map((o: any) => ({
        id: o.id,
        objectNumber: o.objectNumber,
        name: o.name,
        city: o.city,
        objectType: o.objectType,
        isActive: o.isActive,
        customer: o.customer,
        requirementCount: o._count.requirements,
        deploymentCount: o._count.deployments,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const object = await prisma.sMSObject.findUnique({
      where: { id },
      include: {
        customer: true,
        contactPerson: true,
        requirements: {
          include: { qualification: true },
        },
      },
    });

    if (!object) throw new NotFoundError('Objekt');
    return object;
  }

  async create(input: any, userId: string) {
    const existing = await prisma.sMSObject.findFirst({
      where: { objectNumber: input.objectNumber },
    });

    if (existing) throw new ConflictError('Objektnummer ist bereits vergeben');

    const obj = await prisma.sMSObject.create({
      data: {
        objectNumber: input.objectNumber,
        customerId: input.customerId,
        name: input.name,
        street: input.street,
        zipCode: input.zipCode,
        city: input.city,
        description: input.description,
        objectType: input.objectType,
        contactPersonId: input.contactPersonId,
        alarmNumber: input.alarmNumber,
        keyDepot: input.keyDepot,
        accessCode: input.accessCode,
        specialInstructions: input.specialInstructions,
        isActive: input.isActive !== false,
      },
    });

    logger.info(`Objekt erstellt: ${obj.name} (${obj.objectNumber})`);
    return obj;
  }

  async update(id: string, input: any, userId: string) {
    const existing = await prisma.sMSObject.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Objekt');

    if (input.objectNumber && input.objectNumber !== existing.objectNumber) {
      const taken = await prisma.sMSObject.findFirst({
        where: { objectNumber: input.objectNumber, id: { not: id } },
      });
      if (taken) throw new ConflictError('Objektnummer ist bereits vergeben');
    }

    const obj = await prisma.sMSObject.update({
      where: { id },
      data: {
        ...(input.objectNumber !== undefined && { objectNumber: input.objectNumber }),
        ...(input.customerId !== undefined && { customerId: input.customerId }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.street !== undefined && { street: input.street }),
        ...(input.zipCode !== undefined && { zipCode: input.zipCode }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.objectType !== undefined && { objectType: input.objectType }),
        ...(input.contactPersonId !== undefined && { contactPersonId: input.contactPersonId }),
        ...(input.alarmNumber !== undefined && { alarmNumber: input.alarmNumber }),
        ...(input.keyDepot !== undefined && { keyDepot: input.keyDepot }),
        ...(input.accessCode !== undefined && { accessCode: input.accessCode }),
        ...(input.specialInstructions !== undefined && { specialInstructions: input.specialInstructions }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    logger.info(`Objekt aktualisiert: ${obj.name}`);
    return obj;
  }

  async setRequirements(objectId: string, requirementData: Array<{ qualificationId: string; isMandatory: boolean }>, userId: string) {
    const obj = await prisma.sMSObject.findUnique({ where: { id: objectId } });
    if (!obj) throw new NotFoundError('Objekt');

    // Alte Anforderungen löschen
    await prisma.objectRequirement.deleteMany({ where: { objectId } });

    // Neue Anforderungen erstellen
    if (requirementData.length > 0) {
      await prisma.objectRequirement.createMany({
        data: requirementData.map(r => ({
          objectId,
          qualificationId: r.qualificationId,
          isMandatory: r.isMandatory,
        })),
      });
    }

    logger.info(`Objekt-Anforderungen aktualisiert: ${obj.name} (${requirementData.length} Qualifikationen)`);
  }
}

export const objectService = new ObjectService();
