import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Demo-Daten-Generierung...\n');

  // Tenant finden
  const tenant = await prisma.tenant.findUnique({ where: { tenantId: 'DEMO-001' } });
  if (!tenant) {
    console.error('❌ Demo Tenant nicht gefunden! Bitte zuerst seed-simple.ts ausführen.');
    process.exit(1);
  }
  console.log('✅ Tenant gefunden:', tenant.companyName);

  // ═══════════════════════════════════════════════════════
  // 0. ROLLEN sicherstellen
  // ═══════════════════════════════════════════════════════
  console.log('\n🔐 Prüfe Rollen...');

  const adminRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'admin' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Administrator', slug: 'admin', description: 'Vollzugriff', isSystem: true },
  });
  const dispatcherRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'dispatcher' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Disponent', slug: 'dispatcher', description: 'Dienstplanung und Einsatzsteuerung', isSystem: true },
  });
  const teamLeaderRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'teamleader' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Teamleiter', slug: 'teamleader', description: 'Teamverwaltung und Zeitgenehmigung', isSystem: true },
  });
  const employeeRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'employee' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Mitarbeiter', slug: 'employee', description: 'Eigene Daten einsehen', isSystem: true },
  });
  const accountantRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'accountant' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Buchhaltung', slug: 'accountant', description: 'Abrechnung und Gehälter', isSystem: true },
  });
  console.log('✅ Rollen erstellt/aktualisiert');

  // ═══════════════════════════════════════════════════════
  // 1. BENUTZER (Users) mit verschiedenen Rollen
  // ═══════════════════════════════════════════════════════
  console.log('\n👤 Erstelle Benutzer...');

  const pwdHash = await bcrypt.hash('Demo123!', 12);

  // Admin (bereits existierend, aktualisieren)
  const adminUser = await prisma.user.findFirst({ where: { username: 'demo', tenantId: tenant.id } });
  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { roleId: adminRole.id, firstName: 'Demo', lastName: 'Admin' },
    });
    console.log('✅ Admin-User "demo" aktualisiert');
  }

  // Disponent
  const dispatcherUser = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'dispo' } },
    update: { roleId: dispatcherRole.id, firstName: 'Sabine', lastName: 'Disponentin', email: 'sabine@demo.de', isActive: true },
    create: {
      tenantId: tenant.id, username: 'dispo', email: 'sabine@demo.de', passwordHash: pwdHash,
      firstName: 'Sabine', lastName: 'Disponentin', roleId: dispatcherRole.id, isActive: true,
    },
  });
  console.log(`✅ Disponent: dispo / Demo123!`);

  // Teamleiter
  const teamLeaderUser = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'teamlead' } },
    update: { roleId: teamLeaderRole.id, firstName: 'Anna', lastName: 'Schmidt', email: 'anna@demo.de', isActive: true },
    create: {
      tenantId: tenant.id, username: 'teamlead', email: 'anna@demo.de', passwordHash: pwdHash,
      firstName: 'Anna', lastName: 'Schmidt', roleId: teamLeaderRole.id, isActive: true,
    },
  });
  console.log(`✅ Teamleiter: teamlead / Demo123!`);

  // Mitarbeiter
  const employeeUser = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'max' } },
    update: { roleId: employeeRole.id, firstName: 'Max', lastName: 'Mustermann', email: 'max@demo.de', isActive: true },
    create: {
      tenantId: tenant.id, username: 'max', email: 'max@demo.de', passwordHash: pwdHash,
      firstName: 'Max', lastName: 'Mustermann', roleId: employeeRole.id, isActive: true,
    },
  });
  console.log(`✅ Mitarbeiter: max / Demo123!`);

  // Buchhaltung
  const accountantUser = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'buchhaltung' } },
    update: { roleId: accountantRole.id, firstName: 'Claudia', lastName: 'Rechner', email: 'claudia@demo.de', isActive: true },
    create: {
      tenantId: tenant.id, username: 'buchhaltung', email: 'claudia@demo.de', passwordHash: pwdHash,
      firstName: 'Claudia', lastName: 'Rechner', roleId: accountantRole.id, isActive: true,
    },
  });
  console.log(`✅ Buchhaltung: buchhaltung / Demo123!`);

  // ═══════════════════════════════════════════════════════
  // 2. MITARBEITER (Employees - Sicherheitspersonal)
  // ═══════════════════════════════════════════════════════
  console.log('\n👷 Erstelle Sicherheitsmitarbeiter...');

  const today = new Date();

  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { tenantId_personnelNumber: { tenantId: tenant.id, personnelNumber: 'MA-001' } },
      update: {
        firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@demo.de',
        phone: '+49 171 1234567', street: 'Hauptstraße 1', zipCode: '10115', city: 'Berlin',
        employmentType: 'full_time', hourlyRateBase: 15.50,
        bewachungserlaubnisNr: '§34a-2023-001', bewachungserlaubnisExpiry: new Date('2028-01-15'),
        ersteHilfeCertified: true, ersteHilfeExpiry: new Date('2025-06-01'),
        sicherheitsstufe: 1, status: 'active',
      },
      create: {
        tenantId: tenant.id, personnelNumber: 'MA-001',
        firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@demo.de',
        phone: '+49 171 1234567', street: 'Hauptstraße 1', zipCode: '10115', city: 'Berlin',
        employmentType: 'full_time', hourlyRateBase: 15.50, contractStart: new Date('2023-01-15'),
        bewachungserlaubnisNr: '§34a-2023-001', bewachungserlaubnisExpiry: new Date('2028-01-15'),
        ersteHilfeCertified: true, ersteHilfeExpiry: new Date('2025-06-01'),
        sicherheitsstufe: 1, status: 'active',
      },
    }),
    prisma.employee.upsert({
      where: { tenantId_personnelNumber: { tenantId: tenant.id, personnelNumber: 'MA-002' } },
      update: {
        firstName: 'Anna', lastName: 'Schmidt', email: 'anna.schmidt@demo.de',
        phone: '+49 172 2345678', street: 'Nebenstraße 5', zipCode: '10116', city: 'Berlin',
        employmentType: 'full_time', hourlyRateBase: 18.00,
        bewachungserlaubnisNr: '§34a-2022-045', bewachungserlaubnisExpiry: new Date('2027-06-01'),
        ersteHilfeCertified: true, ersteHilfeExpiry: new Date('2026-03-15'),
        brandschutzbeauftragter: true, sicherheitsstufe: 3, status: 'active',
      },
      create: {
        tenantId: tenant.id, personnelNumber: 'MA-002',
        firstName: 'Anna', lastName: 'Schmidt', email: 'anna.schmidt@demo.de',
        phone: '+49 172 2345678', street: 'Nebenstraße 5', zipCode: '10116', city: 'Berlin',
        employmentType: 'full_time', hourlyRateBase: 18.00, contractStart: new Date('2022-06-01'),
        bewachungserlaubnisNr: '§34a-2022-045', bewachungserlaubnisExpiry: new Date('2027-06-01'),
        ersteHilfeCertified: true, ersteHilfeExpiry: new Date('2026-03-15'),
        brandschutzbeauftragter: true, sicherheitsstufe: 3, status: 'active',
      },
    }),
    prisma.employee.upsert({
      where: { tenantId_personnelNumber: { tenantId: tenant.id, personnelNumber: 'MA-003' } },
      update: {
        firstName: 'Tom', lastName: 'Weber', email: 'tom.weber@demo.de',
        phone: '+49 173 3456789', street: 'Seitenweg 10', zipCode: '10117', city: 'Berlin',
        employmentType: 'part_time', hourlyRateBase: 14.50,
        bewachungserlaubnisNr: '§34a-2023-078', bewachungserlaubnisExpiry: new Date('2028-09-01'),
        waffensachkunde: true, waffensachkundeExpiry: new Date('2027-09-01'),
        sicherheitsstufe: 2, status: 'active',
      },
      create: {
        tenantId: tenant.id, personnelNumber: 'MA-003',
        firstName: 'Tom', lastName: 'Weber', email: 'tom.weber@demo.de',
        phone: '+49 173 3456789', street: 'Seitenweg 10', zipCode: '10117', city: 'Berlin',
        employmentType: 'part_time', hourlyRateBase: 14.50, contractStart: new Date('2023-09-01'),
        bewachungserlaubnisNr: '§34a-2023-078', bewachungserlaubnisExpiry: new Date('2028-09-01'),
        waffensachkunde: true, waffensachkundeExpiry: new Date('2027-09-01'),
        sicherheitsstufe: 2, status: 'active',
      },
    }),
    prisma.employee.upsert({
      where: { tenantId_personnelNumber: { tenantId: tenant.id, personnelNumber: 'MA-004' } },
      update: {
        firstName: 'Lisa', lastName: 'Fischer', email: 'lisa.fischer@demo.de',
        phone: '+49 174 4567890', street: 'Allee 20', zipCode: '10118', city: 'Berlin',
        employmentType: 'mini_job', hourlyRateBase: 13.50,
        bewachungserlaubnisNr: '§34a-2024-012', bewachungserlaubnisExpiry: new Date('2029-01-10'),
        sicherheitsstufe: 1, status: 'active',
      },
      create: {
        tenantId: tenant.id, personnelNumber: 'MA-004',
        firstName: 'Lisa', lastName: 'Fischer', email: 'lisa.fischer@demo.de',
        phone: '+49 174 4567890', street: 'Allee 20', zipCode: '10118', city: 'Berlin',
        employmentType: 'mini_job', hourlyRateBase: 13.50, contractStart: new Date('2024-01-10'),
        bewachungserlaubnisNr: '§34a-2024-012', bewachungserlaubnisExpiry: new Date('2029-01-10'),
        sicherheitsstufe: 1, status: 'active',
      },
    }),
    prisma.employee.upsert({
      where: { tenantId_personnelNumber: { tenantId: tenant.id, personnelNumber: 'MA-005' } },
      update: {
        firstName: 'Peter', lastName: 'Wagner', email: 'peter.wagner@demo.de',
        phone: '+49 175 5678901', street: 'Platz 3', zipCode: '10119', city: 'Berlin',
        employmentType: 'full_time', hourlyRateBase: 16.00,
        bewachungserlaubnisNr: '§34a-2023-055', bewachungserlaubnisExpiry: new Date('2028-03-20'),
        hundefuehrer: true, ersteHilfeCertified: true, ersteHilfeExpiry: new Date('2025-12-01'),
        sicherheitsstufe: 2, status: 'active',
      },
      create: {
        tenantId: tenant.id, personnelNumber: 'MA-005',
        firstName: 'Peter', lastName: 'Wagner', email: 'peter.wagner@demo.de',
        phone: '+49 175 5678901', street: 'Platz 3', zipCode: '10119', city: 'Berlin',
        employmentType: 'full_time', hourlyRateBase: 16.00, contractStart: new Date('2023-03-20'),
        bewachungserlaubnisNr: '§34a-2023-055', bewachungserlaubnisExpiry: new Date('2028-03-20'),
        hundefuehrer: true, ersteHilfeCertified: true, ersteHilfeExpiry: new Date('2025-12-01'),
        sicherheitsstufe: 2, status: 'active',
      },
    }),
  ]);
  console.log(`✅ ${employees.length} Mitarbeiter erstellt`);

  // ═══════════════════════════════════════════════════════
  // 3. KUNDEN (Customers)
  // ═══════════════════════════════════════════════════════
  console.log('\n🏢 Erstelle Kunden...');

  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { tenantId_customerNumber: { tenantId: tenant.id, customerNumber: 'KD-001' } },
      update: { companyName: 'Müller GmbH', email: 'hans.mueller@mueller-gmbh.de', phone: '+49 30 12345678', street: 'Industriestraße 50', zipCode: '10555', city: 'Berlin', notes: 'Wichtiger Kunde - Industriegebiet', status: 'active' },
      create: { tenantId: tenant.id, customerNumber: 'KD-001', companyName: 'Müller GmbH', email: 'hans.mueller@mueller-gmbh.de', phone: '+49 30 12345678', street: 'Industriestraße 50', zipCode: '10555', city: 'Berlin', notes: 'Wichtiger Kunde - Industriegebiet', status: 'active' },
    }),
    prisma.customer.upsert({
      where: { tenantId_customerNumber: { tenantId: tenant.id, customerNumber: 'KD-002' } },
      update: { companyName: 'Stadt Berlin - Kulturamt', email: 'kultur@berlin.de', phone: '+49 30 98765432', street: 'Rathausstraße 1', zipCode: '10178', city: 'Berlin', notes: 'Öffentlicher Auftraggeber', status: 'active' },
      create: { tenantId: tenant.id, customerNumber: 'KD-002', companyName: 'Stadt Berlin - Kulturamt', email: 'kultur@berlin.de', phone: '+49 30 98765432', street: 'Rathausstraße 1', zipCode: '10178', city: 'Berlin', notes: 'Öffentlicher Auftraggeber', status: 'active' },
    }),
    prisma.customer.upsert({
      where: { tenantId_customerNumber: { tenantId: tenant.id, customerNumber: 'KD-003' } },
      update: { companyName: 'TechPark Berlin', email: 'security@techpark.de', phone: '+49 30 5551234', street: 'Tech-Allee 100', zipCode: '10243', city: 'Berlin', notes: 'Technologie-Park mit 5 Gebäuden', status: 'active' },
      create: { tenantId: tenant.id, customerNumber: 'KD-003', companyName: 'TechPark Berlin', email: 'security@techpark.de', phone: '+49 30 5551234', street: 'Tech-Allee 100', zipCode: '10243', city: 'Berlin', notes: 'Technologie-Park mit 5 Gebäuden', status: 'active' },
    }),
    prisma.customer.upsert({
      where: { tenantId_customerNumber: { tenantId: tenant.id, customerNumber: 'KD-004' } },
      update: { companyName: 'Event Company Berlin', email: 'events@ec-berlin.de', phone: '+49 30 7778899', street: 'Friedrichstraße 25', zipCode: '10117', city: 'Berlin', notes: 'Veranstaltungsagentur', status: 'active' },
      create: { tenantId: tenant.id, customerNumber: 'KD-004', companyName: 'Event Company Berlin', email: 'events@ec-berlin.de', phone: '+49 30 7778899', street: 'Friedrichstraße 25', zipCode: '10117', city: 'Berlin', notes: 'Veranstaltungsagentur', status: 'active' },
    }),
  ]);
  console.log(`✅ ${customers.length} Kunden erstellt`);

  // ═══════════════════════════════════════════════════════
  // 4. OBJEKTE (SMS Objects)
  // ═══════════════════════════════════════════════════════
  console.log('\n🏗️ Erstelle Sicherheitsobjekte...');

  const objects = await Promise.all([
    prisma.sMSObject.upsert({
      where: { tenantId_objectNumber: { tenantId: tenant.id, objectNumber: 'OBJ-001' } },
      update: { name: 'Müller GmbH - Hauptgebäude', customerId: customers[0].id, street: 'Industriestraße 50', zipCode: '10555', city: 'Berlin', objectType: 'building', description: 'Hauptverwaltung mit 3 Etagen', accessCode: '1234#', specialInstructions: 'Nachts alle 2h Kontrollgang', isActive: true },
      create: { tenantId: tenant.id, objectNumber: 'OBJ-001', name: 'Müller GmbH - Hauptgebäude', customerId: customers[0].id, street: 'Industriestraße 50', zipCode: '10555', city: 'Berlin', objectType: 'building', description: 'Hauptverwaltung mit 3 Etagen', accessCode: '1234#', specialInstructions: 'Nachts alle 2h Kontrollgang', isActive: true },
    }),
    prisma.sMSObject.upsert({
      where: { tenantId_objectNumber: { tenantId: tenant.id, objectNumber: 'OBJ-002' } },
      update: { name: 'Kulturzentrum Berlin', customerId: customers[1].id, street: 'Rathausstraße 1', zipCode: '10178', city: 'Berlin', objectType: 'public_building', description: 'Kulturzentrum mit Veranstaltungshallen', specialInstructions: 'Einlasskontrolle + Kasse', isActive: true },
      create: { tenantId: tenant.id, objectNumber: 'OBJ-002', name: 'Kulturzentrum Berlin', customerId: customers[1].id, street: 'Rathausstraße 1', zipCode: '10178', city: 'Berlin', objectType: 'public_building', description: 'Kulturzentrum mit Veranstaltungshallen', specialInstructions: 'Einlasskontrolle + Kasse', isActive: true },
    }),
    prisma.sMSObject.upsert({
      where: { tenantId_objectNumber: { tenantId: tenant.id, objectNumber: 'OBJ-003' } },
      update: { name: 'TechPark - Gebäude A', customerId: customers[2].id, street: 'Tech-Allee 100', zipCode: '10243', city: 'Berlin', objectType: 'office', description: 'Bürogebäude A im TechPark', accessCode: 'Chipkarte', isActive: true },
      create: { tenantId: tenant.id, objectNumber: 'OBJ-003', name: 'TechPark - Gebäude A', customerId: customers[2].id, street: 'Tech-Allee 100', zipCode: '10243', city: 'Berlin', objectType: 'office', description: 'Bürogebäude A im TechPark', accessCode: 'Chipkarte', isActive: true },
    }),
    prisma.sMSObject.upsert({
      where: { tenantId_objectNumber: { tenantId: tenant.id, objectNumber: 'OBJ-004' } },
      update: { name: 'TechPark - Gebäude B', customerId: customers[2].id, street: 'Tech-Allee 102', zipCode: '10243', city: 'Berlin', objectType: 'office', description: 'Bürogebäude B im TechPark', accessCode: 'Chipkarte', isActive: true },
      create: { tenantId: tenant.id, objectNumber: 'OBJ-004', name: 'TechPark - Gebäude B', customerId: customers[2].id, street: 'Tech-Allee 102', zipCode: '10243', city: 'Berlin', objectType: 'office', description: 'Bürogebäude B im TechPark', accessCode: 'Chipkarte', isActive: true },
    }),
    prisma.sMSObject.upsert({
      where: { tenantId_objectNumber: { tenantId: tenant.id, objectNumber: 'OBJ-005' } },
      update: { name: 'Messehalle Berlin', customerId: customers[3].id, street: 'Messeweg 5', zipCode: '10367', city: 'Berlin', objectType: 'event_venue', description: 'Veranstaltungshalle für Messen und Events', specialInstructions: 'Ticketsystem + Sicherheitscheck', isActive: true },
      create: { tenantId: tenant.id, objectNumber: 'OBJ-005', name: 'Messehalle Berlin', customerId: customers[3].id, street: 'Messeweg 5', zipCode: '10367', city: 'Berlin', objectType: 'event_venue', description: 'Veranstaltungshalle für Messen und Events', specialInstructions: 'Ticketsystem + Sicherheitscheck', isActive: true },
    }),
  ]);
  console.log(`✅ ${objects.length} Objekte erstellt`);

  // ═══════════════════════════════════════════════════════
  // 5. DIENSTPLÄNE (Deployments)
  // ═══════════════════════════════════════════════════════
  console.log('\n📅 Erstelle Dienstpläne...');

  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);

  // Helper: DateTime @db.Time als vollständiges DateTime mit dem Datum "2000-01-01"
  const makeTime = (hours: number, minutes: number): Date => {
    const d = new Date(2000, 0, 1, hours, minutes, 0);
    return d;
  };

  const deployments = await Promise.all([
    prisma.deployment.create({
      data: {
        tenantId: tenant.id, objectId: objects[0].id, employeeId: employees[0].id,
        date: startDate, startTime: makeTime(8, 0), endTime: makeTime(16, 0),
        breakMinutes: 30, isNightShift: false, status: 'confirmed',
        plannedById: dispatcherUser.id,
        notes: 'Reguläre Schicht Hauptgebäude',
      },
    }),
    prisma.deployment.create({
      data: {
        tenantId: tenant.id, objectId: objects[2].id, employeeId: employees[2].id,
        date: startDate, startTime: makeTime(6, 0), endTime: makeTime(14, 0),
        breakMinutes: 30, isNightShift: false, status: 'confirmed',
        plannedById: dispatcherUser.id,
        notes: 'TechPark Gebäude A - Frühschicht',
      },
    }),
    prisma.deployment.create({
      data: {
        tenantId: tenant.id, objectId: objects[1].id, employeeId: employees[1].id,
        date: new Date(today.getFullYear(), today.getMonth() + 1, 15),
        startTime: makeTime(18, 0), endTime: makeTime(2, 0),
        breakMinutes: 60, isNightShift: true, status: 'planned',
        plannedById: dispatcherUser.id,
        notes: 'Kulturveranstaltung - Abend/Nacht',
      },
    }),
    prisma.deployment.create({
      data: {
        tenantId: tenant.id, objectId: objects[4].id, employeeId: employees[4].id,
        date: new Date(today.getFullYear(), today.getMonth() + 1, 20),
        startTime: makeTime(9, 0), endTime: makeTime(23, 0),
        breakMinutes: 60, status: 'planned',
        plannedById: dispatcherUser.id,
        notes: 'Messeveranstaltung - Ganztags',
      },
    }),
  ]);
  console.log(`✅ ${deployments.length} Dienstpläne erstellt`);

  // ═══════════════════════════════════════════════════════
  // 6. ZEITERFASSUNG (Time Records)
  // ═══════════════════════════════════════════════════════
  console.log('\n⏰ Erstelle Zeiterfassung...');

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const timeRecords = await Promise.all([
    prisma.timeRecord.create({
      data: {
        tenantId: tenant.id, employeeId: employees[0].id, deploymentId: deployments[0].id,
        date: lastWeek, clockIn: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 8, 0),
        clockOut: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 16, 0),
        breakDuration: 30, totalHours: 7.5, status: 'approved',
        approvedById: teamLeaderUser.id, approvedAt: new Date(),
      },
    }),
    prisma.timeRecord.create({
      data: {
        tenantId: tenant.id, employeeId: employees[2].id, deploymentId: deployments[1].id,
        date: lastWeek, clockIn: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 6, 0),
        clockOut: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 14, 0),
        breakDuration: 30, totalHours: 7.5, status: 'approved',
        approvedById: teamLeaderUser.id, approvedAt: new Date(),
      },
    }),
    prisma.timeRecord.create({
      data: {
        tenantId: tenant.id, employeeId: employees[0].id, deploymentId: deployments[0].id,
        date: startDate, clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0),
        clockOut: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
        breakDuration: 30, totalHours: 7.5, status: 'completed',
      },
    }),
    prisma.timeRecord.create({
      data: {
        tenantId: tenant.id, employeeId: employees[4].id, deploymentId: deployments[3].id,
        date: startDate, clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        clockOut: null,
        breakDuration: 0, status: 'open',
      },
    }),
  ]);
  console.log(`✅ ${timeRecords.length} Zeiteinträge erstellt`);

  // ═══════════════════════════════════════════════════════
  // 7. RECHNUNGEN (Invoices)
  // ═══════════════════════════════════════════════════════
  console.log('\n💰 Erstelle Rechnungen...');

  const periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const periodEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const invoices = await Promise.all([
    prisma.customerInvoice.upsert({
      where: { tenantId_invoiceNumber: { tenantId: tenant.id, invoiceNumber: 'INV-2024-001' } },
      update: {},
      create: {
        tenantId: tenant.id, customerId: customers[0].id, invoiceNumber: 'INV-2024-001',
        invoiceDate: new Date(today.getFullYear(), today.getMonth() - 1, 28),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 28),
        periodStart, periodEnd,
        subtotal: 5000, taxRate: 19, taxAmount: 950, totalAmount: 5950,
        status: 'paid', paidAt: new Date(),
        notes: 'Monatliche Abrechnung Müller GmbH',
        createdById: accountantUser.id,
      },
    }),
    prisma.customerInvoice.upsert({
      where: { tenantId_invoiceNumber: { tenantId: tenant.id, invoiceNumber: 'INV-2024-002' } },
      update: {},
      create: {
        tenantId: tenant.id, customerId: customers[2].id, invoiceNumber: 'INV-2024-002',
        invoiceDate: new Date(today.getFullYear(), today.getMonth() - 1, 28),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 28),
        periodStart, periodEnd,
        subtotal: 12000, taxRate: 19, taxAmount: 2280, totalAmount: 14280,
        status: 'sent',
        notes: 'Monatliche Abrechnung TechPark',
        createdById: accountantUser.id,
      },
    }),
    prisma.customerInvoice.upsert({
      where: { tenantId_invoiceNumber: { tenantId: tenant.id, invoiceNumber: 'INV-2024-003' } },
      update: {},
      create: {
        tenantId: tenant.id, customerId: customers[3].id, invoiceNumber: 'INV-2024-003',
        invoiceDate: today,
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30),
        periodStart, periodEnd,
        subtotal: 3500, taxRate: 19, taxAmount: 665, totalAmount: 4165,
        status: 'draft',
        notes: 'Veranstaltungsschutz Messe',
        createdById: accountantUser.id,
      },
    }),
  ]);
  console.log(`✅ ${invoices.length} Rechnungen erstellt`);

  // ═══════════════════════════════════════════════════════
  // 8. VERFÜGBARKEITEN
  // ═══════════════════════════════════════════════════════
  console.log('\n📆 Erstelle Verfügbarkeiten...');

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Montag

  const availabilities = await Promise.all([
    prisma.availability.create({
      data: { tenantId: tenant.id, employeeId: employees[0].id, type: 'available', startDate: weekStart, endDate: new Date(weekStart.getTime() + 4 * 86400000), allDay: true, status: 'approved', approvedById: teamLeaderUser.id },
    }),
    prisma.availability.create({
      data: { tenantId: tenant.id, employeeId: employees[2].id, type: 'available', startDate: weekStart, endDate: new Date(weekStart.getTime() + 4 * 86400000), allDay: true, status: 'approved', approvedById: teamLeaderUser.id },
    }),
    prisma.availability.create({
      data: { tenantId: tenant.id, employeeId: employees[3].id, type: 'vacation', startDate: new Date(today.getFullYear(), today.getMonth() + 1, 1), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 14), allDay: true, reason: 'Urlaub', status: 'pending' },
    }),
  ]);
  console.log(`✅ ${availabilities.length} Verfügbarkeiten erstellt`);

  // ═══════════════════════════════════════════════════════
  // ZUSAMMENFASSUNG
  // ═══════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Demo-Daten erfolgreich erstellt!');
  console.log('═'.repeat(60));
  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   🔐 Rollen: admin, dispatcher, teamleader, employee, accountant`);
  console.log(`   👤 Benutzer: 5 (admin + 4 Rollen)`);
  console.log(`   👷 Mitarbeiter: ${employees.length}`);
  console.log(`   🏢 Kunden: ${customers.length}`);
  console.log(`   🏗️ Objekte: ${objects.length}`);
  console.log(`   📅 Dienstpläne: ${deployments.length}`);
  console.log(`   ⏰ Zeiterfassung: ${timeRecords.length}`);
  console.log(`   💰 Rechnungen: ${invoices.length}`);
  console.log(`   📆 Verfügbarkeiten: ${availabilities.length}`);
  console.log('\n🔐 Login-Daten (alle Passwort: Demo123!):');
  console.log('   demo         → Administrator (alles)');
  console.log('   dispo        → Disponent (Dienstplanung)');
  console.log('   teamlead     → Teamleiter (Zeiten genehmigen)');
  console.log('   max          → Mitarbeiter (nur eigene Daten)');
  console.log('   buchhaltung  → Buchhaltung (Rechnungen/Gehälter)');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
