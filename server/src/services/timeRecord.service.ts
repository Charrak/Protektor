import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler';

interface CreateTimeRecordInput {
  employeeId: string;
  deploymentId?: string;
  objectId?: string;
  postNumber?: string;
  activityType?: string;
  clockIn: Date;
  clockOut?: Date;
  breakDuration?: number;
  notes?: string;
  sourceType?: 'manual' | 'stamp' | 'app' | 'import';
  sourceDevice?: string;
}

interface ClockOutInput {
  clockOut: Date;
  breakDuration?: number;
  notes?: string;
}

interface StartBreakInput {
  breakType?: string;
  notes?: string;
}

interface EndBreakInput {
  breakEnd?: Date;
  notes?: string;
}

interface ApproveInput {
  reason?: string;
}

interface RejectInput {
  reason: string;
}

interface LockInput {
  reason: string;
}

interface CorrectInput {
  field: string;
  value: any;
  reason: string;
}

export class TimeRecordService {
  /**
   * Liste aller Zeitnachweise für einen Tenant (mit Filtern)
   */
  async listAll(tenantId: string, filters?: {
    employeeId?: string;
    date?: Date;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = { tenantId };
    
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    
    if (filters?.date) {
      where.date = filters.date;
    } else if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }
    
    if (filters?.status) where.status = filters.status;

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      prisma.timeRecord.findMany({
        where,
        orderBy: [{ date: 'desc' }, { clockIn: 'asc' }],
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, personnelNumber: true } },
          deployment: { select: { startTime: true, endTime: true, notes: true } },
          object: { select: { name: true, objectNumber: true } },
          approvedBy: { select: { firstName: true, lastName: true } },
        },
        skip,
        take: limit,
      }),
      prisma.timeRecord.count({ where }),
    ]);

    return {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Liste aller Zeitnachweise für einen Mitarbeiter
   */
  async listByEmployee(tenantId: string, employeeId: string, filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    objectId?: string;
  }) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    const where: any = { employeeId, tenantId };
    
    if (filters?.dateFrom || filters?.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = filters.dateFrom;
      if (filters.dateTo) where.date.lte = filters.dateTo;
    }
    
    if (filters?.status) where.status = filters.status;
    if (filters?.objectId) where.objectId = filters.objectId;

    return prisma.timeRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { clockIn: 'asc' }],
      include: {
        employee: { select: { firstName: true, lastName: true, personnelNumber: true } },
        deployment: { select: { startTime: true, endTime: true, notes: true } },
        object: { select: { name: true, objectNumber: true } },
        breaks: { orderBy: { breakStart: 'asc' } },
        approvedBy: { select: { firstName: true, lastName: true } },
        lockedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Clock-In: Neue Zeiterfassung starten
   */
  async clockIn(tenantId: string, input: CreateTimeRecordInput, userId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    // Prüfen ob bereits eine offene Zeiterfassung existiert
    const openRecord = await prisma.timeRecord.findFirst({
      where: {
        employeeId: input.employeeId,
        tenantId,
        clockOut: null,
        status: 'open',
      },
    });

    if (openRecord) {
      throw new ConflictError('Es existiert bereits eine offene Zeiterfassung');
    }

    // Objekt prüfen falls angegeben
    if (input.objectId) {
      const obj = await prisma.sMSObject.findFirst({
        where: { id: input.objectId, tenantId },
      });
      if (!obj) throw new NotFoundError('Objekt');
    }

    // Deployment prüfen falls angegeben
    if (input.deploymentId) {
      const deployment = await prisma.deployment.findFirst({
        where: { id: input.deploymentId, tenantId, employeeId: input.employeeId },
      });
      if (!deployment) throw new NotFoundError('Einsatz');
    }

    const timeRecord = await prisma.timeRecord.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        date: input.clockIn,
        deploymentId: input.deploymentId,
        objectId: input.objectId,
        postNumber: input.postNumber,
        activityType: input.activityType,
        clockIn: input.clockIn,
        breakDuration: input.breakDuration || 0,
        notes: input.notes,
        sourceType: input.sourceType || 'manual',
        sourceDevice: input.sourceDevice,
        status: 'open',
      },
    });

    logger.info(`Clock-In: MA ${input.employeeId} um ${input.clockIn}`);
    return timeRecord;
  }

  /**
   * Clock-Out: Zeiterfassung beenden
   */
  async clockOut(tenantId: string, timeRecordId: string, input: ClockOutInput, userId: string) {
    const timeRecord = await prisma.timeRecord.findFirst({
      where: { id: timeRecordId, tenantId, clockOut: null, status: 'open' },
      include: { breaks: true },
    });
    
    if (!timeRecord) throw new NotFoundError('Offene Zeiterfassung');

    // Berechne Arbeitszeit
    const duration = this.calculateDuration(
      timeRecord.clockIn,
      input.clockOut,
      timeRecord.breaks.reduce((sum: number, b: any) => sum + (b.durationMinutes || 0), 0)
    );

    // Berechne Zuschläge
    const surcharges = await this.calculateSurcharges(
      tenantId,
      timeRecord.employeeId,
      timeRecord.clockIn,
      input.clockOut,
      timeRecord.breaks.reduce((sum: number, b: any) => sum + (b.durationMinutes || 0), 0) + (input.breakDuration || 0)
    );

    const updated = await prisma.timeRecord.update({
      where: { id: timeRecordId },
      data: {
        clockOut: input.clockOut,
        breakDuration: { increment: input.breakDuration || 0 },
        regularHours: surcharges.regularHours,
        nightHours: surcharges.nightHours,
        sundayHours: surcharges.sundayHours,
        holidayHours: surcharges.holidayHours,
        overtimeHours: surcharges.overtimeHours,
        totalHours: surcharges.totalHours,
        nightSurcharge: surcharges.nightSurcharge,
        sundaySurcharge: surcharges.sundaySurcharge,
        holidaySurcharge: surcharges.holidaySurcharge,
        totalSurcharge: surcharges.totalSurcharge,
        notes: input.notes ? `${timeRecord.notes || ''}\n${input.notes}`.trim() : timeRecord.notes,
        status: 'completed',
      },
    });

    logger.info(`Clock-Out: MA ${timeRecord.employeeId} um ${input.clockOut}`);
    return updated;
  }

  /**
   * Start Break: Pause beginnen
   */
  async startBreak(tenantId: string, timeRecordId: string, input: StartBreakInput, userId: string) {
    const timeRecord = await prisma.timeRecord.findFirst({
      where: { id: timeRecordId, tenantId, clockOut: null, status: 'open' },
    });
    
    if (!timeRecord) throw new NotFoundError('Offene Zeiterfassung');

    const break_ = await prisma.break.create({
      data: {
        tenantId,
        timeRecordId,
        breakStart: new Date(),
        breakType: input.breakType || 'unpaid',
        notes: input.notes,
      },
    });

    logger.info(`Break-Start: Zeitrecord ${timeRecordId}`);
    return break_;
  }

  /**
   * End Break: Pause beenden
   */
  async endBreak(tenantId: string, breakId: string, input: EndBreakInput, userId: string) {
    const break_ = await prisma.break.findFirst({
      where: { id: breakId, tenantId, breakEnd: null },
    });
    
    if (!break_) throw new NotFoundError('Aktive Pause');

    const breakEnd = input.breakEnd || new Date();
    const durationMinutes = Math.round(
      (breakEnd.getTime() - break_.breakStart.getTime()) / 1000 / 60
    );

    const updated = await prisma.break.update({
      where: { id: breakId },
      data: {
        breakEnd,
        durationMinutes,
        notes: input.notes ? `${break_.notes || ''}\n${input.notes}`.trim() : break_.notes,
      },
    });

    logger.info(`Break-End: Break ${breakId}, Dauer: ${durationMinutes} min`);
    return updated;
  }

  /**
   * Approve: Zeiterfassung genehmigen
   */
  async approve(tenantId: string, timeRecordId: string, userId: string, input?: ApproveInput) {
    const timeRecord = await prisma.timeRecord.findFirst({
      where: { id: timeRecordId, tenantId, status: 'completed' },
    });
    
    if (!timeRecord) throw new NotFoundError('Zeiterfassung');

    const updated = await prisma.timeRecord.update({
      where: { id: timeRecordId },
      data: {
        status: 'approved',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    logger.info(`Approved: Zeitrecord ${timeRecordId} von User ${userId}`);
    return updated;
  }

  /**
   * Reject: Zeiterfassung ablehnen
   */
  async reject(tenantId: string, timeRecordId: string, userId: string, input: RejectInput) {
    const timeRecord = await prisma.timeRecord.findFirst({
      where: { id: timeRecordId, tenantId, status: 'completed' },
    });
    
    if (!timeRecord) throw new NotFoundError('Zeiterfassung');

    const updated = await prisma.timeRecord.update({
      where: { id: timeRecordId },
      data: {
        status: 'rejected',
        correctionReason: input.reason,
        correctedById: userId,
      },
    });

    logger.info(`Rejected: Zeitrecord ${timeRecordId} von User ${userId}: ${input.reason}`);
    return updated;
  }

  /**
   * Lock: Zeiterfassung sperren (nach Genehmigung)
   */
  async lock(tenantId: string, timeRecordId: string, userId: string, input: LockInput) {
    const timeRecord = await prisma.timeRecord.findFirst({
      where: { id: timeRecordId, tenantId, status: 'approved' },
    });
    
    if (!timeRecord) throw new NotFoundError('Zeiterfassung');

    const updated = await prisma.timeRecord.update({
      where: { id: timeRecordId },
      data: {
        status: 'locked',
        isLocked: true,
        lockedById: userId,
        lockedAt: new Date(),
        lockReason: input.reason,
      },
    });

    logger.info(`Locked: Zeitrecord ${timeRecordId} von User ${userId}`);
    return updated;
  }

  /**
   * Correct: Korrektur mit Audit-Trail
   */
  async correct(tenantId: string, timeRecordId: string, userId: string, input: CorrectInput) {
    const timeRecord = await prisma.timeRecord.findFirst({
      where: { id: timeRecordId, tenantId },
    });
    
    if (!timeRecord) throw new NotFoundError('Zeiterfassung');

    if (timeRecord.isLocked) {
      throw new ConflictError('Zeiterfassung ist gesperrt');
    }

    // Erstelle Korrektur-Eintrag
    const correction = await prisma.timeCorrection.create({
      data: {
        tenantId,
        timeRecordId,
        correctedById: userId,
        fieldChanged: input.field,
        oldValue: String(timeRecord[input.field as keyof typeof timeRecord] || ''),
        newValue: String(input.value),
        reason: input.reason,
      },
    });

    // Aktualisiere Zeitrecord
    const updateData: any = {
      [input.field]: input.value,
      changedById: userId,
      changedAt: new Date(),
      changeReason: input.reason,
      correctionReason: input.reason,
      correctedById: userId,
    };

    const updated = await prisma.timeRecord.update({
      where: { id: timeRecordId },
      data: updateData,
    });

    logger.info(`Corrected: Zeitrecord ${timeRecordId}, Feld: ${input.field} von User ${userId}`);
    return { timeRecord: updated, correction };
  }

  /**
   * Export für Lohnabrechnung
   */
  async exportForPayroll(tenantId: string, dateFrom: Date, dateTo: Date) {
    const records = await prisma.timeRecord.findMany({
      where: {
        tenantId,
        date: { gte: dateFrom, lte: dateTo },
        status: { in: ['approved', 'locked'] },
        exportedForPayroll: false,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, personnelNumber: true } },
        object: { select: { name: true, objectNumber: true } },
      },
      orderBy: [{ date: 'asc' }, { clockIn: 'asc' }],
    });

    // Markiere als exportiert
    await prisma.timeRecord.updateMany({
      where: { id: { in: records.map((r: any) => r.id) } },
      data: {
        exportedForPayroll: true,
        exportDate: new Date(),
      },
    });

    logger.info(`Exported ${records.length} records for payroll`);
    return records;
  }

  /**
   * Export für Kundenabrechnung
   */
  async exportForCustomer(tenantId: string, customerId: string, dateFrom: Date, dateTo: Date) {
    const records = await prisma.timeRecord.findMany({
      where: {
        tenantId,
        date: { gte: dateFrom, lte: dateTo },
        status: { in: ['approved', 'locked'] },
        exportedForCustomer: false,
        deployment: {
          object: { customerId },
        },
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        object: { select: { name: true, objectNumber: true } },
        deployment: { select: { startTime: true, endTime: true } },
      },
      orderBy: [{ date: 'asc' }, { clockIn: 'asc' }],
    });

    // Markiere als exportiert
    await prisma.timeRecord.updateMany({
      where: { id: { in: records.map((r: any) => r.id) } },
      data: {
        exportedForCustomer: true,
        exportDate: new Date(),
      },
    });

    logger.info(`Exported ${records.length} records for customer ${customerId}`);
    return records;
  }

  // Helper: Berechne Dauer in Stunden
  private calculateDuration(clockIn: Date, clockOut: Date, breakMinutes: number): number {
    const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / 1000 / 60;
    const workMinutes = totalMinutes - breakMinutes;
    return Math.round(workMinutes / 60 * 100) / 100; // Runde auf 2 Dezimalstellen
  }

  // Helper: Berechne Zuschläge
  private async calculateSurcharges(
    tenantId: string,
    employeeId: string,
    clockIn: Date,
    clockOut: Date,
    breakMinutes: number
  ) {
    // Lade Mitarbeiter-Stundensatz
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    
    if (!employee) throw new NotFoundError('Mitarbeiter');

    const hourlyRate = Number(employee.hourlyRateBase || 0);
    
    // Berechne Stunden nach Tageszeit
    let regularHours = 0;
    let nightHours = 0;
    let sundayHours = 0;
    let holidayHours = 0;
    let overtimeHours = 0;

    // Vereinfachte Berechnung: Prüfe ob Nacht/Sonntag/Feiertag
    const dayOfWeek = clockIn.getDay();
    const hourIn = clockIn.getHours();
    const hourOut = clockOut.getHours();
    
    const totalHours = this.calculateDuration(clockIn, clockOut, breakMinutes);
    
    // Nacht (20-06 Uhr)
    if (hourIn >= 20 || hourOut <= 6) {
      nightHours = totalHours;
    } else {
      regularHours = totalHours;
    }

    // Sonntag
    if (dayOfWeek === 0) {
      sundayHours = totalHours;
      regularHours = 0;
      nightHours = 0;
    }

    // Berechne Zuschläge in €
    const nightSurchargePct = Number(employee.surchargeNight || 25) / 100;
    const sundaySurchargePct = Number(employee.surchargeSunday || 50) / 100;
    const holidaySurchargePct = Number(employee.surchargeHoliday || 100) / 100;

    const nightSurcharge = nightHours * hourlyRate * nightSurchargePct;
    const sundaySurcharge = sundayHours * hourlyRate * sundaySurchargePct;
    const holidaySurcharge = holidayHours * hourlyRate * holidaySurchargePct;
    const totalSurcharge = nightSurcharge + sundaySurcharge + holidaySurcharge;

    return {
      regularHours,
      nightHours,
      sundayHours,
      holidayHours,
      overtimeHours,
      totalHours,
      nightSurcharge: Math.round(nightSurcharge * 100) / 100,
      sundaySurcharge: Math.round(sundaySurcharge * 100) / 100,
      holidaySurcharge: Math.round(holidaySurcharge * 100) / 100,
      totalSurcharge: Math.round(totalSurcharge * 100) / 100,
    };
  }
}

export const timeRecordService = new TimeRecordService();
