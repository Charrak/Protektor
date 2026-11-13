import { Router } from 'express';
import { timeRecordService } from '../services/timeRecord.service';
import { appendTimeRecordAuditEvent, actorFromRequestUser } from '../services/timeRecordAudit.service';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { timesheetPeriodService } from '../services/timesheetPeriod.service';
import { assertTimesheetPeriodOpen } from '../services/timesheetPeriodLock.service';
import PDFDocument = require('pdfkit');

const router = Router();
const actor = (req: any) => actorFromRequestUser(req.user, req.ip, req.get('user-agent'));
const isAdmin = (req: any) => ['administrator', 'admin'].includes(req.user?.roleSlug);
const isOwnOnly = (req: any) => !isAdmin(req) && req.user?.permissions.includes('attendance:view_own') && !req.user?.permissions.includes('attendance:view_all');
async function getOwnEmployeeId(req: any) {
  if (!isOwnOnly(req)) return undefined;
  const employee = await prisma.employee.findFirst({ where: { tenantId: req.user.tenantId, email: { equals: req.user.email, mode: 'insensitive' }, deletedAt: null }, select: { id: true } });
  if (!employee) throw new NotFoundError('Eigene Mitarbeiterzuordnung');
  return employee.id;
}
function plannedShiftHours(shift: { startTime: Date; endTime: Date; breakMinutes: number }) {
  const start = shift.startTime.getUTCHours() * 60 + shift.startTime.getUTCMinutes();
  const end = shift.endTime.getUTCHours() * 60 + shift.endTime.getUTCMinutes();
  const plannedMinutes = end >= start ? end - start : end + 1440 - start;
  return Math.max(0, plannedMinutes - (shift.breakMinutes || 0)) / 60;
}

function validateCoordinates(latitude: unknown, longitude: unknown, prefix: string) {
  if ((latitude == null) !== (longitude == null)) throw new ValidationError(`GPS-Koordinaten für ${prefix} müssen gemeinsam übermittelt werden`);
  if (latitude == null && longitude == null) return { latitude: undefined, longitude: undefined };
  const lat = Number(latitude); const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new ValidationError('Ungültige GPS-Koordinaten');
  return { latitude: lat, longitude: lng };
}

async function assertObjectAccess(req: any, objectId?: string | null, action: 'view' | 'edit' | 'approve' = 'view') {
  if (isAdmin(req) || (action === 'view' && req.user.permissions.includes('attendance:view_all'))) return;
  if (!objectId) throw new NotFoundError('Zeiterfassung');
  const access = await prisma.timeRecordAccess.findFirst({
    where: { tenantId: req.user.tenantId, userId: req.user.id, objectId },
  });
  if (!access || (action === 'edit' && !access.canEdit) || (action === 'approve' && !access.canApprove)) {
    throw new NotFoundError('Zeiterfassung');
  }
}

async function getAccessibleObjectIds(req: any) {
  if (isAdmin(req) || req.user.permissions.includes('attendance:view_all')) return undefined;
  const entries = await prisma.timeRecordAccess.findMany({
    where: { tenantId: req.user.tenantId, userId: req.user.id }, select: { objectId: true },
  });
  return entries.map((entry: any) => entry.objectId);
}

router.get('/timesheet-periods', authenticate, requirePermission('attendance:view_own', 'attendance:view_all', 'attendance:close_period'), async (req, res, next) => {
  try {
    const ownEmployeeId = await getOwnEmployeeId(req);
    const requestedEmployeeId = req.query.employeeId ? String(req.query.employeeId) : undefined;
    const canManage = req.user!.permissions.includes('attendance:close_period') || isAdmin(req);
    if (ownEmployeeId && requestedEmployeeId && requestedEmployeeId !== ownEmployeeId) throw new NotFoundError('Monatsabschluss');
    if (!ownEmployeeId && !canManage && !isAdmin(req) && !req.user!.permissions.includes('attendance:view_all')) throw new NotFoundError('Monatsabschlüsse');
    if (!ownEmployeeId && canManage && !isAdmin(req) && !req.user!.permissions.includes('attendance:view_all') && !requestedEmployeeId) {
      throw new ValidationError('Für die Abfrage eines Monatsabschlusses muss ein Mitarbeiter ausgewählt sein');
    }
    let periods = await timesheetPeriodService.list(req.user!.tenantId, ownEmployeeId || requestedEmployeeId);
    if (!ownEmployeeId && canManage && !isAdmin(req) && !req.user!.permissions.includes('attendance:view_all')) {
      const accessibleObjectIds = await getAccessibleObjectIds(req) || [];
      const visiblePeriods = [];
      for (const period of periods) {
        const start = new Date(Date.UTC(period.year, period.month - 1, 1));
        const end = new Date(Date.UTC(period.year, period.month, 1));
        const records = await prisma.timeRecord.findMany({
          where: { tenantId: req.user!.tenantId, employeeId: period.employeeId, date: { gte: start, lt: end }, status: { not: 'voided' } },
          select: { objectId: true },
        });
        if (!records.length || records.some((record: { objectId: string | null }) => !record.objectId || !accessibleObjectIds.includes(record.objectId))) continue;
        let canAccessAllRecords = true;
        for (const record of records) {
          try { await assertObjectAccess(req, record.objectId, 'approve'); }
          catch { canAccessAllRecords = false; break; }
        }
        if (canAccessAllRecords) visiblePeriods.push(period);
      }
      periods = visiblePeriods;
    }
    res.json({ periods });
  } catch (error) { next(error); }
});

