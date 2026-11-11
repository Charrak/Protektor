/**
 * Demo-Daten für neue Features (2026-01-11)
 * 
 * Dieses Script erstellt Demo-Daten für:
 * - ObjectShiftPattern (Schichtmuster pro Objekt)
 * - PlanningGroups mit Teamleitern und Vertretern
 * - EmployeeTimePreferences (wiederkehrende Zeitpräferenzen)
 * - EmployeeTimeRequests (einmalige Freiwünsche)
 * - Deployments mit verschiedenen Status (planned, released, confirmed, declined)
 * 
 * Ausführung: npx tsx prisma/seed-new-features.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Demo-Daten für neue Features...\n');

  // Tenant finden
  const tenant = await prisma.tenant.findUnique({ where: { tenantId: 'DEMO-001' } });
  if (!tenant) {
    console.error('❌ Demo Tenant nicht gefunden! Bitte zuerst seed.ts ausführen.');
    process.exit(1);
  }
  console.log('✅ Tenant gefunden:', tenant.companyName);

  // Bestehende Daten laden
  const users = await prisma.user.findMany({ where: { tenantId: tenant.id } });
  const employees = await prisma.employee.findMany({ where: { tenantId: tenant.id } });
  const customers = await prisma.customer.findMany({ where: { tenantId: tenant.id } });
  const objects = await prisma.sMSObject.findMany({ where: { tenantId: tenant.id } });

  if (users.length === 0 || employees.length === 0 || customers.length === 0 || objects.length === 0) {
    console.error('❌ Basis-Daten fehlen! Bitte zuerst seed-demo-data.ts ausführen.');
    process.exit(1);
  }

  console.log(`📊 Basis-Daten: ${users.length} User, ${employees.length} Mitarbeiter, ${customers.length} Kunden, ${objects.length} Objekte\n`);

  const teamleaderUser = users.find(u => u.username === 'teamlead');
  const dispatcherUser = users.find(u => u.username === 'dispo');
  const maxEmployee = employees.find(e => e.personnelNumber === 'MA-001');
  const annaEmployee = employees.find(e => e.personnelNumber === 'MA-002');
  const thomasEmployee = employees.find(e => e.personnelNumber === 'MA-003');

  // ═══════════════════════════════════════════════════════
  // 1. OBJECT SHIFT PATTERNS (Schichtmuster pro Objekt)
  // ═══════════════════════════════════════════════════════
  console.log('\n⏰ Erstelle Schichtmuster für Objekte...');

  const object1 = objects[0];
  const object2 = objects[1];
  const object3 = objects[2];

  // Objekt 1: Tagschicht (Mo-Fr)
  await prisma.objectShiftPattern.upsert({
    where: { id: 'shift-pattern-001' },
    update: {},
    create: {
      id: 'shift-pattern-001',
      objectId: object1.id,
      name: 'Tagschicht',
      weekdays: [1, 2, 3, 4, 5], // Mo-Fr
      startTime: new Date('1970-01-01T06:00:00Z'),
      endTime: new Date('1970-01-01T14:00:00Z'),
      breakMinutes: 30,
      requiredPersonnel: 2,
      isActive: true,
    },
  });

  // Objekt 1: Nachtschicht (Mo-Fr)
  await prisma.objectShiftPattern.upsert({
    where: { id: 'shift-pattern-002' },
    update: {},
    create: {
      id: 'shift-pattern-002',
      objectId: object1.id,
      name: 'Nachtschicht',
      weekdays: [1, 2, 3, 4, 5], // Mo-Fr
      startTime: new Date('1970-01-01T22:00:00Z'),
      endTime: new Date('1970-01-01T06:00:00Z'),
      breakMinutes: 60,
      requiredPersonnel: 1,
      isActive: true,
    },
  });

  // Objekt 2: Wochenende (Sa-So)
  await prisma.objectShiftPattern.upsert({
    where: { id: 'shift-pattern-003' },
    update: {},
    create: {
      id: 'shift-pattern-003',
      objectId: object2.id,
      name: 'Wochenendschicht',
      weekdays: [6, 7], // Sa-So
      startTime: new Date('1970-01-01T08:00:00Z'),
      endTime: new Date('1970-01-01T20:00:00Z'),
      breakMinutes: 45,
      requiredPersonnel: 3,
      isActive: true,
    },
  });

  // Objekt 3: Ganztägig (täglich)
  await prisma.objectShiftPattern.upsert({
    where: { id: 'shift-pattern-004' },
    update: {},
    create: {
      id: 'shift-pattern-004',
      objectId: object3.id,
      name: 'Ganztägig',
      weekdays: [1, 2, 3, 4, 5, 6, 7], // Täglich
      startTime: new Date('1970-01-01T00:00:00Z'),
      endTime: new Date('1970-01-01T23:59:00Z'),
      breakMinutes: 0,
      requiredPersonnel: 1,
      isActive: true,
    },
  });

  console.log('✅ 4 Schichtmuster erstellt');

  // ═══════════════════════════════════════════════════════
  // 2. PLANNING GROUPS mit Teamleitern
  // ═══════════════════════════════════════════════════════
  console.log('\n👥 Erstelle Planungsgruppen...');

  const group1 = await prisma.planningGroup.upsert({
    where: { id: 'planning-group-001' },
    update: {
      name: 'Team Nord',
      description: 'Zuständig für Objekte im Norden',
      color: '#3B82F6',
      leadUserId: teamleaderUser?.id,
      leadDeputies: [dispatcherUser?.id || ''],
    },
    create: {
      id: 'planning-group-001',
      tenantId: tenant.id,
      name: 'Team Nord',
      description: 'Zuständig für Objekte im Norden',
      color: '#3B82F6',
      leadUserId: teamleaderUser?.id,
      leadDeputies: [dispatcherUser?.id || ''],
      createdBy: dispatcherUser?.id || 'system',
    },
  });

  const group2 = await prisma.planningGroup.upsert({
    where: { id: 'planning-group-002' },
    update: {
      name: 'Team Süd',
      description: 'Zuständig für Objekte im Süden',
      color: '#10B981',
      leadUserId: dispatcherUser?.id,
      leadDeputies: [teamleaderUser?.id || ''],
    },
    create: {
      id: 'planning-group-002',
      tenantId: tenant.id,
      name: 'Team Süd',
      description: 'Zuständig für Objekte im Süden',
      color: '#10B981',
      leadUserId: dispatcherUser?.id,
      leadDeputies: [teamleaderUser?.id || ''],
      createdBy: dispatcherUser?.id || 'system',
    },
  });

  console.log('✅ 2 Planungsgruppen erstellt');

  // Mitarbeiter zu Gruppen hinzufügen
  if (maxEmployee && group1) {
    await prisma.planningGroupEmployee.upsert({
      where: { planningGroupId_employeeId: { planningGroupId: group1.id, employeeId: maxEmployee.id } },
      update: {},
      create: {
        planningGroupId: group1.id,
        employeeId: maxEmployee.id,
        isPrimary: true,
        sortOrder: 1,
      },
    });
  }

  if (annaEmployee && group1) {
    await prisma.planningGroupEmployee.upsert({
      where: { planningGroupId_employeeId: { planningGroupId: group1.id, employeeId: annaEmployee.id } },
      update: {},
      create: {
        planningGroupId: group1.id,
        employeeId: annaEmployee.id,
        isPrimary: false,
        sortOrder: 2,
      },
    });
  }

  if (thomasEmployee && group2) {
    await prisma.planningGroupEmployee.upsert({
      where: { planningGroupId_employeeId: { planningGroupId: group2.id, employeeId: thomasEmployee.id } },
      update: {},
      create: {
        planningGroupId: group2.id,
        employeeId: thomasEmployee.id,
        isPrimary: true,
        sortOrder: 1,
      },
    });
  }

  console.log('✅ Mitarbeiter zu Planungsgruppen hinzugefügt');

  // ═══════════════════════════════════════════════════════
  // 3. EMPLOYEE TIME PREFERENCES (Zeitpräferenzen)
  // ═══════════════════════════════════════════════════════
  console.log('\n⏰ Erstelle Zeitpräferenzen...');

  if (maxEmployee) {
    // Max möchte Mo-Fr morgens arbeiten
    await prisma.employeeTimePreference.upsert({
      where: { id: 'time-pref-001' },
      update: {},
      create: {
        id: 'time-pref-001',
        tenantId: tenant.id,
        employeeId: maxEmployee.id,
        type: 'preferred',
        weekdays: [1, 2, 3, 4, 5], // Mo-Fr
        startTime: new Date('1970-01-01T06:00:00Z'),
        endTime: new Date('1970-01-01T14:00:00Z'),
        reason: 'Bevorzuge Tagschicht wegen Familie',
        priority: 5,
        isActive: true,
      },
    });

    // Max kann nicht am Wochenende
    await prisma.employeeTimePreference.upsert({
      where: { id: 'time-pref-002' },
      update: {},
      create: {
        id: 'time-pref-002',
        tenantId: tenant.id,
        employeeId: maxEmployee.id,
        type: 'restricted',
        weekdays: [6, 7], // Sa-So
        startTime: null,
        endTime: null,
        reason: 'Familienpflichten am Wochenende',
        priority: 5,
        isActive: true,
      },
    });
  }

  if (annaEmployee) {
    // Anna möchte Nachtschichten
    await prisma.employeeTimePreference.upsert({
      where: { id: 'time-pref-003' },
      update: {},
      create: {
        id: 'time-pref-003',
        tenantId: tenant.id,
        employeeId: annaEmployee.id,
        type: 'preferred',
        weekdays: [1, 2, 3, 4, 5], // Mo-Fr
        startTime: new Date('1970-01-01T22:00:00Z'),
        endTime: new Date('1970-01-01T06:00:00Z'),
        reason: 'Bevorzuge Nachtschicht',
        priority: 5,
        isActive: true,
      },
    });
  }

  console.log('✅ 3 Zeitpräferenzen erstellt');

  // ═══════════════════════════════════════════════════════
  // 4. EMPLOYEE TIME REQUESTS (Freiwünsche)
  // ═══════════════════════════════════════════════════════
  console.log('\n📅 Erstelle Freiwünsche...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);

  if (maxEmployee) {
    // Max möchte in 7 Tagen frei
    await prisma.employeeTimeRequest.upsert({
      where: { id: 'time-request-001' },
      update: {},
      create: {
        id: 'time-request-001',
        tenantId: tenant.id,
        employeeId: maxEmployee.id,
        type: 'day_off',
        date: tomorrow,
        reason: 'Arzttermin',
        status: 'pending',
      },
    });

    // Max möchte morgen früher Schluss
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    await prisma.employeeTimeRequest.upsert({
      where: { id: 'time-request-002' },
      update: {},
      create: {
        id: 'time-request-002',
        tenantId: tenant.id,
        employeeId: maxEmployee.id,
        type: 'early_leave',
        date: dayAfterTomorrow,
        startTime: new Date('1970-01-01T12:00:00Z'),
        reason: 'Kind abholen',
        status: 'approved',
        approvedById: teamleaderUser?.id,
        approvedAt: new Date(),
      },
    });
  }

  if (annaEmployee) {
    // Anna möchte in 14 Tagen frei
    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);

    await prisma.employeeTimeRequest.upsert({
      where: { id: 'time-request-003' },
      update: {},
      create: {
        id: 'time-request-003',
        tenantId: tenant.id,
        employeeId: annaEmployee.id,
        type: 'day_off',
        date: in14Days,
        reason: 'Geburtstag',
        status: 'pending',
      },
    });
  }

  console.log('✅ 3 Freiwünsche erstellt');

  // ═══════════════════════════════════════════════════════
  // 5. DEPLOYMENTS mit verschiedenen Status
  // ═══════════════════════════════════════════════════════
  console.log('\n🚀 Erstelle Einsätze mit verschiedenen Status...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (maxEmployee && object1) {
    // Geplanter Einsatz (nicht freigegeben)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await prisma.deployment.upsert({
      where: { id: 'deployment-planned-001' },
      update: {},
      create: {
        id: 'deployment-planned-001',
        tenantId: tenant.id,
        objectId: object1.id,
        employeeId: maxEmployee.id,
        date: tomorrow,
        startTime: new Date('1970-01-01T06:00:00Z'),
        endTime: new Date('1970-01-01T14:00:00Z'),
        breakMinutes: 30,
        status: 'planned',
        plannedById: dispatcherUser?.id || 'system',
      },
    });

    // Freigegebener Einsatz
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    await prisma.deployment.upsert({
      where: { id: 'deployment-released-001' },
      update: {},
      create: {
        id: 'deployment-released-001',
        tenantId: tenant.id,
        objectId: object1.id,
        employeeId: maxEmployee.id,
        date: dayAfterTomorrow,
        startTime: new Date('1970-01-01T06:00:00Z'),
        endTime: new Date('1970-01-01T14:00:00Z'),
        breakMinutes: 30,
        status: 'released',
        plannedById: dispatcherUser?.id || 'system',
      },
    });

    // Bestätigter Einsatz
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    await prisma.deployment.upsert({
      where: { id: 'deployment-confirmed-001' },
      update: {},
      create: {
        id: 'deployment-confirmed-001',
        tenantId: tenant.id,
        objectId: object1.id,
        employeeId: maxEmployee.id,
        date: in3Days,
        startTime: new Date('1970-01-01T06:00:00Z'),
        endTime: new Date('1970-01-01T14:00:00Z'),
        breakMinutes: 30,
        status: 'confirmed',
        plannedById: dispatcherUser?.id || 'system',
        confirmedById: maxEmployee.id,
        confirmedAt: new Date(),
      },
    });

    // Abgelehnter Einsatz
    const in4Days = new Date(today);
    in4Days.setDate(in4Days.getDate() + 4);

    await prisma.deployment.upsert({
      where: { id: 'deployment-declined-001' },
      update: {},
      create: {
        id: 'deployment-declined-001',
        tenantId: tenant.id,
        objectId: object1.id,
        employeeId: maxEmployee.id,
        date: in4Days,
        startTime: new Date('1970-01-01T06:00:00Z'),
        endTime: new Date('1970-01-01T14:00:00Z'),
        breakMinutes: 30,
        status: 'declined',
        plannedById: dispatcherUser?.id || 'system',
        confirmedById: maxEmployee.id,
        confirmedAt: new Date(),
        cancellationReason: 'Privater Termin',
      },
    });
  }

  console.log('✅ 4 Einsätze mit verschiedenen Status erstellt');

  // ═══════════════════════════════════════════════════════
  // ZUSAMMENFASSUNG
  // ═══════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ Neue Demo-Daten erfolgreich erstellt!');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('📊 Erstellt:');
  console.log('  • 4 Schichtmuster (ObjectShiftPattern)');
  console.log('  • 2 Planungsgruppen mit Teamleitern');
  console.log('  • 3 Zeitpräferenzen (EmployeeTimePreference)');
  console.log('  • 3 Freiwünsche (EmployeeTimeRequest)');
  console.log('  • 4 Einsätze mit Status: planned, released, confirmed, declined');

  console.log('\n🔐 Login-Daten:');
  console.log('  • Admin: demo / Demo123!');
  console.log('  • Disponent: dispo / Demo123!');
  console.log('  • Teamleiter: teamlead / Demo123!');
  console.log('  • Mitarbeiter: max / Demo123!');

  console.log('\n📋 Workflow zum Testen:');
  console.log('  1. Als Disponent (dispo) anmelden');
  console.log('  2. Zu Dienstplanung gehen');
  console.log('  3. "✓ Alle freigeben" klicken');
  console.log('  4. Als Mitarbeiter (max) anmelden');
  console.log('  5. Nur freigegebene Einsätze sehen');
  console.log('  6. Einsätze bestätigen/ablehnen');

  console.log('\n═══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
