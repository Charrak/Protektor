import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

export class DeploymentService {
  async list(query: {
    date?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    objectId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { date, startDate, endDate, employeeId, objectId, status, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (date) {
      where.date = new Date(date);
    } else if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    if (employeeId) where.employeeId = employeeId;
    if (objectId) where.objectId = objectId;
    if (status) where.status = status;

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({
        where,
        include: {
          object: {
            include: { customer: { select: { companyName: true } } },
          },
          employee: { select: { id: true, firstName: true, lastName: true, personnelNumber: true } },
          shift: true,
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.deployment.count({ where }),
    ]);

    return {
      deployments: deployments.map((d: any) => ({
        id: d.id,
        objectId: d.objectId,
        object: {
          id: d.object.id,
          name: d.object.name,
          customerName: d.object.customer.companyName,
        },
        employeeId: d.employeeId,
        employee: {
          id: d.employee.id,
          name: `${d.employee.firstName} ${d.employee.lastName}`,
          personnelNumber: d.employee.personnelNumber,
        },
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
        breakMinutes: d.breakMinutes,
        isNightShift: d.isNightShift,
        isSunday: d.isSunday,
        isHoliday: d.isHoliday,
        status: d.status,
        version: d.version,
        shift: d.shift ? { id: d.shift.id, name: d.shift.name } : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: {
        object: { include: { customer: true } },
        employee: true,
        shift: true,
      },
    });

    if (!deployment) throw new NotFoundError('Einsatz');
    return deployment;
  }

  async create(input: any, userId: string) {
    const { objectId, employeeId, date, startTime, endTime, breakMinutes = 0, shiftId, notes } = input;

    // Validierung
    if (!objectId || !employeeId || !date || !startTime || !endTime) {
      throw new ConflictError('Objekt, Mitarbeiter, Datum und Zeiten sind erforderlich');
    }

    // Prüfen ob Objekt und Mitarbeiter existieren
    const [object, employee] = await Promise.all([
      prisma.sMSObject.findUnique({ where: { id: objectId, isActive: true } }),
      prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null, status: 'active' } }),
    ]);

    if (!object) throw new NotFoundError('Objekt');
    if (!employee) throw new NotFoundError('Mitarbeiter');

    // Konflikte prüfen (gleicher Mitarbeiter zur gleichen Zeit)
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    const conflicting = await prisma.deployment.findFirst({
      where: {
        employeeId,
        date: new Date(date),
        status: { not: 'cancelled' },
        OR: [
          { startTime: { lte: start }, endTime: { gte: start } },
          { startTime: { lte: end }, endTime: { gte: end } },
        ],
      },
    });

    if (conflicting) {
      throw new ConflictError('Mitarbeiter hat bereits einen Einsatz zur gleichen Zeit');
    }

    // Sonn-/Feiertagsprüfung
    const dateObj = new Date(date);
    const isSunday = dateObj.getDay() === 0;
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: dateObj,
        OR: [{ state: null }, { state: 'NW' }],
      },
    });
    const isHoliday = !!holiday;

    // Nachtschicht-Prüfung (22:00 - 06:00)
    const startHour = start.getHours();
    const endHour = end.getHours();
    const isNightShift = startHour >= 22 || endHour <= 6 || (startHour < endHour && startHour < 6);

    const deployment = await prisma.deployment.create({
      data: {
        objectId,
        employeeId,
        date: dateObj,
        startTime: start,
        endTime: end,
        breakMinutes,
        shiftId,
        isNightShift,
        isSunday,
        isHoliday,
        status: 'planned',
        plannedById: userId,
        notes,
        version: 1,
      },
      include: {
        object: { include: { customer: true } },
        employee: true,
      },
    });

    logger.info(`Einsatz erstellt: ${employee.firstName} ${employee.lastName} → ${object.name} am ${date}`);
    return deployment;
  }

  async update(id: string, input: any, userId: string) {
    const existing = await prisma.deployment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Einsatz');

    // Version prüfen (Optimistic Locking)
    if (input.version !== undefined && input.version !== existing.version) {
      throw new ConflictError('Einsatz wurde zwischenzeitlich geändert. Bitte neu laden.');
    }

    const deployment = await prisma.deployment.update({
      where: { id },
      data: {
        ...(input.objectId !== undefined && { objectId: input.objectId }),
        ...(input.employeeId !== undefined && { employeeId: input.employeeId }),
        ...(input.date !== undefined && { date: new Date(input.date) }),
        ...(input.startTime !== undefined && { startTime: new Date(`1970-01-01T${input.startTime}`) }),
        ...(input.endTime !== undefined && { endTime: new Date(`1970-01-01T${input.endTime}`) }),
        ...(input.breakMinutes !== undefined && { breakMinutes: input.breakMinutes }),
        ...(input.shiftId !== undefined && { shiftId: input.shiftId }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.status !== undefined && { status: input.status }),
        version: { increment: 1 },
      },
      include: {
        object: { include: { customer: true } },
        employee: true,
      },
    });

    logger.info(`Einsatz aktualisiert: ID ${id}`);
    return deployment;
  }

  async cancel(id: string, reason: string, userId: string) {
    const deployment = await prisma.deployment.findUnique({ where: { id } });
    if (!deployment) throw new NotFoundError('Einsatz');

    const cancelled = await prisma.deployment.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledById: userId,
        cancelledAt: new Date(),
        cancellationReason: reason,
        version: { increment: 1 },
      },
    });

    logger.info(`Einsatz storniert: ID ${id}, Grund: ${reason}`);
    return cancelled;
  }

  async confirm(id: string, employeeId: string) {
    const deployment = await prisma.deployment.update({
      where: { id },
      data: {
        status: 'confirmed',
        confirmedById: employeeId,
        confirmedAt: new Date(),
      },
    });

    logger.info(`Einsatz bestätigt: ID ${id} von Mitarbeiter ${employeeId}`);
    return deployment;
  }

  async getForDateRange(startDate: string, endDate: string) {
    const deployments = await prisma.deployment.findMany({
      where: {
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        status: { not: 'cancelled' },
      },
      include: {
        object: { include: { customer: { select: { companyName: true } } } },
        employee: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return deployments;
  }
}

export const deploymentService = new DeploymentService();
