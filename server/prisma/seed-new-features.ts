/**
 * Demo-Daten für neue Features
 * Erstellt: ObjectShiftPattern, PlanningGroups mit Teamleitern,
 *           EmployeeTimePreferences, EmployeeTimeRequests, Deployments
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Demo-Daten-Generierung für neue Features...\n');

  // Hole Tenant
  const tenant = await prisma.tenant.findFirst({
    where: { tenantId: 'DEMO-001' }
  });

  if (!tenant) {
    throw new Error('Tenant DEMO-001 nicht gefunden! Bitte zuerst seed.ts ausführen.');
  }

  console.log('✓ Tenant gefunden:', tenant.companyName);

  // Hole existierende Daten
  const [users, employees, customers, objects] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: tenant.id } }),
    prisma.employee.findMany({ where: { tenantId: tenant.id } }),
    prisma.customer.findMany({ where: { tenantId: tenant.id } }),
    prisma.sMSObject.findMany({ where: { tenantId: tenant.id } })
  ]);

  console.log('✓ Existierende Daten geladen:', {
    users: users.length,
    employees: employees.length,
    customers: customers.length,
    objects: objects.length
  });

  // Finde wichtige User
  const teamleaderUser = users.find(u => u.username === 'teamleader');
  const dispatcherUser = users.find(u => u.username === 'dispatcher');
  
  // Finde wichtige Mitarbeiter
  const maxEmployee = employees.find(e => e.personnelNumber === 'MA-001');
  const annaEmployee = employees.find(e => e.personnelNumber === 'MA-002');
  const thomasEmployee = employees.find(e => e.personnelNumber === 'MA-003');

  // Finde Objekte
  const object1 = objects[0];
  const object2 = objects[1];
  const object3 = objects[2];

  // ═══════════════════════════════════════════════════════
  // 1. OBJECT SHIFT PATTERN (Schichtmuster pro Objekt)
  // ═══════════════════════════════════════════════════════
  console.log('\n📋 Erstelle Schichtmuster...');

  // Objekt 1: Tagschicht (Mo-Fr)
  const existingPattern1 = await prisma.objectShiftPattern.findFirst({
    where: { objectId: object1.id, name: 'Tagschicht' }
  });
  if (!existingPattern1) {
    await prisma.objectShiftPattern.create({
      data: {
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
  }

  // Objekt 1: Nachtschicht (Mo-Fr)
  const existingPattern2 = await prisma.objectShiftPattern.findFirst({
    where: { objectId: object1.id, name: 'Nachtschicht' }
  });
  if (!existingPattern2) {
    await prisma.objectShiftPattern.create({
      data: {
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
  }

  // Objekt 2: Wochenende (Sa-So)
  const existingPattern3 = await prisma.objectShiftPattern.findFirst({
    where: { objectId: object2.id, name: 'Wochenendschicht' }
  });
  if (!existingPattern3) {
    await prisma.objectShiftPattern.create({
      data: {
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
  }

  // Objekt 3: Ganztägig (täglich)
  const existingPattern4 = await prisma.objectShiftPattern.findFirst({
    where: { objectId: object3.id, name: 'Ganztägig' }
  });
  if (!existingPattern4) {
    await prisma.objectShiftPattern.create({
      data: {
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
  }

  console.log('✓ 4 Schichtmuster erstellt');

  // ═══════════════════════════════════════════════════════
  // 2. PLANNING GROUPS (Planungsgruppen mit Teamleitern)
  // ═══════════════════════════════════════════════════════
  console.log('\n👥 Erstelle Planungsgruppen...');

  // Team Nord: Lead = teamleader, Deputy = dispatcher
  let group1 = await prisma.planningGroup.findFirst({
    where: { tenantId: tenant.id, name: 'Team Nord' }
  });
  
  if (!group1) {
    group1 = await prisma.planningGroup.create({
      data: {
        tenantId: tenant.id,
        name: 'Team Nord',
        description: 'Zuständig für Objekte im Norden',
        color: '#3B82F6',
        leadUserId: teamleaderUser?.id,
        leadDeputies: [dispatcherUser?.id || ''],
        createdBy: dispatcherUser?.id || 'system',
      },
    });
  } else {
    await prisma.planningGroup.update({
      where: { id: group1.id },
      data: {
        leadUserId: teamleaderUser?.id,
        leadDeputies: [dispatcherUser?.id || ''],
      },
    });
  }

  // Team Süd: Lead = dispatcher, Deputy = teamleader
  let group2 = await prisma.planningGroup.findFirst({
    where: { tenantId: tenant.id, name: 'Team Süd' }
  });
  
  if (!group2) {
    group2 = await prisma.planningGroup.create({
      data: {
        tenantId: tenant.id,
        name: 'Team Süd',
        description: 'Zuständig für Objekte im Süden',
        color: '#10B981',
        leadUserId: dispatcherUser?.id,
        leadDeputies: [teamleaderUser?.id || ''],
        createdBy: dispatcherUser?.id || 'system',
      },
    });
  } else {
    await prisma.planningGroup.update({
      where: { id: group2.id },
      data: {
        leadUserId: dispatcherUser?.id,
        leadDeputies: [teamleaderUser?.id || ''],
      },
    });
  }

  console.log('✓ 2 Planungsgruppen erstellt');

  // Füge Mitarbeiter zu Gruppen hinzu
  if (maxEmployee && group1) {
    const existingGroupEmployee1 = await prisma.planningGroupEmployee.findFirst({
      where: { planningGroupId: group1.id, employeeId: maxEmployee.id }
    });
    if (!existingGroupEmployee1) {
      await prisma.planningGroupEmployee.create({
        data: {
          planningGroupId: group1.id,
          employeeId: maxEmployee.id,
          isPrimary: true,
          sortOrder: 1,
        },
      });
    }
  }

  if (annaEmployee && group1) {
    const existingGroupEmployee2 = await prisma.planningGroupEmployee.findFirst({
      where: { planningGroupId: group1.id, employeeId: annaEmployee.id }
    });
    if (!existingGroupEmployee2) {
      await prisma.planningGroupEmployee.create({
        data: {
          planningGroupId: group1.id,
          employeeId: annaEmployee.id,
          isPrimary: false,
          sortOrder: 2,
        },
      });
    }
  }

  if (thomasEmployee && group2) {
    const existingGroupEmployee3 = await prisma.planningGroupEmployee.findFirst({
      where: { planningGroupId: group2.id, employeeId: thomasEmployee.id }
    });
    if (!existingGroupEmployee3) {
      await prisma.planningGroupEmployee.create({
        data: {
          planningGroupId: group2.id,
          employeeId: thomasEmployee.id,
          isPrimary: true,
          sortOrder: 1,
        },
      });
    }
  }

  console.log('✓ Mitarbeiter zu Planungsgruppen hinzugefügt');

  // ═══════════════════════════════════════════════════════
  // 3. EMPLOYEE TIME PREFERENCES (Zeitpräferenzen)
  // ═══════════════════════════════════════════════════════
  console.log('\n⏰ Erstelle Zeitpräferenzen...');

  if (maxEmployee) {
    // Max möchte Mo-Fr morgens arbeiten
    const existingPref1 = await prisma.employeeTimePreference.findFirst({
      where: { employeeId: maxEmployee.id, type: 'preferred', weekdays: { equals: [1, 2, 3, 4, 5] } }
    });
    if (!existingPref1) {
      await prisma.employeeTimePreference.create({
        data: {
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
    }

    // Max kann nicht am Wochenende
    const existingPref2 = await prisma.employeeTimePreference.findFirst({
      where: { employeeId: maxEmployee.id, type: 'restricted', weekdays: { equals: [6, 7] } }
    });
    if (!existingPref2) {
      await prisma.employeeTimePreference.create({
        data: {
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
  }

  if (annaEmployee) {
    // Anna möchte Nachtschichten
    const existingPref3 = await prisma.employeeTimePreference.findFirst({
      where: { employeeId: annaEmployee.id, type: 'preferred', startTime: { equals: new Date('1970-01-01T22:00:00Z') } }
    });
    if (!existingPref3) {
      await prisma.employeeTimePreference.create({
        data: {
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
  }

  console.log('✓ 3 Zeitpräferenzen erstellt');

  // ═══════════════════════════════════════════════════════
  // 4. EMPLOYEE TIME REQUESTS (Freiwünsche)
  // ═══════════════════════════════════════════════════════
  console.log('\n📅 Erstelle Freiwünsche...');

  if (maxEmployee) {
    // Max möchte in 7 Tagen frei
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    
    const existingRequest1 = await prisma.employeeTimeRequest.findFirst({
      where: { employeeId: maxEmployee.id, date: tomorrow, type: 'day_off' }
    });
    if (!existingRequest1) {
      await prisma.employeeTimeRequest.create({
        data: {
          tenantId: tenant.id,
          employeeId: maxEmployee.id,
          type: 'day_off',
          date: tomorrow,
          reason: 'Arzttermin',
          status: 'pending',
        },
      });
    }

    // Max möchte morgen früher Schluss
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const existingRequest2 = await prisma.employeeTimeRequest.findFirst({
      where: { employeeId: maxEmployee.id, date: dayAfterTomorrow, type: 'early_leave' }
    });
    if (!existingRequest2) {
      await prisma.employeeTimeRequest.create({
        data: {
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
  }

  if (annaEmployee) {
    // Anna möchte in 14 Tagen frei
    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);

    const existingRequest3 = await prisma.employeeTimeRequest.findFirst({
      where: { employeeId: annaEmployee.id, date: in14Days, type: 'day_off' }
    });
    if (!existingRequest3) {
      await prisma.employeeTimeRequest.create({
        data: {
          tenantId: tenant.id,
          employeeId: annaEmployee.id,
          type: 'day_off',
          date: in14Days,
          reason: 'Geburtstag',
          status: 'pending',
        },
      });
    }
  }

  console.log('✓ 3 Freiwünsche erstellt');

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

    const existingDeployment1 = await prisma.deployment.findFirst({
      where: { employeeId: maxEmployee.id, date: tomorrow, status: 'planned' }
    });
    if (!existingDeployment1) {
      await prisma.deployment.create({
        data: {
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
    }

    // Freigegebener Einsatz
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const existingDeployment2 = await prisma.deployment.findFirst({
      where: { employeeId: maxEmployee.id, date: dayAfterTomorrow, status: 'released' }
    });
    if (!existingDeployment2) {
      await prisma.deployment.create({
        data: {
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
    }

    // Bestätigter Einsatz
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const existingDeployment3 = await prisma.deployment.findFirst({
      where: { employeeId: maxEmployee.id, date: in3Days, status: 'confirmed' }
    });
    if (!existingDeployment3) {
      await prisma.deployment.create({
        data: {
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
    }

    // Abgelehnter Einsatz
    const in4Days = new Date(today);
    in4Days.setDate(in4Days.getDate() + 4);

    const existingDeployment4 = await prisma.deployment.findFirst({
      where: { employeeId: maxEmployee.id, date: in4Days, status: 'declined' }
    });
    if (!existingDeployment4) {
      await prisma.deployment.create({
        data: {
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
  }

  console.log('✓ 4 Einsätze mit verschiedenen Status erstellt');

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
