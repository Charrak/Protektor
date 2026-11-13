import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler';
import { appendTimeRecordAuditEvent, systemActor, type TimeRecordActorContext } from './timeRecordAudit.service';
import { assertTimesheetPeriodOpen } from './timesheetPeriodLock.service';

interface CreateTimeRecordInput {
  employeeId: string;
  deploymentId?: string;
  objectId?: string;
  postNumber?: string;
  activityType?: string;
  clockIn: Date;
  clockOut?: Date;
  clockInLatitude?: number;
  clockInLongitude?: number;
  clockOutLatitude?: number;
  clockOutLongitude?: number;
  breakDuration?: number;
  notes?: string;
  sourceType?: 'manual' | 'stamp' | 'app' | 'import';
  sourceDevice?: string;
}

interface ClockOutInput {
  clockOut: Date;
  clockOutLatitude?: number;
  clockOutLongitude?: number;
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
  comment?: string;
}

interface RejectInput {
  reason: string;
}

interface LockInput {
  reason: string;
}

interface CorrectInput {
  field?: 'clockIn' | 'clockOut' | 'breakDuration' | 'notes';
  value?: string | number | null;
  changes?: Array<{ field: 'clockIn' | 'clockOut' | 'breakDuration' | 'notes'; value: string | number | null }>;
  reason: string;
  reasonCategory?: 'forgot_clock_out' | 'forgot_clock_in' | 'technical_issue' | 'incorrect_punch' | 'other';
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
    objectId?: string;
    objectIds?: string[];
    page?: number;
    limit?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.objectIds) {
      where.objectId = { in: filters.objectId ? filters.objectIds.filter((id) => id === filters.objectId) : filters.objectIds };
    } else if (filters?.objectId) where.objectId = filters.objectId;
    
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
  async clockIn(tenantId: string, input: CreateTimeRecordInput, userId: string, actor: TimeRecordActorContext = systemActor()) {
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

    // Resolve the assigned deployment's object so records remain scoped to it.
    let recordObjectId = input.objectId;
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
        select: { id: true, objectId: true },
      });
      if (!deployment) throw new NotFoundError('Einsatz');
      if (recordObjectId && recordObjectId !== deployment.objectId) throw new ValidationError('Das gewählte Objekt stimmt nicht mit dem Einsatz überein');
      recordObjectId = deployment.objectId;
    }

    await assertTimesheetPeriodOpen(tenantId, { employeeId: input.employeeId, date: input.clockIn });
    const timeRecord = await prisma.$transaction(async (tx: any) => {
      const created = await tx.timeRecord.create({
        data: {
          tenantId,
          employeeId: input.employeeId,
          date: input.clockIn,
          deploymentId: input.deploymentId,
          objectId: recordObjectId,
          postNumber: input.postNumber,
          activityType: input.activityType,
          clockIn: input.clockIn,
          clockOut: input.clockOut,
          clockInLatitude: input.clockInLatitude,
          clockInLongitude: input.clockInLongitude,
          clockOutLatitude: input.clockOutLatitude,
          clockOutLongitude: input.clockOutLongitude,
          originalClockIn: input.clockIn,
          originalClockOut: input.clockOut,
          breakDuration: input.breakDuration || 0,
          originalBreakDuration: input.breakDuration || 0,
          notes: input.notes,
          sourceType: input.sourceType || 'web',
          sourceDevice: input.sourceDevice,
          status: input.clockOut ? 'completed' : 'open',
        },
      });
      await appendTimeRecordAuditEvent(tx, created, actor, {
        action: input.sourceType === 'manual' ? 'backfilled' : 'created',
        comment: input.notes,
        fieldChanged: 'clockIn',
        newValue: { clockIn: input.clockIn, clockOut: input.clockOut ?? null, breakDuration: input.breakDuration || 0, location: input.clockInLatitude != null && input.clockInLongitude != null ? { latitude: input.clockInLatitude, longitude: input.clockInLongitude } : null },
      });
      return created;
    });

    logger.info(`Clock-In: MA ${input.employeeId} um ${input.clockIn}`);
    return timeRecord;
  }

  /**
   * Clock-Out: Zeiterfassung beenden
   */
  async clockOut(tenantId: string, timeRecordId: string, input: ClockOutInput, userId: string, actor: TimeRecordActorContext = systemActor()) {
    const timeRecord = await prisma.timeRecord.findFirst({
      where: { id: timeRecordId, tenantId, clockOut: null, status: 'open' },
      include: { breaks: true },
    });
    
    if (!timeRecord) throw new NotFoundError('Offene Zeiterfassung');
    await assertTimesheetPeriodOpen(tenantId, timeRecord);

    // Berechne Zuschläge
    const surcharges = await this.calculateSurcharges(
      tenantId,
      timeRecord.employeeId,
      timeRecord.clockIn,
      input.clockOut,
      timeRecord.breaks.reduce((sum: number, b: any) => sum + (b.durationMinutes || 0), 0) + (input.breakDuration || 0)
    );

    const updated = await prisma.$transaction(async (tx: any) => {
      const result = await tx.timeRecord.update({
        where: { id: timeRecordId },
        data: {
          clockOut: input.clockOut,
          clockOutLatitude: input.clockOutLatitude,
          clockOutLongitude: input.clockOutLongitude,
          originalClockOut: timeRecord.originalClockOut ?? input.clockOut,
          originalBreakDuration: timeRecord.originalBreakDuration ?? (timeRecord.breakDuration + (input.breakDuration || 0)),
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
      await appendTimeRecordAuditEvent(tx, result, actor, {
        action: 'stamped_out',
        fieldChanged: 'clockOut',
        oldValue: null,
        newValue: { clockOut: input.clockOut, location: input.clockOutLatitude != null && input.clockOutLongitude != null ? { latitude: input.clockOutLatitude, longitude: input.clockOutLongitude } : null },
        comment: input.notes,
      });
      return result;
    });

    logger.info(`Clock-Out: MA ${timeRecord.employeeId} um ${input.clockOut}`);
    return updated;
  }

  /**
   * Start Break: Pause beginnen
   */
  async startBreak(tenantId: string, timeRecordId: string, input: StartBreakInput, userId: string, actor: TimeRecordActorContext = systemActor()) {
    const timeRecord = await prisma.timeRecord.findFirst({
      where: { id: timeRecordId, tenantId, clockOut: null, status: 'open' },
    });
    
    if (!timeRecord) throw new NotFoundError('Offene Zeiterfassung');
    await assertTimesheetPeriodOpen(tenantId, timeRecord);

    const break_ = await prisma.$transaction(async (tx: any) => {
      const created = await tx.break.create({ data: {
        tenantId, timeRecordId, breakStart: new Date(), breakType: input.breakType || 'unpaid', notes: input.notes,
      } });
      await appendTimeRecordAuditEvent(tx, timeRecord, actor, {
        action: 'break_started', fieldChanged: 'breakStart', oldValue: null, newValue: created.breakStart, comment: input.notes,
      });
      return created;
    });

    logger.info(`Break-Start: Zeitrecord ${timeRecordId}`);
    return break_;
  }

  /**
   * End Break: Pause beenden
   */
  async endBreak(tenantId: string, breakId: string, input: EndBreakInput, userId: string, actor: TimeRecordActorContext = systemActor()) {
    const break_ = await prisma.break.findFirst({
      where: { id: breakId, tenantId, breakEnd: null }, include: { timeRecord: true },
    });
    
    if (!break_) throw new NotFoundError('Aktive Pause');
    await assertTimesheetPeriodOpen(tenantId, break_.timeRecord);

    const breakEnd = input.breakEnd || new Date();
    const durationMinutes = Math.round(
      (breakEnd.getTime() - break_.breakStart.getTime()) / 1000 / 60
    );

    const updated = await prisma.$transaction(async (tx: any) => {
      const result = await tx.break.update({ where: { id: breakId }, data: {
        breakEnd, durationMinutes,
        notes: input.notes ? `${break_.notes || ''}\n${input.notes}`.trim() : break_.notes,
      } });
      await appendTimeRecordAuditEvent(tx, break_.timeRecord, actor, {
        action: 'break_ended', fieldChanged: 'breakEnd', oldValue: null, newValue: breakEnd,
        comment: input.notes || `Pausendauer ${durationMinutes} Minuten`,
      });
      return result;
    });

    logger.info(`Break-End: Break ${breakId}, Dauer: ${durationMinutes} min`);
    return updated;
  }

  /** Approve a completed time entry and atomically record the decision. */
  async approve(tenantId: string, timeRecordId: string, userId: string, input?: ApproveInput, actor: TimeRecordActorContext = systemActor()) {
    const timeRecord = await prisma.timeRecord.findFirst({ where: { id: timeRecordId, tenantId, status: { in: ['completed', 'corrected'] } } });
    if (!timeRecord) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(tenantId, timeRecord);
    return prisma.$transaction(async (tx: any) => {
      const updated = await tx.timeRecord.update({ where: { id: timeRecordId }, data: { status: 'approved', approvedById: userId, approvedAt: new Date() } });
      await appendTimeRecordAuditEvent(tx, updated, actor, { action: 'approved', fieldChanged: 'status', oldValue: timeRecord.status, newValue: 'approved', comment: input?.comment });
      return updated;
    });
  }

  /** Reject a time entry with a reason and preserve it for follow-up. */
  async reject(tenantId: string, timeRecordId: string, userId: string, input: RejectInput, actor: TimeRecordActorContext = systemActor()) {
    const timeRecord = await prisma.timeRecord.findFirst({ where: { id: timeRecordId, tenantId, status: { in: ['completed', 'corrected'] } } });
    if (!timeRecord) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(tenantId, timeRecord);
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (reason.length < 10) throw new ValidationError('Der Ablehnungsgrund muss mindestens 10 Zeichen lang sein');
    return prisma.$transaction(async (tx: any) => {
      const updated = await tx.timeRecord.update({ where: { id: timeRecordId }, data: { status: 'rejected', correctionReason: reason, correctedById: userId } });
      await appendTimeRecordAuditEvent(tx, updated, actor, { action: 'correction_rejected', fieldChanged: 'status', oldValue: timeRecord.status, newValue: 'rejected', comment: reason });
      return updated;
    });
  }

  /** Lock a time entry for payroll. */
  async lock(tenantId: string, timeRecordId: string, userId: string, input: LockInput, actor: TimeRecordActorContext = systemActor()) {
    const timeRecord = await prisma.timeRecord.findFirst({ where: { id: timeRecordId, tenantId, status: 'approved' } });
    if (!timeRecord) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(tenantId, timeRecord);
    return prisma.$transaction(async (tx: any) => {
      const updated = await tx.timeRecord.update({ where: { id: timeRecordId }, data: { status: 'locked', isLocked: true, lockedById: userId, lockedAt: new Date(), lockReason: input.reason } });
      await appendTimeRecordAuditEvent(tx, updated, actor, { action: 'locked', fieldChanged: 'status', oldValue: 'approved', newValue: 'locked', comment: input.reason });
      await appendTimeRecordAuditEvent(tx, updated, actor, { action: 'locked', fieldChanged: 'lockReason', oldValue: null, newValue: input.reason, comment: input.reason });
      return updated;
    });
  }

  /**
   * Correct: originale Werte bleiben erhalten, die Änderung und ihr Audit-Eintrag
   * werden gemeinsam gespeichert.
   */
  async correct(
    tenantId: string,
    timeRecordId: string,
    userId: string,
    input: CorrectInput,
    actor: TimeRecordActorContext = systemActor(),
  ) {
    const timeRecord = await prisma.timeRecord.findFirst({ where: { id: timeRecordId, tenantId } });
    if (!timeRecord) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(tenantId, timeRecord);
    if (timeRecord.isLocked || ['released', 'billed', 'locked', 'voided'].includes(timeRecord.status)) {
      throw new ConflictError('Diese Zeiterfassung ist gesperrt. Sie muss zuerst administrativ entsperrt werden.');
    }
    const changes = input.changes?.length ? input.changes : (input.field ? [{ field: input.field, value: input.value ?? null }] : []);
    if (!changes.length) throw new ValidationError('Mindestens eine Änderung ist erforderlich');
    const allowedFields = ['clockIn', 'clockOut', 'breakDuration', 'notes'];
    if (changes.some((change) => !allowedFields.includes(change.field)) || new Set(changes.map((change) => change.field)).size !== changes.length) {
      throw new ValidationError('Ungültige oder doppelte Korrekturfelder');
    }
    const comment = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (comment.length < 10) throw new ValidationError('Der Kommentar muss mindestens 10 Zeichen lang sein');
    const allowedCategories = ['forgot_clock_out', 'forgot_clock_in', 'technical_issue', 'incorrect_punch', 'other'];
    const reasonCategory = input.reasonCategory && allowedCategories.includes(input.reasonCategory) ? input.reasonCategory : 'other';
    const normalized: Array<{ field: string; value: Date | number | string | null }> = changes.map(({ field, value: rawValue }) => {
      let value: Date | number | string | null = rawValue;
      if (field === 'clockIn' || field === 'clockOut') {
        if (field === 'clockOut' && (rawValue === null || rawValue === '')) value = null;
        else {
          const parsed = new Date(String(rawValue));
          if (Number.isNaN(parsed.getTime())) throw new ValidationError('Ungültige Uhrzeit');
          value = parsed;
        }
      } else if (field === 'breakDuration') {
        const duration = Number(rawValue);
        if (!Number.isInteger(duration) || duration < 0 || duration > 1440) throw new ValidationError('Die Pausendauer muss zwischen 0 und 1440 Minuten liegen');
        value = duration;
      } else value = String(rawValue ?? '');
      return { field, value };
    });
    const next = Object.fromEntries(normalized.map((change) => [change.field, change.value])) as any;
    const nextClockIn = (next.clockIn ?? timeRecord.clockIn) as Date;
    const nextClockOut = (Object.prototype.hasOwnProperty.call(next, 'clockOut') ? next.clockOut : timeRecord.clockOut) as Date | null;
    const nextBreakDuration = (next.breakDuration ?? timeRecord.breakDuration) as number;
    await assertTimesheetPeriodOpen(tenantId, { employeeId: timeRecord.employeeId, date: nextClockIn });
    if (nextClockOut && nextClockOut <= nextClockIn) throw new ValidationError('Die Endzeit muss nach der Startzeit liegen');

    return prisma.$transaction(async (tx: any) => {
      const corrections = [];
      for (const change of normalized) {
        corrections.push(await tx.timeCorrection.create({
          data: {
            tenantId, timeRecordId, correctedById: userId, fieldChanged: change.field,
            oldValue: String((timeRecord as any)[change.field] ?? ''), newValue: String(change.value ?? ''),
            reason: comment, reasonCategory, requestStatus: 'applied',
          },
        }));
      }
      const updateData: any = {
        ...next,
        changedById: userId, changedAt: new Date(), changeReason: comment, correctionReason: comment,
        correctionReasonCategory: reasonCategory, correctedById: userId, correctedAt: new Date(), status: 'corrected',
        originalClockIn: timeRecord.originalClockIn ?? timeRecord.clockIn,
        originalClockOut: timeRecord.originalClockOut ?? timeRecord.clockOut,
        originalBreakDuration: timeRecord.originalBreakDuration ?? timeRecord.breakDuration,
      };
      if (Object.prototype.hasOwnProperty.call(next, 'clockIn')) updateData.date = nextClockIn;
      if (normalized.some((change) => ['clockIn', 'clockOut', 'breakDuration'].includes(change.field))) {
        if (nextClockOut) Object.assign(updateData, await this.calculateSurcharges(tenantId, timeRecord.employeeId, nextClockIn, nextClockOut, nextBreakDuration));
        else updateData.totalHours = null;
      }
      const updated = await tx.timeRecord.update({ where: { id: timeRecordId }, data: updateData });
      for (const change of normalized) {
        await appendTimeRecordAuditEvent(tx, updated, actor, {
          action: 'corrected', fieldChanged: change.field,
          oldValue: (timeRecord as any)[change.field], newValue: change.value,
          reasonCategory, comment,
        });
      }
      await appendTimeRecordAuditEvent(tx, updated, actor, {
        action: 'corrected', fieldChanged: 'status', oldValue: timeRecord.status, newValue: 'corrected', reasonCategory, comment,
      });
      return { timeRecord: updated, corrections };
    });
  }

  /**
   * Export für Lohnabrechnung
   */
  async exportForPayroll(tenantId: string, dateFrom: Date, dateTo: Date, actor: TimeRecordActorContext = systemActor()) {
    const records = await prisma.timeRecord.findMany({
      where: {
        tenantId,
        date: { gte: dateFrom, lte: dateTo },
        status: { in: ['approved', 'released', 'locked'] },
        exportedForPayroll: false,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, personnelNumber: true } },
        object: { select: { name: true, objectNumber: true } },
      },
      orderBy: [{ date: 'asc' }, { clockIn: 'asc' }],
    });

    const exportedAt = new Date();
    await prisma.$transaction(async (tx: any) => {
      for (const record of records) {
        const updated = await tx.timeRecord.update({ where: { id: record.id }, data: {
          exportedForPayroll: true, exportDate: exportedAt, status: 'billed', isLocked: true,
          lockedById: actor.userId || undefined, lockedAt: exportedAt, lockReason: 'Für die Lohnabrechnung exportiert',
        } });
        await appendTimeRecordAuditEvent(tx, updated, actor, {
          action: 'billed', fieldChanged: 'status', oldValue: record.status, newValue: 'billed',
          comment: 'Für die Lohnabrechnung exportiert',
        });
        await appendTimeRecordAuditEvent(tx, updated, actor, {
          action: 'billing_exported', fieldChanged: 'exportedForPayroll', oldValue: false, newValue: true,
          comment: 'Für die Lohnabrechnung exportiert',
        });
      }
    });

    logger.info(`Exported ${records.length} records for payroll`);
    return records;
  }

  /**
   * Export für Kundenabrechnung
   */
  async exportForCustomer(tenantId: string, customerId: string, dateFrom: Date, dateTo: Date, actor: TimeRecordActorContext = systemActor()) {
    const records = await prisma.timeRecord.findMany({
      where: {
        tenantId,
        date: { gte: dateFrom, lte: dateTo },
        status: { in: ['approved', 'released', 'locked'] },
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

    const exportedAt = new Date();
    await prisma.$transaction(async (tx: any) => {
      for (const record of records) {
        const updated = await tx.timeRecord.update({ where: { id: record.id }, data: { exportedForCustomer: true, exportDate: exportedAt } });
        await appendTimeRecordAuditEvent(tx, updated, actor, {
          action: 'billing_exported', fieldChanged: 'exportedForCustomer', oldValue: false, newValue: true,
          comment: `Für die Kundenabrechnung exportiert (Kunde ${customerId})`,
        });
      }
    });

    logger.info(`Exported ${records.length} records for customer ${customerId}`);
    return records;
  }

  // Split work by local Europe/Berlin minute so overnight shifts, Sundays,
  // holidays, and DST boundaries are classified from the actual shift interval.
  private async calculateSurcharges(
    tenantId: string,
    employeeId: string,
    clockIn: Date,
    clockOut: Date,
    breakMinutes: number,
  ) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundError('Mitarbeiter');
    const grossMinutes = Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 60000);
    const unpaidBreak = Math.min(Math.max(0, breakMinutes), grossMinutes);
    const totalHours = Math.round(Math.max(0, grossMinutes - unpaidBreak) / 60 * 100) / 100;
    const holidayStart = new Date(clockIn.getTime() - 24 * 60 * 60 * 1000);
    const holidayEnd = new Date(clockOut.getTime() + 24 * 60 * 60 * 1000);
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: holidayStart, lte: holidayEnd }, OR: [{ state: null }, { state: 'NW' }] },
      select: { date: true },
    });
    const holidayDays = new Set(holidays.map((holiday: any) => {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(holiday.date);
      const get = (type: string) => parts.find((part: any) => part.type === type)?.value || '';
      return `${get('year')}-${get('month')}-${get('day')}`;
    }));
    const localTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    let nightMinutes = 0;
    let sundayMinutes = 0;
    let holidayMinutes = 0;
    for (let timestamp = clockIn.getTime(); timestamp < clockOut.getTime();) {
      const duration = Math.min(60000, clockOut.getTime() - timestamp);
      const parts = localTime.formatToParts(new Date(timestamp + duration / 2));
      const part = (type: string) => parts.find((value) => value.type === type)?.value || '';
      const day = `${part('year')}-${part('month')}-${part('day')}`;
      const weekday = part('weekday');
      const hour = Number(part('hour'));
      const minutes = duration / 60000;
      // Priority keeps hour categories mutually exclusive for payroll totals.
      if (holidayDays.has(day)) holidayMinutes += minutes;
      else if (weekday === 'Sun') sundayMinutes += minutes;
      else if (hour >= 20 || hour < 6) nightMinutes += minutes;
      timestamp += duration;
    }

    // Exact break intervals are not available at clock-out, so allocate unpaid
    // breaks proportionally to premium categories. Regular hours are the paid
    // total minus the rounded premium categories below.
    const paidRatio = grossMinutes > 0 ? (grossMinutes - unpaidBreak) / grossMinutes : 0;
    nightMinutes *= paidRatio;
    sundayMinutes *= paidRatio;
    holidayMinutes *= paidRatio;
    const roundHours = (minutes: number) => Math.round(minutes / 60 * 100) / 100;
    const nightHours = roundHours(nightMinutes);
    const sundayHours = roundHours(sundayMinutes);
    const holidayHours = roundHours(holidayMinutes);
    const regularHours = Math.round(Math.max(0, totalHours - nightHours - sundayHours - holidayHours) * 100) / 100;
    const overtimeHours = Math.round(Math.max(0, totalHours - Number(employee.maxDailyHours ?? 10)) * 100) / 100;
    const hourlyRate = Number(employee.hourlyRateBase || 0);
    const nightSurchargePct = Number(employee.surchargeNight ?? 25) / 100;
    const sundaySurchargePct = Number(employee.surchargeSunday ?? 50) / 100;
    const holidaySurchargePct = Number(employee.surchargeHoliday ?? 100) / 100;
    const nightSurcharge = nightHours * hourlyRate * nightSurchargePct;
    const sundaySurcharge = sundayHours * hourlyRate * sundaySurchargePct;
    const holidaySurcharge = holidayHours * hourlyRate * holidaySurchargePct;
    return {
      regularHours, nightHours, sundayHours, holidayHours, overtimeHours, totalHours,
      nightSurcharge: Math.round(nightSurcharge * 100) / 100,
      sundaySurcharge: Math.round(sundaySurcharge * 100) / 100,
      holidaySurcharge: Math.round(holidaySurcharge * 100) / 100,
      totalSurcharge: Math.round((nightSurcharge + sundaySurcharge + holidaySurcharge) * 100) / 100,
    };
  }

}

export const timeRecordService = new TimeRecordService();
