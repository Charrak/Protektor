import { PrismaClient, TimeRecordStatus, TimeRecordSource } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { appendTimeRecordAuditEvent, type TimeRecordActorContext } from '../src/services/timeRecordAudit.service';

const prisma = new PrismaClient();
const DEMO_TENANT_CODE = 'DEMO-001';
const DEMO_PASSWORD = 'Mitarbeiter123!';

function assertTestDatabase() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL muss auf die isolierte Testdatenbank zeigen.');
  const url = new URL(rawUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!/(^|[_-])test$/i.test(database)) {
    throw new Error(`Demo-Zeiterfassungsdaten werden nur in *_test-Datenbanken angelegt; gefunden: ${database}`);
  }
}

function dayAt(daysAgo: number, hour = 0, minute = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function sameDay(daysAgo: number) {
  return dayAt(daysAgo);
}

async function ensureAuditEvent(
  record: any,
  actor: TimeRecordActorContext,
  event: { action: Parameters<typeof appendTimeRecordAuditEvent>[3]['action']; fieldChanged?: string; oldValue?: unknown; newValue?: unknown; comment?: string; reasonCategory?: string },
) {
  const exists = await prisma.timeRecordAuditEvent.findFirst({
    where: { timeRecordId: record.id, action: event.action, fieldChanged: event.fieldChanged ?? null },
    select: { id: true },
  });
  if (exists) return;
  await prisma.$transaction((tx) => appendTimeRecordAuditEvent(tx, record, actor, event));
}

async function main() {
  assertTestDatabase();

  const tenant = await prisma.tenant.findUnique({ where: { tenantId: DEMO_TENANT_CODE } });
  if (!tenant) throw new Error(`Demo-Mandant ${DEMO_TENANT_CODE} fehlt. Zuerst "npm run seed" ausführen.`);

  const demoAdmin = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId: tenant.id, username: 'demo' } },
    include: { role: true },
  });
  if (!demoAdmin) throw new Error('Demo-Benutzer "demo" fehlt. Zuerst "npm run seed" ausführen.');

  const employeeRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'employee' } },
  });
  const dispatcherRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'dispatcher' } },
  });

  const max = await prisma.employee.findUniqueOrThrow({
    where: { tenantId_personnelNumber: { tenantId: tenant.id, personnelNumber: 'MA001' } },
  });
  const anna = await prisma.employee.findUniqueOrThrow({
    where: { tenantId_personnelNumber: { tenantId: tenant.id, personnelNumber: 'MA002' } },
  });
  const thomas = await prisma.employee.findUniqueOrThrow({
    where: { tenantId_personnelNumber: { tenantId: tenant.id, personnelNumber: 'MA003' } },
  });
  const abc = await prisma.customer.findUniqueOrThrow({
    where: { tenantId_customerNumber: { tenantId: tenant.id, customerNumber: 'K001' } },
  });
  const xyz = await prisma.customer.findUniqueOrThrow({
    where: { tenantId_customerNumber: { tenantId: tenant.id, customerNumber: 'K002' } },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const maxUser = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'max' } },
    update: { email: max.email!, passwordHash, roleId: employeeRole.id, firstName: max.firstName, lastName: max.lastName, isActive: true },
    create: {
      tenantId: tenant.id, username: 'max', email: max.email!, passwordHash,
      firstName: max.firstName, lastName: max.lastName, roleId: employeeRole.id, isActive: true,
    },
  });
  const dispatcher = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'disponent' } },
    update: { email: 'disponent@demo.de', passwordHash, roleId: dispatcherRole.id, firstName: 'Diana', lastName: 'Disposition', isActive: true },
    create: {
      tenantId: tenant.id, username: 'disponent', email: 'disponent@demo.de', passwordHash,
      firstName: 'Diana', lastName: 'Disposition', roleId: dispatcherRole.id, isActive: true,
    },
  });

  const objectOne = await prisma.sMSObject.upsert({
    where: { tenantId_objectNumber: { tenantId: tenant.id, objectNumber: 'OBJ-DEMO-001' } },
    update: { customerId: abc.id, name: 'Logistikzentrum Nord', street: 'Hafenstraße 12', zipCode: '20457', city: 'Hamburg', isActive: true },
    create: {
      tenantId: tenant.id, customerId: abc.id, objectNumber: 'OBJ-DEMO-001',
      name: 'Logistikzentrum Nord', street: 'Hafenstraße 12', zipCode: '20457', city: 'Hamburg',
      description: 'Demoobjekt für Zeiterfassung, Schichtplanung und objektbezogene Rechte.',
      serviceType: 'objectProtection', isActive: true,
    },
  });
  const objectTwo = await prisma.sMSObject.upsert({
    where: { tenantId_objectNumber: { tenantId: tenant.id, objectNumber: 'OBJ-DEMO-002' } },
    update: { customerId: xyz.id, name: 'Büropark Süd', street: 'Parkallee 8', zipCode: '80339', city: 'München', isActive: true },
    create: {
      tenantId: tenant.id, customerId: xyz.id, objectNumber: 'OBJ-DEMO-002',
      name: 'Büropark Süd', street: 'Parkallee 8', zipCode: '80339', city: 'München',
      description: 'Zweites Demoobjekt zur Prüfung der Objektzugriffsbegrenzung.',
      serviceType: 'guardService', isActive: true,
    },
  });

  await prisma.timeRecordAccess.upsert({
    where: { tenantId_userId_objectId: { tenantId: tenant.id, userId: dispatcher.id, objectId: objectOne.id } },
    update: { canEdit: true, canApprove: true },
    create: { tenantId: tenant.id, userId: dispatcher.id, objectId: objectOne.id, canEdit: true, canApprove: true },
  });

  const employeeActor: TimeRecordActorContext = {
    userId: maxUser.id, userName: `${max.firstName} ${max.lastName}`, role: 'employee', deviceInfo: 'Demo seed',
  };
  const adminActor: TimeRecordActorContext = {
    userId: demoAdmin.id, userName: `${demoAdmin.firstName} ${demoAdmin.lastName}`, role: demoAdmin.role.slug, deviceInfo: 'Demo seed',
  };

  const specifications = [
    {
      id: 'demo-time-open-001', employee: max, object: objectOne, daysAgo: 0, startHour: 7, endHour: 15,
      status: 'open' as const, sourceType: 'app' as const, breakDuration: 0, totalHours: null,
      notes: 'Offener Demo-Einsatz – kann direkt ausgestempelt werden.',
    },
    {
      id: 'demo-time-pending-001', employee: max, object: objectOne, daysAgo: 1, startHour: 8, endHour: 16,
      status: 'completed' as const, sourceType: 'web' as const, breakDuration: 30, totalHours: 7.5,
      notes: 'Abgeschlossene Demo-Schicht mit offenem Korrekturantrag.',
    },
    {
      id: 'demo-time-corrected-001', employee: anna, object: objectOne, daysAgo: 2, startHour: 8, endHour: 16,
      status: 'corrected' as const, sourceType: 'manual' as const, breakDuration: 30, totalHours: 7.75,
      notes: 'Demo-Schicht mit bereits angewendeter Korrektur.',
    },
    {
      id: 'demo-time-approved-001', employee: thomas, object: objectTwo, daysAgo: 3, startHour: 8, endHour: 16,
      status: 'approved' as const, sourceType: 'terminal' as const, breakDuration: 30, totalHours: 7.5,
      notes: 'Genehmigte Demo-Schicht.',
    },
    {
      id: 'demo-time-rejected-001', employee: max, object: objectOne, daysAgo: 4, startHour: 9, endHour: 17,
      status: 'rejected' as const, sourceType: 'web' as const, breakDuration: 30, totalHours: 7.5,
      notes: 'Abgelehnte Demo-Schicht – Begründung in den Details.',
    },
    {
      id: 'demo-time-locked-001', employee: anna, object: objectTwo, daysAgo: 5, startHour: 7, endHour: 15,
      status: 'locked' as const, sourceType: 'manual' as const, breakDuration: 30, totalHours: 7.5,
      notes: 'Gesperrte Legacy-Demo-Schicht.',
    },
    {
      id: 'demo-time-released-001', employee: thomas, object: objectOne, daysAgo: 6, startHour: 22, endHour: 6,
      status: 'released' as const, sourceType: 'terminal' as const, breakDuration: 30, totalHours: 7.5,
      notes: 'Freigegebene Nachtschicht – geeignet für Zuschlags- und Ruhezeitansichten.',
    },
    {
      id: 'demo-time-billed-001', employee: max, object: objectTwo, daysAgo: 7, startHour: 8, endHour: 16,
      status: 'billed' as const, sourceType: 'import' as const, breakDuration: 30, totalHours: 7.5,
      notes: 'Abgerechnete Demo-Schicht.',
    },
    {
      id: 'demo-time-voided-001', employee: anna, object: objectOne, daysAgo: 8, startHour: 8, endHour: 16,
      status: 'voided' as const, sourceType: 'web' as const, breakDuration: 30, totalHours: 7.5,
      notes: 'Stornierte Demo-Schicht mit dokumentiertem Grund.',
    },
  ];

  const records: Record<string, any> = {};
  for (const spec of specifications) {
    const clockIn = spec.id === 'demo-time-open-001'
      ? new Date(Date.now() - 2 * 60 * 60 * 1000)
      : dayAt(spec.daysAgo, spec.startHour);
    let clockOut = spec.id === 'demo-time-open-001'
      ? null
      : dayAt(spec.daysAgo, spec.endHour, spec.status === 'corrected' ? 15 : 0);
    if (clockOut && clockOut <= clockIn) {
      clockOut = new Date(clockOut.getTime() + 24 * 60 * 60 * 1000);
    }
    const date = sameDay(spec.daysAgo);
    const deploymentId = `demo-deploy-${spec.id.replace('demo-time-', '')}`;
    const deployment = await prisma.deployment.upsert({
      where: { id: deploymentId },
      update: {
        tenantId: tenant.id, objectId: spec.object.id, employeeId: spec.employee.id, date,
        startTime: dayAt(0, spec.startHour), endTime: dayAt(0, spec.endHour), breakMinutes: spec.breakDuration,
        status: spec.status === 'open' ? 'confirmed' : 'completed', plannedById: demoAdmin.id,
        confirmedById: demoAdmin.id, confirmedAt: new Date(), notes: `Demo-Einsatz zu ${spec.id}`,
      },
      create: {
        id: deploymentId, tenantId: tenant.id, objectId: spec.object.id, employeeId: spec.employee.id,
        date, startTime: dayAt(0, spec.startHour), endTime: dayAt(0, spec.endHour),
        breakMinutes: spec.breakDuration, status: spec.status === 'open' ? 'confirmed' : 'completed',
        plannedById: demoAdmin.id, confirmedById: demoAdmin.id, confirmedAt: new Date(),
        notes: `Demo-Einsatz zu ${spec.id}`,
      },
    });

    const correctionFields = spec.status === 'corrected' ? {
      originalClockIn: dayAt(spec.daysAgo, spec.startHour),
      originalClockOut: dayAt(spec.daysAgo, spec.endHour),
      originalBreakDuration: spec.breakDuration,
      correctedAt: dayAt(spec.daysAgo, spec.endHour + 1),
      correctionReasonCategory: 'incorrect_punch',
      correctionReason: 'Demo-Korrektur mit erhaltenen Originalwerten.',
      correctedById: demoAdmin.id,
      changedById: demoAdmin.id,
      changedAt: dayAt(spec.daysAgo, spec.endHour + 1),
      changeReason: 'Demo-Korrektur mit erhaltenen Originalwerten.',
    } : {};
    const lifecycleFields = spec.status === 'approved' || spec.status === 'released' || spec.status === 'billed'
      ? { approvedById: demoAdmin.id, approvedAt: dayAt(spec.daysAgo, spec.endHour + 1) }
      : {};
    const lockFields = spec.status === 'locked' || spec.status === 'billed'
      ? { isLocked: true, lockedById: demoAdmin.id, lockedAt: dayAt(spec.daysAgo, spec.endHour + 1), lockReason: 'Demo-Abrechnungssperre' }
      : {};
    const recordData = {
      tenantId: tenant.id, employeeId: spec.employee.id, deploymentId: deployment.id,
      date, objectId: spec.object.id, postNumber: 'POST-DEMO-01', activityType: 'Objektschutz',
      clockIn, clockOut, breakDuration: spec.breakDuration, totalHours: spec.totalHours,
      regularHours: spec.totalHours, nightHours: spec.startHour >= 20 || spec.endHour <= 6 ? 7.5 : 0,
      sundayHours: 0, holidayHours: 0, overtimeHours: 0,
      status: spec.status as TimeRecordStatus, sourceType: spec.sourceType as TimeRecordSource,
      sourceDevice: spec.sourceType === 'terminal' ? 'Demo-Terminal' : 'Demo-Datensatz',
      originalClockIn: spec.id === 'demo-time-open-001' ? clockIn : dayAt(spec.daysAgo, spec.startHour),
      originalClockOut: spec.id === 'demo-time-open-001' ? null : dayAt(spec.daysAgo, spec.endHour),
      originalBreakDuration: spec.breakDuration,
      notes: spec.notes,
      ...(spec.status === 'rejected' ? { correctionReason: 'Bitte den Stempelzeitpunkt mit dem Einsatzbericht abgleichen.' } : {}),
      ...(spec.status === 'voided' ? { voidedAt: new Date(), voidedById: demoAdmin.id, voidReason: 'Demo-Stornierung: doppelter Eintrag.' } : {}),
      ...(spec.status === 'billed' ? { exportedForPayroll: true, exportDate: new Date() } : {}),
      ...correctionFields, ...lifecycleFields, ...lockFields,
    };
    records[spec.id] = await prisma.timeRecord.upsert({ where: { id: spec.id }, create: { id: spec.id, ...recordData }, update: {} });
  }

  const breakStart = dayAt(1, 12);
  await prisma.break.upsert({
    where: { id: 'demo-break-pending-001' },
    update: {},
    create: { id: 'demo-break-pending-001', tenantId: tenant.id, timeRecordId: 'demo-time-pending-001', breakStart, breakEnd: dayAt(1, 12, 30), durationMinutes: 30, breakType: 'unpaid', notes: 'Demo-Mittagspause' },
  });

  const pendingValues = [{ field: 'clockOut', value: dayAt(1, 16, 30).toISOString() }];
  await prisma.timeCorrection.upsert({
    where: { id: 'demo-correction-pending-001' },
    update: {},
    create: {
      id: 'demo-correction-pending-001', tenantId: tenant.id, timeRecordId: 'demo-time-pending-001', correctedById: maxUser.id,
      fieldChanged: 'clockOut', oldValue: '', newValue: 'PENDING',
      reason: 'Beim Ausstempeln wurde das Schichtende nicht gespeichert; bitte den Einsatzbericht prüfen.',
      reasonCategory: 'forgot_clock_out', proposedValues: pendingValues, requestStatus: 'pending',
    },
  });

  await prisma.timeCorrection.upsert({
    where: { id: 'demo-correction-applied-001' },
    update: {},
    create: {
      id: 'demo-correction-applied-001', tenantId: tenant.id, timeRecordId: 'demo-time-corrected-001', correctedById: demoAdmin.id,
      fieldChanged: 'clockOut', oldValue: dayAt(2, 16).toISOString(), newValue: dayAt(2, 16, 15).toISOString(),
      reason: 'Korrektur gemäß Einsatzbericht; Originalwerte bleiben erhalten.', reasonCategory: 'incorrect_punch', requestStatus: 'applied',
    },
  });

  const statusActions: Record<string, Parameters<typeof appendTimeRecordAuditEvent>[3]['action']> = {
    corrected: 'corrected', approved: 'approved', rejected: 'correction_rejected', locked: 'locked',
    released: 'released', billed: 'billed', voided: 'voided',
  };
  for (const spec of specifications) {
    const record = records[spec.id];
    const actor = spec.id === 'demo-time-pending-001' ? employeeActor : adminActor;
    await ensureAuditEvent(record, actor, {
      action: 'created', fieldChanged: 'clockIn', oldValue: null,
      newValue: { clockIn: record.clockIn, clockOut: record.clockOut, sourceType: record.sourceType },
      comment: 'Idempotenter Zeiterfassungs-Demodatensatz.',
    });
    const statusAction = statusActions[spec.status];
    if (statusAction) {
      await ensureAuditEvent(record, adminActor, {
        action: statusAction, fieldChanged: 'status', oldValue: 'completed', newValue: spec.status,
        reasonCategory: spec.status === 'corrected' ? 'incorrect_punch' : undefined,
        comment: `Demo-Vorgang im Status ${spec.status}.`,
      });
    }
  }
  await ensureAuditEvent(records['demo-time-pending-001'], employeeActor, {
    action: 'correction_requested', fieldChanged: 'clockOut', oldValue: null,
    newValue: pendingValues, reasonCategory: 'forgot_clock_out',
    comment: 'Offener Demo-Korrekturantrag zur Prüfung.',
  });

  console.log('✅ Zeiterfassungs-Demodaten idempotent angelegt:');
  console.log('   2 Demoobjekte, Schichten, 9 Zeiteinträge (offen bis storniert), Pausen, Korrekturanträge, Audit-Ereignisse und Objektzugriff.');
  console.log(`   Mitarbeiter: max / ${DEMO_PASSWORD} (eigene Zeiterfassung, Korrekturantrag)`);
  console.log(`   Disponent: disponent / ${DEMO_PASSWORD} (Objektzugriff nur auf ${objectOne.objectNumber})`);
  console.log('   Admin bleibt: demo / Demo123!');
  console.log('   Nur für die isolierte *_test-Datenbank gedacht.');
}

main()
  .catch((error) => {
    console.error('Demo-Zeiterfassungsdaten konnten nicht angelegt werden:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