router.post('/timesheet-periods/close', authenticate, requirePermission('attendance:close_period'), async (req, res, next) => {
  try {
    if (await getOwnEmployeeId(req)) throw new NotFoundError('Monatsabschluss');
    const { employeeId, year, month } = req.body || {};
    const numericYear = Number(year);
    const numericMonth = Number(month);
    if (!employeeId) throw new ValidationError('Mitarbeiter ist erforderlich');
    const { start, end } = (() => {
      if (!Number.isInteger(numericYear) || !Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) throw new ValidationError('Monat oder Jahr ist ungültig');
      return { start: new Date(Date.UTC(numericYear, numericMonth - 1, 1)), end: new Date(Date.UTC(numericYear, numericMonth, 1)) };
    })();
    const objectIds = await getAccessibleObjectIds(req);
    if (objectIds) {
      const records = await prisma.timeRecord.findMany({
        where: { tenantId: req.user!.tenantId, employeeId: String(employeeId), date: { gte: start, lt: end }, status: { not: 'voided' } },
        select: { objectId: true },
      });
      if (records.some((record: { objectId: string | null }) => !record.objectId || !objectIds.includes(record.objectId))) throw new NotFoundError('Monatsabschluss');
      for (const record of records) await assertObjectAccess(req, record.objectId, 'approve');
    }
    const period = await timesheetPeriodService.close(req.user!.tenantId, String(employeeId), numericYear, numericMonth, req.user!.id, actor(req));
    res.status(201).json(period);
  } catch (error) { next(error); }
});

router.post('/timesheet-periods/:periodId/sign', authenticate, requirePermission('attendance:view_own'), async (req, res, next) => {
  try {
    const employeeId = await getOwnEmployeeId(req);
    if (!employeeId) throw new NotFoundError('Eigene Mitarbeiterzuordnung');
    const period = await timesheetPeriodService.sign(req.user!.tenantId, employeeId, req.params.periodId as string, req.user!.id, req.body?.signatureData, actor(req));
    res.json(period);
  } catch (error) { next(error); }
});

