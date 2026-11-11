import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export class EmployeeTimePreferenceService {
  /**
   * Erstellt eine neue Zeitpräferenz
   */
  async create(tenantId: string, employeeId: string, input: {
    type: 'preferred' | 'restricted' | 'requested';
    weekdays: number[];
    startTime?: string;
    endTime?: string;
    reason?: string;
    priority?: number;
  }) {
    // Validierung
    if (!input.weekdays || input.weekdays.length === 0) {
      throw new ValidationError('Mindestens ein Wochentag muss angegeben werden');
    }
    if (input.weekdays.some(d => d < 1 || d > 7)) {
      throw new ValidationError('Wochentage müssen zwischen 1 (Mo) und 7 (So) liegen');
    }

    // Mitarbeiter prüfen
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null }
    });
    if (!employee) {
      throw new NotFoundError('Mitarbeiter nicht gefunden');
    }

    const preference = await prisma.employeeTimePreference.create({
      data: {
        tenantId,
        employeeId,
        type: input.type,
        weekdays: input.weekdays,
        startTime: input.startTime ? new Date(`1970-01-01T${input.startTime}:00Z`) : null,
        endTime: input.endTime ? new Date(`1970-01-01T${input.endTime}:00Z`) : null,
        reason: input.reason,
        priority: input.priority || 3,
        isActive: true,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, personnelNumber: true }
        }
      }
    });

    logger.info(`Zeitpräferenz erstellt für Mitarbeiter ${employeeId}: ${input.type}`);
    return preference;
  }

  /**
   * Listet alle Zeitpräferenzen eines Mitarbeiters
   */
  async listByEmployee(tenantId: string, employeeId: string) {
    return prisma.employeeTimePreference.findMany({
      where: { employeeId, tenantId, isActive: true },
      orderBy: [{ type: 'asc' }, { priority: 'desc' }],
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
  }

  /**
   * Aktualisiert eine Zeitpräferenz
   */
  async update(tenantId: string, preferenceId: string, input: {
    type?: 'preferred' | 'restricted' | 'requested';
    weekdays?: number[];
    startTime?: string;
    endTime?: string;
    reason?: string;
    priority?: number;
    isActive?: boolean;
  }) {
    const preference = await prisma.employeeTimePreference.findFirst({
      where: { id: preferenceId, tenantId }
    });

    if (!preference) {
      throw new NotFoundError('Zeitpräferenz nicht gefunden');
    }

    const updateData: any = {};
    if (input.type !== undefined) updateData.type = input.type;
    if (input.weekdays !== undefined) updateData.weekdays = input.weekdays;
    if (input.startTime !== undefined) updateData.startTime = input.startTime ? new Date(`1970-01-01T${input.startTime}:00Z`) : null;
    if (input.endTime !== undefined) updateData.endTime = input.endTime ? new Date(`1970-01-01T${input.endTime}:00Z`) : null;
    if (input.reason !== undefined) updateData.reason = input.reason;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    return prisma.employeeTimePreference.update({
      where: { id: preferenceId },
      data: updateData,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
  }

  /**
   * Löscht eine Zeitpräferenz (soft delete)
   */
  async delete(tenantId: string, preferenceId: string) {
    const preference = await prisma.employeeTimePreference.findFirst({
      where: { id: preferenceId, tenantId }
    });

    if (!preference) {
      throw new NotFoundError('Zeitpräferenz nicht gefunden');
    }

    await prisma.employeeTimePreference.update({
      where: { id: preferenceId },
      data: { isActive: false }
    });

    logger.info(`Zeitpräferenz gelöscht: ${preferenceId}`);
    return { success: true };
  }

  /**
   * Erstellt eine neue Zeit-Anfrage (einmalig)
   */
  async createTimeRequest(tenantId: string, employeeId: string, input: {
    type: 'day_off' | 'early_leave' | 'late_start' | 'extra_hours' | 'swap';
    date: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    reason: string;
  }) {
    // Mitarbeiter prüfen
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null }
    });
    if (!employee) {
      throw new NotFoundError('Mitarbeiter nicht gefunden');
    }

    const request = await prisma.employeeTimeRequest.create({
      data: {
        tenantId,
        employeeId,
        type: input.type,
        date: new Date(input.date),
        endDate: input.endDate ? new Date(input.endDate) : null,
        startTime: input.startTime ? new Date(`1970-01-01T${input.startTime}:00Z`) : null,
        endTime: input.endTime ? new Date(`1970-01-01T${input.endTime}:00Z`) : null,
        reason: input.reason,
        status: 'pending',
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, personnelNumber: true }
        }
      }
    });

    logger.info(`Zeit-Anfrage erstellt für Mitarbeiter ${employeeId}: ${input.type}`);
    return request;
  }

  /**
   * Listet alle Zeit-Anfragen eines Mitarbeiters
   */
  async listTimeRequestsByEmployee(tenantId: string, employeeId: string) {
    return prisma.employeeTimeRequest.findMany({
      where: { employeeId, tenantId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
  }

  /**
   * Genehmigt oder lehnt eine Zeit-Anfrage ab
   */
  async approveTimeRequest(tenantId: string, requestId: string, approvedById: string, approved: boolean, rejectionReason?: string) {
    const request = await prisma.employeeTimeRequest.findFirst({
      where: { id: requestId, tenantId }
    });

    if (!request) {
      throw new NotFoundError('Zeit-Anfrage nicht gefunden');
    }

    if (request.status !== 'pending') {
      throw new ValidationError('Anfrage wurde bereits bearbeitet');
    }

    return prisma.employeeTimeRequest.update({
      where: { id: requestId },
      data: {
        status: approved ? 'approved' : 'rejected',
        approvedById,
        approvedAt: new Date(),
        rejectionReason: approved ? null : rejectionReason,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
  }

  /**
   * Gibt Zeitpräferenzen für ein bestimmtes Datum zurück
   */
  async getPreferencesForDate(employeeId: string, date: Date) {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // 1=Mo, 7=So

    const preferences = await prisma.employeeTimePreference.findMany({
      where: {
        employeeId,
        isActive: true,
        weekdays: { has: dayOfWeek }
      }
    });

    return preferences.map(p => ({
      ...p,
      startTime: p.startTime ? p.startTime.toISOString().substr(11, 5) : null,
      endTime: p.endTime ? p.endTime.toISOString().substr(11, 5) : null
    }));
  }
}

export const employeeTimePreferenceService = new EmployeeTimePreferenceService();
