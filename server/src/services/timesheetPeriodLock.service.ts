import { prisma } from '../config/database';
import { ConflictError } from '../middleware/errorHandler';

export async function assertTimesheetPeriodOpen(tenantId: string, record: { employeeId: string; date: Date }) {
  const year = record.date.getUTCFullYear();
  const month = record.date.getUTCMonth() + 1;
  if (!Number.isInteger(year) || !Number.isInteger(month)) throw new ConflictError('Ungültiges Datum für Zeiterfassung');
  const period = await prisma.timesheetPeriod.findFirst({
    where: { tenantId, employeeId: record.employeeId, year, month },
    select: { id: true },
  });
  if (period) throw new ConflictError('Dieser Monat wurde endgültig abgeschlossen. Änderungen sind in der Anwendung gesperrt.');
}