router.get('/summary', authenticate, requirePermission('attendance:view'), async (req, res, next) => {
  try {
    const ownEmployeeId = await getOwnEmployeeId(req);
    const objectIds = ownEmployeeId ? undefined : await getAccessibleObjectIds(req);
    const where: any = { tenantId: req.user!.tenantId };
    if (req.query.startDate || req.query.endDate) where.date = {
      ...(req.query.startDate ? { gte: new Date(String(req.query.startDate)) } : {}),
      ...(req.query.endDate ? { lte: new Date(String(req.query.endDate)) } : {}),
    };
    if (req.query.status) where.status = String(req.query.status);
    if (ownEmployeeId) where.employeeId = ownEmployeeId;
    else if (req.query.employeeId) where.employeeId = String(req.query.employeeId);
    if (req.query.objectId) where.objectId = String(req.query.objectId);
    if (objectIds) where.objectId = where.objectId ? { in: objectIds.filter((id: string) => id === where.objectId) } : { in: objectIds };
    const records = await prisma.timeRecord.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true } }, object: { select: { id: true, name: true } }, deployment: { select: { id: true, startTime: true, endTime: true, breakMinutes: true } } }, orderBy: [{ employeeId: 'asc' }, { clockIn: 'asc' }] });
    const byStatus: Record<string, number> = {};
    const employeeHours = new Map<string, { employeeId: string; employeeName: string; hours: number; plannedHours: number; varianceHours: number; records: number }>();
    const dailyHours = new Map<string, { employeeName: string; date: string; hours: number; breakMinutes: number; recordId: string }>();
    const countedDeployments = new Set<string>();
    const warnings: Array<{ recordId: string; employeeName: string; date: string; type: string; message: string }> = [];
    for (const record of records) {
      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      const end = record.clockOut || new Date();
      const grossHours = Math.max(0, (end.getTime() - record.clockIn.getTime()) / 3600000);
      const hours = Number(record.totalHours ?? Math.max(0, grossHours - (record.breakDuration || 0) / 60));
      const key = record.employeeId;
      const person = employeeHours.get(key) || { employeeId: key, employeeName: `${record.employee.firstName} ${record.employee.lastName}`, hours: 0, plannedHours: 0, varianceHours: 0, records: 0 };
      const plannedHours = record.deployment && !countedDeployments.has(record.deployment.id) ? plannedShiftHours(record.deployment) : null;
      if (record.deployment) countedDeployments.add(record.deployment.id);
      person.hours += hours;
      if (plannedHours != null) { person.plannedHours += plannedHours; person.varianceHours += hours - plannedHours; }
      person.records += 1;
      employeeHours.set(key, person);
      const dailyKey = `${record.employeeId}:${record.date.toISOString().slice(0, 10)}`;
      const daily = dailyHours.get(dailyKey) || { employeeName: person.employeeName, date: record.date.toISOString(), hours: 0, breakMinutes: 0, recordId: record.id };
      daily.hours += hours; daily.breakMinutes += record.breakDuration || 0; dailyHours.set(dailyKey, daily);
    }
    for (const daily of dailyHours.values()) {
      if (daily.hours > 9 && daily.breakMinutes < 45) warnings.push({ recordId: daily.recordId, employeeName: daily.employeeName, date: daily.date, type: 'break', message: 'Mehr als 9 Stunden Arbeit ohne insgesamt mindestens 45 Minuten Pause.' });
      else if (daily.hours > 6 && daily.breakMinutes < 30) warnings.push({ recordId: daily.recordId, employeeName: daily.employeeName, date: daily.date, type: 'break', message: 'Mehr als 6 Stunden Arbeit ohne insgesamt mindestens 30 Minuten Pause.' });
      if (daily.hours > 10) warnings.push({ recordId: daily.recordId, employeeName: daily.employeeName, date: daily.date, type: 'daily_limit', message: `Die tägliche Arbeitszeit beträgt ${daily.hours.toFixed(1)} Stunden und liegt über 10 Stunden.` });
    }
    const previousEnd = new Map<string, Date>();
    for (const record of records) {
      const previous = previousEnd.get(record.employeeId);
      if (previous && (record.clockIn.getTime() - previous.getTime()) < 11 * 3600000) {
        warnings.push({ recordId: record.id, employeeName: `${record.employee.firstName} ${record.employee.lastName}`, date: record.date.toISOString(), type: 'rest_period', message: 'Zwischen zwei Einsätzen liegen weniger als 11 Stunden Ruhezeit.' });
      }
      const end = record.clockOut || new Date();
      if (!previous || end > previous) previousEnd.set(record.employeeId, end);
    }
    res.json({ total: records.length, totalHours: [...employeeHours.values()].reduce((sum, employee) => sum + employee.hours, 0), byStatus, employeeHours: [...employeeHours.values()].map((employee) => ({ ...employee, hours: Math.round(employee.hours * 100) / 100, plannedHours: Math.round(employee.plannedHours * 100) / 100, varianceHours: Math.round(employee.varianceHours * 100) / 100 })).sort((a, b) => b.hours - a.hours), objects: [...new Map(records.filter((record: any) => record.object).map((record: any) => [record.object.id, { id: record.object.id, name: record.object.name }])).values()], warnings });
  } catch (error) { next(error); }
});

