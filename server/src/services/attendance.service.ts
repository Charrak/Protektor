import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { assertTimesheetPeriodOpen } from './timesheetPeriodLock.service';
import { NotFoundError, ConflictError } from '../middleware/errorHandler';

export class AttendanceService {
  async list(query: {
    employeeId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { employeeId, date, startDate, endDate, status, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (employeeId) where.employeeId = employeeId;
    if (date) where.date = new Date(date);
    if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      prisma.timeRecord.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, personnelNumber: true } },
          deployment: { select: { id: true, objectId: true } },
        },
        orderBy: [{ date: 'desc' }, { clockIn: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.timeRecord.count({ where }),
    ]);

    return {
      records: records.map((r: any) => ({
        id: r.id,
        employeeId: r.employeeId,
        employee: {
          id: r.employee.id,
          firstName: r.employee.firstName,
          lastName: r.employee.lastName,
          personnelNumber: r.employee.personnelNumber,
        },
        date: r.date,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        breakDuration: r.breakDuration,
        regularHours: r.regularHours,
        nightHours: r.nightHours,
        sundayHours: r.sundayHours,
        holidayHours: r.holidayHours,
        overtimeHours: r.overtimeHours,
        totalHours: r.totalHours,
        status: r.status,
        deploymentId: r.deploymentId,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async clockIn(employeeId: string, deploymentId?: string) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null, status: 'active' } });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    // Prüfen ob bereits eine offene Zeiterfassung existiert
    const existingOpen = await prisma.timeRecord.findFirst({
      where: { employeeId, clockOut: null },
    });

    if (existingOpen) {
      throw new ConflictError('Es existiert bereits eine offene Zeiterfassung. Bitte zuerst ausstempeln.');
    }

    const now = new Date();
    await assertTimesheetPeriodOpen(employee.tenantId, { employeeId, date: now });
    const record = await prisma.timeRecord.create({
      data: {
        tenantId: employee.tenantId,
        employeeId,
        deploymentId,
        date: now,
        clockIn: now,
        status: 'open',
      },
    });

    logger.info(`Arbeitsbeginn: ${employee.firstName} ${employee.lastName}`);
    return record;
  }

  async clockOut(recordId: string) {
    const record = await prisma.timeRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(record.tenantId, record);
    if (record.clockOut) throw new ConflictError('Zeiterfassung bereits abgeschlossen');

    const clockOut = new Date();
    const workDuration = (clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
    const breakHours = record.breakDuration / 60;
    const totalHours = Math.max(0, workDuration - breakHours);

    const updated = await prisma.timeRecord.update({
      where: { id: recordId },
      data: {
        clockOut,
        totalHours,
        status: 'completed',
      },
    });

    logger.info(`Arbeitsende: Record ${recordId}, ${totalHours.toFixed(2)} Stunden`);
    return updated;
  }

  async approve(recordId: string, userId: string) {
    const existing = await prisma.timeRecord.findUnique({ where: { id: recordId } });
    if (!existing) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(existing.tenantId, existing);
    const record = await prisma.timeRecord.update({
      where: { id: recordId },
      data: {
        status: 'approved',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    logger.info(`Zeiterfassung genehmigt: Record ${recordId} von User ${userId}`);
    return record;
  }

  async correct(recordId: string, corrections: any, userId: string) {
    const existing = await prisma.timeRecord.findUnique({ where: { id: recordId } });
    if (!existing) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(existing.tenantId, existing);

    const record = await prisma.timeRecord.update({
      where: { id: recordId },
      data: {
        ...(corrections.clockIn !== undefined && { clockIn: new Date(corrections.clockIn) }),
        ...(corrections.clockOut !== undefined && { clockOut: corrections.clockOut ? new Date(corrections.clockOut) : null }),
        ...(corrections.breakDuration !== undefined && { breakDuration: corrections.breakDuration }),
        ...(corrections.totalHours !== undefined && { totalHours: corrections.totalHours }),
        ...(corrections.notes !== undefined && { correctionReason: corrections.notes }),
        correctedById: userId,
        status: 'open', // Muss erneut genehmigt werden
      },
    });

    logger.info(`Zeiterfassung korrigiert: Record ${recordId} von User ${userId}`);
    return record;
  }
}

export const attendanceService = new AttendanceService();
