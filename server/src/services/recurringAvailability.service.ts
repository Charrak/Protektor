import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

interface CreateRecurringInput {
  employeeId: string;
  dayOfWeek: number; // 1-7 (Mo-So)
  startTime: string; // "HH:MM"
  endTime: string;
  validFrom: string;
  validUntil?: string;
  notes?: string;
}

interface UpdateRecurringInput {
  startTime?: string;
  endTime?: string;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  notes?: string;
}

export class RecurringAvailabilityService {
  /**
   * Liste aller wiederkehrenden Verfügbarkeiten für einen Mitarbeiter
   */
  async listByEmployee(tenantId: string, employeeId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    const availabilities = await prisma.recurringAvailability.findMany({
      where: { employeeId, tenantId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        approvedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return availabilities;
  }

  /**
   * Liste aller wiederkehrenden Verfügbarkeiten für einen Wochentag
   */
  async listByDay(tenantId: string, dayOfWeek: number) {
    return prisma.recurringAvailability.findMany({
      where: { tenantId, dayOfWeek, isActive: true, status: 'approved' },
      include: {
        employee: { select: { firstName: true, lastName: true, personnelNumber: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Erstelle eine neue wiederkehrende Verfügbarkeit
   */
  async create(tenantId: string, input: CreateRecurringInput, userId: string) {
    // Validierung
    if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 1 || input.dayOfWeek > 7) {
      throw new ValidationError('Wochentag muss zwischen 1 (Montag) und 7 (Sonntag) sein');
    }

    if (!this.isValidTime(input.startTime) || !this.isValidTime(input.endTime)) {
      throw new ValidationError('Ungültiges Zeitformat (HH:MM)');
    }
    if (input.startTime >= input.endTime) {
      throw new ValidationError('Die Endzeit muss nach der Startzeit liegen');
    }
    if (!this.isValidDate(input.validFrom) || (input.validUntil && !this.isValidDate(input.validUntil))) {
      throw new ValidationError('Ungültiges Gültigkeitsdatum');
    }
    if (input.validUntil && input.validUntil < input.validFrom) {
      throw new ValidationError('Das Enddatum darf nicht vor dem Startdatum liegen');
    }

    // Prüfen ob bereits vorhanden
    const existing = await prisma.recurringAvailability.findFirst({
      where: {
        tenantId,
        employeeId: input.employeeId,
        dayOfWeek: input.dayOfWeek,
        startTime: this.parseTime(input.startTime),
        endTime: this.parseTime(input.endTime),
      },
    });

    if (existing) {
      throw new ValidationError('Diese Verfügbarkeit existiert bereits');
    }

    const availability = await prisma.recurringAvailability.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        dayOfWeek: input.dayOfWeek,
        startTime: this.parseTime(input.startTime),
        endTime: this.parseTime(input.endTime),
        validFrom: new Date(input.validFrom),
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        notes: input.notes,
        status: 'pending',
      },
    });

    logger.info(`Wiederkehrende Verfügbarkeit erstellt: MA ${input.employeeId}, Tag ${input.dayOfWeek}`);
    return availability;
  }

  /**
   * Genehmige oder lehne eine wiederkehrende Verfügbarkeit ab
   */
  async approve(tenantId: string, id: string, approved: boolean, userId: string) {
    const availability = await prisma.recurringAvailability.findFirst({
      where: { id, tenantId },
    });
    if (!availability) throw new NotFoundError('Verfügbarkeit');

    const updated = await prisma.recurringAvailability.update({
      where: { id },
      data: {
        status: approved ? 'approved' : 'rejected',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    logger.info(`Wiederkehrende Verfügbarkeit ${approved ? 'genehmigt' : 'abgelehnt'}: ${id}`);
    return updated;
  }

  /**
   * Aktualisiere eine wiederkehrende Verfügbarkeit
   */
  async update(tenantId: string, id: string, input: UpdateRecurringInput) {
    const availability = await prisma.recurringAvailability.findFirst({
      where: { id, tenantId },
    });
    if (!availability) throw new NotFoundError('Verfügbarkeit');

    const data: any = {};
    if (input.startTime) data.startTime = this.parseTime(input.startTime);
    if (input.endTime) data.endTime = this.parseTime(input.endTime);
    if (input.validFrom) data.validFrom = new Date(input.validFrom);
    if (input.validUntil !== undefined) data.validUntil = input.validUntil ? new Date(input.validUntil) : null;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.notes !== undefined) data.notes = input.notes;

    return prisma.recurringAvailability.update({
      where: { id },
      data,
    });
  }

  /**
   * Lösche eine wiederkehrende Verfügbarkeit
   */
  async delete(tenantId: string, id: string) {
    const availability = await prisma.recurringAvailability.findFirst({
      where: { id, tenantId },
    });
    if (!availability) throw new NotFoundError('Verfügbarkeit');

    await prisma.recurringAvailability.delete({ where: { id } });
    logger.info(`Wiederkehrende Verfügbarkeit gelöscht: ${id}`);
  }

  /**
   * Prüfe ob ein Mitarbeiter an einem bestimmten Tag verfügbar ist
   */
  async isAvailable(tenantId: string, employeeId: string, date: Date, startTime: Date, endTime: Date) {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Sonntag = 7

    // Prüfe wiederkehrende Verfügbarkeiten
    const recurring = await prisma.recurringAvailability.findMany({
      where: {
        employeeId,
        tenantId,
        dayOfWeek,
        isActive: true,
        status: 'approved',
        OR: [
          { validFrom: { lte: date }, validUntil: { gte: date } },
          { validFrom: { lte: date }, validUntil: null },
        ],
      },
    });

    // Prüfe ob die Schichtzeit in einer Verfügbarkeit liegt
    for (const r of recurring) {
      const rStart = r.startTime.getHours() * 60 + r.startTime.getMinutes();
      const rEnd = r.endTime.getHours() * 60 + r.endTime.getMinutes();
      const sStart = startTime.getHours() * 60 + startTime.getMinutes();
      const sEnd = endTime.getHours() * 60 + endTime.getMinutes();

      if (sStart >= rStart && sEnd <= rEnd) {
        return { available: true, reason: 'Wiederkehrende Verfügbarkeit' };
      }
    }

    // Prüfe Ausnahmen (Urlaub, Krankheit etc.)
    const exceptions = await prisma.availability.findMany({
      where: {
        employeeId,
        tenantId,
        status: 'approved',
        type: { in: ['vacation', 'sick', 'personal'] },
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (exceptions.length > 0) {
      return { available: false, reason: `${exceptions[0].type} - ${exceptions[0].reason || ''}` };
    }

    return { available: false, reason: 'Keine Verfügbarkeit für diesen Tag hinterlegt' };
  }

  // Helper
  private isValidTime(time: string): boolean {
    if (!/^\d{2}:\d{2}$/.test(time)) return false;
    const [hours, minutes] = time.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  private parseTime(time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m, 0);
    return date;
  }
}

export const recurringAvailabilityService = new RecurringAvailabilityService();