router.get('/', authenticate, requirePermission('attendance:view'), async (req, res, next) => {
  try {
    const { employeeId, date, startDate, endDate, status, page, limit, objectId } = req.query;
    const ownEmployeeId = await getOwnEmployeeId(req);
    const objectIds = ownEmployeeId ? undefined : await getAccessibleObjectIds(req);
    const result = await timeRecordService.listAll(req.user!.tenantId, {
      employeeId: ownEmployeeId || employeeId as string,
      date: date ? new Date(date as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status as string,
      objectId: objectId as string,
      objectIds,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.get('/employee/:employeeId', authenticate, requirePermission('attendance:view'), async (req, res, next) => {
  try {
    const { dateFrom, dateTo, status, objectId } = req.query;
    const ownEmployeeId = await getOwnEmployeeId(req);
    if (ownEmployeeId && ownEmployeeId !== req.params.employeeId) throw new NotFoundError('Zeiterfassung');
    if (!ownEmployeeId) await assertObjectAccess(req, objectId as string | undefined);
    const records = await timeRecordService.listByEmployee(req.user!.tenantId, ownEmployeeId || req.params.employeeId as string, {
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      status: status as string,
      objectId: objectId as string,
    });
    res.json(records);
  } catch (error) { next(error); }
});

router.get('/access', authenticate, requirePermission('attendance:access_manage'), async (req, res, next) => {
  try {
    const entries = await prisma.timeRecordAccess.findMany({
      where: { tenantId: req.user!.tenantId, ...(req.query.userId ? { userId: String(req.query.userId) } : {}), ...(req.query.objectId ? { objectId: String(req.query.objectId) } : {}) },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: { select: { slug: true, name: true } } } }, object: { select: { id: true, name: true, objectNumber: true } } },
      orderBy: [{ objectId: 'asc' }, { userId: 'asc' }],
    });
    res.json(entries);
  } catch (error) { next(error); }
});

router.put('/access', authenticate, requirePermission('attendance:access_manage'), async (req, res, next) => {
  try {
    const { userId, objectId, canEdit, canApprove } = req.body || {};
    if (!userId || !objectId || typeof canEdit !== 'boolean' || typeof canApprove !== 'boolean') throw new ValidationError('Benutzer, Objekt sowie Bearbeiten- und Freigaberechte sind erforderlich');
    const [user, object] = await Promise.all([
      prisma.user.findFirst({ where: { id: userId, tenantId: req.user!.tenantId, deletedAt: null }, select: { id: true } }),
      prisma.sMSObject.findFirst({ where: { id: objectId, tenantId: req.user!.tenantId }, select: { id: true } }),
    ]);
    if (!user || !object) throw new NotFoundError('Benutzer oder Objekt');
    const entry = await prisma.timeRecordAccess.upsert({
      where: { tenantId_userId_objectId: { tenantId: req.user!.tenantId, userId, objectId } },
      create: { tenantId: req.user!.tenantId, userId, objectId, canEdit, canApprove },
      update: { canEdit, canApprove },
    });
    res.json(entry);
  } catch (error) { next(error); }
});

router.delete('/access/:userId/:objectId', authenticate, requirePermission('attendance:access_manage'), async (req, res, next) => {
  try {
    await prisma.timeRecordAccess.deleteMany({ where: { tenantId: req.user!.tenantId, userId: req.params.userId as string, objectId: req.params.objectId as string } });
    res.status(204).send();
  } catch (error) { next(error); }
});

router.post('/:id/correction-request', authenticate, requirePermission('attendance:request_correction'), async (req, res, next) => {
  try {
    const record = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId }, include: { employee: { select: { email: true } } } });
    if (!record || !record.employee.email || record.employee.email.toLowerCase() !== req.user!.email.toLowerCase()) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, record);
    if (record.isLocked || ['released', 'billed', 'locked', 'voided'].includes(record.status)) throw new ConflictError('Für diese gesperrte Zeit kann kein Korrekturantrag gestellt werden');
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    const requestedChanges = Array.isArray(req.body?.changes) ? req.body.changes : [];
    if (comment.length < 10 || requestedChanges.length === 0) throw new ValidationError('Bitte mindestens eine Änderung und einen Kommentar mit mindestens 10 Zeichen angeben');
    const allowed = ['clockIn', 'clockOut', 'breakDuration', 'notes'];
    if (requestedChanges.length > 4 || requestedChanges.some((change: any) => !allowed.includes(change.field)) || new Set(requestedChanges.map((change: any) => change.field)).size !== requestedChanges.length) throw new ValidationError('Ungültige oder doppelte Korrekturfelder');
    const reasonCategories = ['forgot_clock_out', 'forgot_clock_in', 'technical_issue', 'incorrect_punch', 'other'];
    const reasonCategory = reasonCategories.includes(req.body.reasonCategory) ? req.body.reasonCategory : 'other';
    const existing = await prisma.timeCorrection.findFirst({ where: { tenantId: req.user!.tenantId, timeRecordId: record.id, requestStatus: 'pending' } });
    if (existing) throw new ConflictError('Für diese Zeiterfassung liegt bereits ein offener Korrekturantrag vor');
    const request = await prisma.$transaction(async (tx: any) => {
      const correction = await tx.timeCorrection.create({ data: {
        tenantId: req.user!.tenantId, timeRecordId: record.id, correctedById: req.user!.id,
        fieldChanged: requestedChanges.map((change: any) => change.field).join(','), oldValue: '',
        newValue: 'PENDING', reason: comment, reasonCategory,
        proposedValues: requestedChanges, requestStatus: 'pending',
      } });
      await appendTimeRecordAuditEvent(tx, record, actor(req), { action: 'correction_requested', fieldChanged: correction.fieldChanged, oldValue: null, newValue: requestedChanges, reasonCategory: correction.reasonCategory, comment });
      return correction;
    });
    res.status(201).json(request);
  } catch (error) { next(error); }
});

router.get('/:id/history', authenticate, requirePermission('attendance:audit_log', 'attendance:view_own'), async (req, res, next) => {
  try {
    const record = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!record) throw new NotFoundError('Zeiterfassung');
    const ownEmployeeId = await getOwnEmployeeId(req);
    if (ownEmployeeId && record.employeeId !== ownEmployeeId) throw new NotFoundError('Zeiterfassung');
    if (!ownEmployeeId) await assertObjectAccess(req, record.objectId);
    const events = await prisma.timeRecordAuditEvent.findMany({
      where: { tenantId: req.user!.tenantId, timeRecordId: record.id }, orderBy: { createdAt: 'desc' },
    });
    res.json(events);
  } catch (error) { next(error); }
});

