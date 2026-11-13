import { createHash } from 'crypto';
import { prisma } from '../config/database';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { appendTimeRecordAuditEvent, type TimeRecordActorContext } from './timeRecordAudit.service';

const FINAL_STATUSES = ['approved', 'released', 'locked', 'billed'] as const;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export class TimesheetPeriodService {
  private periodDates(year: number, month: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new ValidationError('Jahr oder Monat ist ungültig');
    }
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end };
  }

  private reportHash(records: any[]) {
    const canonical = records.map((record) => ({
      id: record.id,
      date: record.date.toISOString().slice(0, 10),
      clockIn: record.clockIn.toISOString(),
      clockOut: record.clockOut?.toISOString() || null,
      breakDuration: record.breakDuration,
      totalHours: record.totalHours == null ? null : String(record.totalHours),
      objectId: record.objectId || null,
      objectName: record.object?.name || null,
      employeeFirstName: record.employee?.firstName || null,
      employeeLastName: record.employee?.lastName || null,
      personnelNumber: record.employee?.personnelNumber || null,
    }));
    return hash(JSON.stringify(canonical));
  }

  private async loadReportRecords(db: any, tenantId: string, employeeId: string, year: number, month: number) {
    const { start, end } = this.periodDates(year, month);
    return db.timeRecord.findMany({
      where: { tenantId, employeeId, date: { gte: start, lt: end }, status: { not: 'voided' } },
      include: {
        object: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true, personnelNumber: true } },
      },
      orderBy: [{ date: 'asc' }, { clockIn: 'asc' }, { id: 'asc' }],
    });
  }

  async list(tenantId: string, employeeId?: string) {
    return prisma.timesheetPeriod.findMany({
      where: { tenantId, ...(employeeId ? { employeeId } : {}) },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, personnelNumber: true } },
        closedBy: { select: { firstName: true, lastName: true } },
        signedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { employee: { lastName: 'asc' } }],
    });
  }

  async close(tenantId: string, employeeId: string, year: number, month: number, userId: string, actor: TimeRecordActorContext) {
    const { start } = this.periodDates(year, month);
    const now = new Date();
    const requestedMonth = year * 12 + month;
    const currentMonth = now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
    if (requestedMonth >= currentMonth) throw new ValidationError('Ein Monatsabschluss ist erst nach Ende des Monats möglich');

    const employee = await prisma.employee.findFirst({ where: { id: employeeId, tenantId, deletedAt: null }, select: { id: true } });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    return prisma.$transaction(async (tx: any) => {
      const existing = await tx.timesheetPeriod.findUnique({ where: { tenantId_employeeId_year_month: { tenantId, employeeId, year, month } } });
      if (existing) throw new ConflictError('Dieser Mitarbeiter-Monat wurde bereits abgeschlossen');

      const records = await this.loadReportRecords(tx, tenantId, employeeId, year, month);
      if (records.length === 0) throw new ValidationError('Für diesen Mitarbeiter und Monat gibt es keine abzuschließenden Zeiteinträge');
      const incomplete = records.filter((record: any) => !FINAL_STATUSES.includes(record.status) || !record.clockOut || record.totalHours == null);
      if (incomplete.length > 0) {
        throw new ConflictError(`${incomplete.length} Zeiteintrag(e) sind noch offen oder nicht freigegeben. Erst alle Zeiten prüfen und freigeben.`);
      }

      const reportHash = this.reportHash(records);
      const closedAt = new Date();
      const period = await tx.timesheetPeriod.create({
        data: { tenantId, employeeId, year, month, status: 'closed', reportHash, closedById: userId, closedAt },
      });
      for (const record of records) {
        const nextStatus = record.status === 'billed' ? 'billed' : 'locked';
        const updated = await tx.timeRecord.update({
          where: { id: record.id },
          data: {
            status: nextStatus,
            isLocked: true,
            lockedById: record.lockedById || userId,
            lockedAt: record.lockedAt || closedAt,
            lockReason: `Monatsabschluss ${year}-${String(month).padStart(2, '0')}`,
          },
        });
        await appendTimeRecordAuditEvent(tx, updated, actor, {
          action: 'timesheet_closed', fieldChanged: 'timesheetPeriod', oldValue: record.status,
          newValue: { status: nextStatus, periodId: period.id, year, month },
          comment: `Monatsabschluss ${year}-${String(month).padStart(2, '0')}`,
        });
      }
      return tx.timesheetPeriod.findUnique({
        where: { id: period.id },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, personnelNumber: true } },
          closedBy: { select: { firstName: true, lastName: true } },
          signedBy: { select: { firstName: true, lastName: true } },
        },
      });
    });
  }

  async sign(tenantId: string, employeeId: string, periodId: string, userId: string, signatureData: unknown, actor: TimeRecordActorContext) {
    if (typeof signatureData !== 'string' || signatureData.length > 300_000) throw new ValidationError('Die Signatur ist ungültig oder zu groß');
    const match = signatureData.match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) throw new ValidationError('Bitte eine handschriftliche PNG-Signatur eintragen');
    const png = Buffer.from(match[1], 'base64');
    if (png.length < 100 || png.length > 220_000 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
      throw new ValidationError('Die Signaturdatei ist ungültig');
    }

    return prisma.$transaction(async (tx: any) => {
      const period = await tx.timesheetPeriod.findFirst({ where: { id: periodId, tenantId, employeeId } });
      if (!period) throw new NotFoundError('Monatsabschluss');
      if (period.status !== 'closed') throw new ConflictError('Dieser Monatsabschluss wurde bereits digital unterschrieben');

      const records = await this.loadReportRecords(tx, tenantId, employeeId, period.year, period.month);
      if (!records.length || records.some((record: any) => !FINAL_STATUSES.includes(record.status) || !record.clockOut || record.totalHours == null)) {
        throw new ConflictError('Der abgeschlossene Zeitraum hat sich geändert und kann nicht unterschrieben werden. Bitte den Monatsabschluss prüfen.');
      }
      const currentHash = this.reportHash(records);
      if (currentHash !== period.reportHash) throw new ConflictError('Die Zeiterfassungsdaten stimmen nicht mehr mit dem abgeschlossenen Stundenzettel überein');

      const signedAt = new Date();
      const signatureHash = hash(`${period.reportHash}\n${signedAt.toISOString()}\n${hash(signatureData)}`);
      const updated = await tx.timesheetPeriod.update({
        where: { id: period.id },
        data: { status: 'signed', signatureData, signatureHash, signedById: userId, signedAt },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, personnelNumber: true } },
          closedBy: { select: { firstName: true, lastName: true } },
          signedBy: { select: { firstName: true, lastName: true } },
        },
      });
      for (const record of records) {
        await appendTimeRecordAuditEvent(tx, record, actor, {
          action: 'timesheet_signed', fieldChanged: 'timesheetSignature',
          newValue: { periodId: period.id, signatureHash, signedAt: signedAt.toISOString() },
          comment: `Mitarbeiter hat den Stundenzettel ${period.year}-${String(period.month).padStart(2, '0')} digital unterschrieben`,
        });
      }
      return updated;
    });
  }
}

export const timesheetPeriodService = new TimesheetPeriodService();