router.get('/correction-requests', authenticate, requirePermission('attendance:edit'), async (req, res, next) => {
  try {
    const objectIds = await getAccessibleObjectIds(req);
    const where: any = { tenantId: req.user!.tenantId, requestStatus: req.query.status ? String(req.query.status) : 'pending', timeRecord: objectIds ? { objectId: { in: objectIds } } : undefined };
    const requests = await prisma.timeCorrection.findMany({ where, include: { timeRecord: { include: { employee: { select: { id: true, firstName: true, lastName: true } }, object: { select: { id: true, name: true } } } }, correctedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(requests);
  } catch (error) { next(error); }
});

router.put('/:id/correction-requests/:correctionId', authenticate, requirePermission('attendance:edit'), async (req, res, next) => {
  try {
    const decisionComment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    if (decisionComment.length < 10) throw new ValidationError('Der Entscheidungskommentar muss mindestens 10 Zeichen lang sein');
    const request = await prisma.timeCorrection.findFirst({ where: { id: req.params.correctionId, tenantId: req.user!.tenantId, timeRecordId: req.params.id, requestStatus: 'pending' }, include: { timeRecord: true } });
    if (!request) throw new NotFoundError('Offener Korrekturantrag');
    await assertTimesheetPeriodOpen(req.user!.tenantId, request.timeRecord);
    await assertObjectAccess(req, request.timeRecord.objectId, 'approve');
    if (req.body?.approve === true) {
      const changes = Array.isArray(request.proposedValues) ? request.proposedValues as any : [];
      await timeRecordService.correct(req.user!.tenantId, request.timeRecordId, req.user!.id, {
        changes, reason: `Antrag: ${request.reason}\nEntscheidung: ${decisionComment}`, reasonCategory: (request.reasonCategory || 'other') as any,
      }, actor(req));
    }
    const updated = await prisma.$transaction(async (tx: any) => {
      const result = await tx.timeCorrection.update({ where: { id: request.id }, data: {
        requestStatus: req.body?.approve === true ? 'approved' : 'rejected', approvedById: req.user!.id,
        approvedAt: new Date(), resolutionComment: decisionComment,
      } });
      await appendTimeRecordAuditEvent(tx, request.timeRecord, actor(req), {
        action: req.body?.approve === true ? 'correction_approved' : 'correction_rejected',
        fieldChanged: request.fieldChanged, oldValue: 'pending', newValue: result.requestStatus,
        reasonCategory: request.reasonCategory || undefined, comment: decisionComment,
      });
      return result;
    });
    res.json(updated);
  } catch (error) { next(error); }
});

router.get('/export/hours', authenticate, requirePermission('attendance:export'), async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    if (!dateFrom || !dateTo) throw new ValidationError('Bitte einen Zeitraum angeben');
    const where: any = { tenantId: req.user!.tenantId, date: { gte: new Date(String(dateFrom)), lte: new Date(String(dateTo)) }, status: { in: ['approved', 'released', 'locked', 'billed'] } };
    if (req.query.employeeId) where.employeeId = String(req.query.employeeId);
    if (req.query.objectId) where.objectId = String(req.query.objectId);
    const objectIds = await getAccessibleObjectIds(req);
    if (objectIds) where.objectId = { in: objectIds.filter((id: string) => !req.query.objectId || id === String(req.query.objectId)) };
    const records = await prisma.timeRecord.findMany({ where, include: { employee: { select: { personnelNumber: true, firstName: true, lastName: true } }, object: { select: { objectNumber: true, name: true } } }, orderBy: [{ date: 'asc' }, { clockIn: 'asc' }] });
    const grouped = new Map<string, { name: string; hours: number; records: number }>();
    for (const record of records) {
      const key = req.query.groupBy === 'object' ? (record.objectId || 'none') : record.employeeId;
      const name = req.query.groupBy === 'object' ? (record.object?.name || 'Kein Objekt') : `${record.employee.personnelNumber} · ${record.employee.firstName} ${record.employee.lastName}`;
      const current = grouped.get(key) || { name, hours: 0, records: 0 };
      const hours = Number(record.totalHours ?? (record.clockOut ? Math.max(0, (record.clockOut.getTime() - record.clockIn.getTime()) / 3600000 - (record.breakDuration || 0) / 60) : 0));
      current.hours += hours; current.records += 1; grouped.set(key, current);
    }
    const rows = [...grouped.values()].sort((a, b) => b.hours - a.hours);
    if (req.query.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', 'attachment; filename="stundenexport.pdf"');
      const pdf = new PDFDocument({ size: 'A4', margin: 40 }); pdf.pipe(res);
      pdf.fontSize(16).text(`Stundenexport nach ${req.query.groupBy === 'object' ? 'Objekt' : 'Mitarbeiter'}`);
      pdf.fontSize(9).text(`Zeitraum ${new Date(String(dateFrom)).toLocaleDateString('de-DE')} – ${new Date(String(dateTo)).toLocaleDateString('de-DE')} · ${records.length} Zeiteinträge`);
      pdf.moveDown(); rows.forEach(row => pdf.fontSize(10).text(`${row.name} — ${row.hours.toFixed(2)} Stunden (${row.records} Einträge)`)); pdf.end(); return;
    }
    const esc = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
    res.type('text/csv; charset=utf-8').attachment(`stundenexport-${req.query.groupBy === 'object' ? 'objekt' : 'mitarbeiter'}.csv`).send('\uFEFF' + ['Gruppe;Stunden;Einträge', ...rows.map(row => [row.name, row.hours.toFixed(2), row.records].map(esc).join(';'))].join('\r\n'));
  } catch (error) { next(error); }
});

router.get('/audit', authenticate, requirePermission('attendance:audit_log'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const where: any = { tenantId: req.user!.tenantId };
    if (req.query.employeeId) where.employeeId = String(req.query.employeeId);
    if (req.query.objectId) where.objectId = String(req.query.objectId);
    if (req.query.action) where.action = String(req.query.action);
    if (req.query.dateFrom || req.query.dateTo) {
      const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined;
      if (dateTo && String(req.query.dateTo).length <= 10) dateTo.setUTCHours(23, 59, 59, 999);
      where.createdAt = {
        ...(req.query.dateFrom ? { gte: new Date(String(req.query.dateFrom)) } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }
    if (req.query.search) where.OR = ['actorName', 'employeeName', 'objectName', 'comment', 'fieldChanged'].map((field) => ({ [field]: { contains: String(req.query.search), mode: 'insensitive' } }));
    const objectIds = await getAccessibleObjectIds(req);
    if (objectIds) where.objectId = { in: objectIds };
    const isExport = req.query.format === 'csv' || req.query.format === 'pdf';
    const sortDirection = req.query.sort === 'oldest' ? 'asc' : 'desc';
    const [events, total] = await Promise.all([
      prisma.timeRecordAuditEvent.findMany({ where, orderBy: { createdAt: sortDirection }, skip: isExport ? 0 : (page - 1) * limit, take: isExport ? 10000 : limit }),
      prisma.timeRecordAuditEvent.count({ where }),
    ]);
    if (req.query.format === 'csv') {
      const columns = ['createdAt','actorName','actorRole','action','employeeName','objectName','recordDate','fieldChanged','oldValue','newValue','reasonCategory','comment','ipAddress','deviceInfo'];
      const esc = (v: any) => `"${String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""')}"`;
      res.type('text/csv; charset=utf-8').attachment('zeiterfassung-protokoll.csv').send('\uFEFF' + [columns.join(';'), ...events.map((e: any) => columns.map((c) => esc(e[c])).join(';'))].join('\r\n'));
      return;
    }
    if (req.query.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="zeiterfassung-protokoll.pdf"');
      const pdf = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: true });
      pdf.pipe(res);
      pdf.fontSize(16).text('Änderungsprotokoll – Zeiterfassung');
      pdf.moveDown().fontSize(9).text(`Erstellt: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} · Treffer: ${total}${total > events.length ? ' (Exportgrenze: 10.000)' : ''}`);
      pdf.moveDown();
      events.forEach((event: any, index: number) => {
        if (index > 0 && index % 5 === 0) pdf.addPage();
        const timestamp = new Date(event.createdAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
        pdf.fontSize(10).fillColor('#1f2937').text(`${timestamp} · ${event.action} · ${event.actorName} (${event.actorRole})`);
        pdf.fontSize(8).fillColor('#374151').text(`Mitarbeiter: ${event.employeeName} · Objekt: ${event.objectName || '–'} · Datum: ${new Date(event.recordDate).toLocaleDateString('de-DE')}`);
        if (event.fieldChanged) pdf.text(`${event.fieldChanged}: ${JSON.stringify(event.oldValue)} → ${JSON.stringify(event.newValue)}`);
        if (event.reasonCategory || event.comment) pdf.text(`Grund: ${event.reasonCategory || '–'} · Kommentar: ${event.comment || '–'}`);
        pdf.moveDown(0.7);
      });
      pdf.end();
      return;
    }
    res.json({ events, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
});

router.post('/clock-in', authenticate, requirePermission('attendance:create'), async (req, res, next) => {
  try {
    const location = validateCoordinates(req.body.clockInLatitude, req.body.clockInLongitude, 'Einstempeln');
    const input = { ...req.body, clockIn: new Date(req.body.clockIn), clockOut: req.body.clockOut ? new Date(req.body.clockOut) : undefined, clockInLatitude: location.latitude, clockInLongitude: location.longitude };
    const ownEmployeeId = await getOwnEmployeeId(req);
    if (ownEmployeeId && input.employeeId !== ownEmployeeId) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, { employeeId: input.employeeId, date: input.clockIn });
    if (ownEmployeeId && (!['app', 'stamp'].includes(input.sourceType) || Math.abs(Date.now() - input.clockIn.getTime()) > 5 * 60 * 1000)) throw new ValidationError('Mitarbeiter können nur die eigene aktuelle Zeitstempelung starten.');
    if (!input.objectId && input.deploymentId) {
      const deployment = await prisma.deployment.findFirst({ where: { id: input.deploymentId, tenantId: req.user!.tenantId, employeeId: input.employeeId }, select: { objectId: true } });
      if (deployment) input.objectId = deployment.objectId;
    }
    if (!ownEmployeeId) await assertObjectAccess(req, input.objectId, 'edit');
    const record = await timeRecordService.clockIn(req.user!.tenantId, input, req.user!.id, actor(req));
    res.status(201).json(record);
  } catch (error) { next(error); }
});

router.post('/:id/clock-out', authenticate, requirePermission('attendance:create'), async (req, res, next) => {
  try {
    const existing = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!existing) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, existing);
    const ownEmployeeId = await getOwnEmployeeId(req);
    if (ownEmployeeId && existing.employeeId !== ownEmployeeId) throw new NotFoundError('Zeiterfassung');
    if (!ownEmployeeId) await assertObjectAccess(req, existing.objectId, 'edit');
    if (ownEmployeeId && (!req.body.clockOut || Math.abs(Date.now() - new Date(req.body.clockOut).getTime()) > 5 * 60 * 1000)) throw new ValidationError('Mitarbeiter können nur ihre aktuelle Ausstempelung durchführen.');
    const location = validateCoordinates(req.body.clockOutLatitude, req.body.clockOutLongitude, 'Ausstempeln');
    const record = await timeRecordService.clockOut(req.user!.tenantId, req.params.id as string, { ...req.body, ...{ clockOutLatitude: location.latitude, clockOutLongitude: location.longitude }, clockOut: new Date(req.body.clockOut) }, req.user!.id, actor(req));
    res.json(record);
  } catch (error) { next(error); }
});

router.post('/:id/break/start', authenticate, requirePermission('attendance:create'), async (req, res, next) => {
  try {
    const record = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!record) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, record);
    const ownEmployeeId = await getOwnEmployeeId(req);
    if (ownEmployeeId && record.employeeId !== ownEmployeeId) throw new NotFoundError('Zeiterfassung');
    if (!ownEmployeeId) await assertObjectAccess(req, record.objectId, 'edit');
    const result = await timeRecordService.startBreak(req.user!.tenantId, req.params.id as string, req.body, req.user!.id, actor(req));
    res.status(201).json(result);
  } catch (error) { next(error); }
});
router.post('/break/:breakId/end', authenticate, requirePermission('attendance:create'), async (req, res, next) => {
  try {
    const breakRecord = await prisma.break.findFirst({ where: { id: req.params.breakId, tenantId: req.user!.tenantId }, include: { timeRecord: true } });
    if (!breakRecord) throw new NotFoundError('Pause');
    await assertTimesheetPeriodOpen(req.user!.tenantId, breakRecord.timeRecord);
    const ownEmployeeId = await getOwnEmployeeId(req);
    if (ownEmployeeId && breakRecord.timeRecord.employeeId !== ownEmployeeId) throw new NotFoundError('Pause');
    if (!ownEmployeeId) await assertObjectAccess(req, breakRecord.timeRecord.objectId, 'edit');
    const result = await timeRecordService.endBreak(req.user!.tenantId, req.params.breakId as string, { ...req.body, breakEnd: req.body.breakEnd ? new Date(req.body.breakEnd) : undefined }, req.user!.id, actor(req));
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/:id/approve', authenticate, requirePermission('attendance:approve'), async (req, res, next) => {
  try {
    const existing = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!existing) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, existing);
    await assertObjectAccess(req, existing.objectId, 'approve');
    const result = await timeRecordService.approve(req.user!.tenantId, existing.id, req.user!.id, req.body, actor(req));
    res.json(result);
  } catch (error) { next(error); }
});
router.post('/:id/reject', authenticate, requirePermission('attendance:approve'), async (req, res, next) => {
  try {
    const existing = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!existing) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, existing);
    await assertObjectAccess(req, existing.objectId, 'approve');
    const result = await timeRecordService.reject(req.user!.tenantId, existing.id, req.user!.id, req.body, actor(req));
    res.json(result);
  } catch (error) { next(error); }
});
router.post('/:id/lock', authenticate, requirePermission('attendance:approve'), async (req, res, next) => {
  try {
    const existing = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!existing) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, existing);
    await assertObjectAccess(req, existing.objectId, 'approve');
    const result = await timeRecordService.lock(req.user!.tenantId, existing.id, req.user!.id, req.body, actor(req));
    res.json(result);
  } catch (error) { next(error); }
});
router.post('/:id/correct', authenticate, requirePermission('attendance:edit'), async (req, res, next) => {
  try {
    const existing = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!existing) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, existing);
    await assertObjectAccess(req, existing.objectId, 'edit');
    const result = await timeRecordService.correct(req.user!.tenantId, existing.id, req.user!.id, req.body, actor(req));
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/:id/release', authenticate, requirePermission('attendance:release'), async (req, res, next) => {
  try {
    const record = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!record) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, record);
    await assertObjectAccess(req, record.objectId, 'approve');
    if (record.status !== 'approved' && record.status !== 'corrected') throw new ConflictError('Nur geprüfte oder korrigierte Zeiten können freigegeben werden');
    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.timeRecord.update({ where: { id: record.id }, data: { status: 'released' } });
      await appendTimeRecordAuditEvent(tx, updated, actor(req), { action: 'released', fieldChanged: 'status', oldValue: record.status, newValue: 'released', comment: req.body?.comment });
      return updated;
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/:id/unlock', authenticate, requirePermission('attendance:unlock'), async (req, res, next) => {
  try {
    if (!isAdmin(req)) throw new NotFoundError('Zeiterfassung');
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    if (comment.length < 10) throw new ValidationError('Für die Entsperrung ist ein Kommentar mit mindestens 10 Zeichen erforderlich');
    const record = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!record) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, record);
    if (!record.isLocked && !['locked', 'released', 'billed'].includes(record.status)) throw new ConflictError('Diese Zeiterfassung ist nicht gesperrt');
    const result = await prisma.$transaction(async (tx: any) => {
      const reopeningBilled = record.status === 'billed';
      const updated = await tx.timeRecord.update({ where: { id: record.id }, data: {
        status: 'corrected', isLocked: false, lockedAt: null, lockedById: null, lockReason: null,
        ...(reopeningBilled ? { exportedForPayroll: false, exportedForCustomer: false, exportDate: null } : {}),
      } });
      await appendTimeRecordAuditEvent(tx, updated, actor(req), { action: 'unlocked', fieldChanged: 'status', oldValue: record.status, newValue: 'corrected', comment });
      await appendTimeRecordAuditEvent(tx, updated, actor(req), { action: 'unlocked', fieldChanged: 'isLocked', oldValue: record.isLocked, newValue: false, comment });
      await appendTimeRecordAuditEvent(tx, updated, actor(req), { action: 'unlocked', fieldChanged: 'lockReason', oldValue: record.lockReason, newValue: null, comment });
      if (reopeningBilled) {
        if (record.exportedForPayroll) await appendTimeRecordAuditEvent(tx, updated, actor(req), { action: 'unlocked', fieldChanged: 'exportedForPayroll', oldValue: true, newValue: false, comment });
        if (record.exportedForCustomer) await appendTimeRecordAuditEvent(tx, updated, actor(req), { action: 'unlocked', fieldChanged: 'exportedForCustomer', oldValue: true, newValue: false, comment });
      }
      return updated;
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/:id/void', authenticate, requirePermission('attendance:void'), async (req, res, next) => {
  try {
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    if (comment.length < 10) throw new ValidationError('Der Stornierungsgrund muss mindestens 10 Zeichen lang sein');
    const record = await prisma.timeRecord.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
    if (!record) throw new NotFoundError('Zeiterfassung');
    await assertTimesheetPeriodOpen(req.user!.tenantId, record);
    if ((record.isLocked || ['locked', 'released', 'billed'].includes(record.status)) && !isAdmin(req)) throw new NotFoundError('Zeiterfassung');
    await assertObjectAccess(req, record.objectId, 'approve');
    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.timeRecord.update({ where: { id: record.id }, data: { status: 'voided', voidedAt: new Date(), voidedById: req.user!.id, voidReason: comment } });
      await appendTimeRecordAuditEvent(tx, updated, actor(req), { action: 'voided', fieldChanged: 'status', oldValue: record.status, newValue: 'voided', comment });
      await appendTimeRecordAuditEvent(tx, updated, actor(req), { action: 'voided', fieldChanged: 'voidReason', oldValue: record.voidReason, newValue: comment, comment });
      return updated;
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/export/payroll', authenticate, requirePermission('billing:payroll'), async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.body;
    if (!dateFrom || !dateTo) throw new ValidationError('dateFrom und dateTo erforderlich');
    const records = await timeRecordService.exportForPayroll(req.user!.tenantId, new Date(dateFrom), new Date(dateTo), actor(req));
    res.json(records);
  } catch (error) { next(error); }
});
router.post('/export/customer', authenticate, requirePermission('billing:invoices'), async (req, res, next) => {
  try {
    const { customerId, dateFrom, dateTo } = req.body;
    if (!customerId || !dateFrom || !dateTo) throw new ValidationError('customerId, dateFrom und dateTo erforderlich');
    const records = await timeRecordService.exportForCustomer(req.user!.tenantId, customerId, new Date(dateFrom), new Date(dateTo), actor(req));
    res.json(records);
  } catch (error) { next(error); }
});

export default router;
