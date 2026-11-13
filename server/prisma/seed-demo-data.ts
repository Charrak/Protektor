import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function ensureDemoDeployment(data: any) {
  const existing = await prisma.deployment.findFirst({
    where: {
      tenantId: data.tenantId,
      employeeId: data.employeeId,
      objectId: data.objectId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return prisma.deployment.update({ where: { id: existing.id }, data });
  return prisma.deployment.create({ data });
}

async function ensureDemoTimeRecord(data: any) {
  const existing = await prisma.timeRecord.findFirst({
    where: {
      tenantId: data.tenantId,
      deploymentId: data.deploymentId,
      date: data.date,
      clockIn: data.clockIn,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return prisma.timeRecord.update({ where: { id: existing.id }, data });
  return prisma.timeRecord.create({ data });
}

async function ensureDemoAvailability(data: any) {
  const existing = await prisma.availability.findFirst({
    where: {
      tenantId: data.tenantId,
      employeeId: data.employeeId,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return prisma.availability.update({ where: { id: existing.id }, data });
  return prisma.availability.create({ data });
}

async function ensureRecurringDemoAvailability(data: any) {
  const existing = await prisma.recurringAvailability.findFirst({
    where: {
      tenantId: data.tenantId,
      employeeId: data.employeeId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });
  if (existing) return prisma.recurringAvailability.update({ where: { id: existing.id }, data });
  return prisma.recurringAvailability.create({ data });
}

async function ensureDemoShiftPattern(objectId: string, pattern: any) {
  const data = {
    objectId,
    name: pattern.name,
    weekdays: pattern.weekdays,
    startTime: new Date(`1970-01-01T${pattern.startTime}:00.000Z`),
    endTime: new Date(`1970-01-01T${pattern.endTime}:00.000Z`),
    breakMinutes: pattern.breakMinutes ?? 30,
    requiredPersonnel: pattern.requiredPersonnel ?? 1,
    notes: pattern.notes,
    isActive: true,
  };
  const existing = await prisma.objectShiftPattern.findFirst({ where: { objectId, name: pattern.name } });
  if (existing) return prisma.objectShiftPattern.update({ where: { id: existing.id }, data });
  return prisma.objectShiftPattern.create({ data });
}

async function ensureDemoObjectRequirement(objectId: string, qualificationId: string, isMandatory: boolean, notes?: string) {
  const existing = await prisma.objectRequirement.findUnique({ where: { objectId_qualificationId: { objectId, qualificationId } } });
  const data = { isMandatory, notes: notes || null };
  if (existing) return prisma.objectRequirement.update({ where: { id: existing.id }, data });
  return prisma.objectRequirement.create({ data: { objectId, qualificationId, ...data } });
}

async function ensureDemoEmployeeQualification(employeeId: string, qualificationId: string, today: Date) {
  const existing = await prisma.employeeQualification.findUnique({ where: { employeeId_qualificationId: { employeeId, qualificationId } } });
  const obtainedDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const expiryDate = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
  const data = { obtainedDate, expiryDate, isVerified: true, verifiedAt: today };
  if (existing) return prisma.employeeQualification.update({ where: { id: existing.id }, data });
  return prisma.employeeQualification.create({ data: { employeeId, qualificationId, ...data } });
}

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
    update: { roleId: employeeRole.id, firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@demo.de', isActive: true },
    create: {
      tenantId: tenant.id, username: 'max', email: 'max.mustermann@demo.de', passwordHash: pwdHash,
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
  // 4a. OBJEKT-BESETZUNGSZEITEN & QUALIFIKATIONSANFORDERUNGEN
  // ═══════════════════════════════════════════════════════
  console.log('🕒 Hinterlege Besetzungszeiten und Objekt-Qualifikationen...');

  const qualificationNames = [
    'Bewachungserlaubnis §34a', 'Erste-Hilfe-Ausbildung', 'Brandschutzhelfer',
    'Sachkundeprüfung §34a', 'Waffenbesitzkarte', 'Objektschutz-Zertifikat',
  ];
  const qualificationByName = new Map<string, any>();
  for (const name of qualificationNames) {
    let qualification = await prisma.qualification.findFirst({ where: { name } });
    if (!qualification) qualification = await prisma.qualification.create({ data: { name, category: 'security', requiresRenewal: true } });
    qualificationByName.set(name, qualification);
  }

  const objectRequirements = [
    [objects[0], 'Bewachungserlaubnis §34a', true, 'Gültiger Nachweis erforderlich'],
    [objects[0], 'Erste-Hilfe-Ausbildung', false, 'Aktueller Erste-Hilfe-Kurs erwünscht'],
    [objects[1], 'Bewachungserlaubnis §34a', true, 'Einlass- und Sicherheitsdienst'],
    [objects[1], 'Sachkundeprüfung §34a', false, 'Für verantwortliche Schichtleitung'],
    [objects[2], 'Bewachungserlaubnis §34a', true, 'Zutrittskontrolle und Rundgänge'],
    [objects[2], 'Erste-Hilfe-Ausbildung', true, 'Erste Hilfe vor Ort sicherstellen'],
    [objects[4], 'Bewachungserlaubnis §34a', true, 'Veranstaltungsschutz'],
    [objects[4], 'Brandschutzhelfer', true, 'Brandschutzunterstützung während Veranstaltungen'],
    [objects[4], 'Sachkundeprüfung §34a', false, 'Für Teamleitung erforderlich'],
  ] as const;
  for (const [object, qualificationName, mandatory, notes] of objectRequirements) {
    await ensureDemoObjectRequirement(object.id, qualificationByName.get(qualificationName).id, mandatory, notes);
  }

  const scheduleTemplates = [
    [objects[0], [
      { name: 'Frühdienst', weekdays: [1, 2, 3, 4, 5], startTime: '06:00', endTime: '14:00', breakMinutes: 30 },
      { name: 'Spätdienst', weekdays: [1, 2, 3, 4, 5], startTime: '14:00', endTime: '22:00', breakMinutes: 30 },
    ]],
    [objects[1], [
      { name: 'Einlass Abendveranstaltung', weekdays: [5, 6], startTime: '16:00', endTime: '23:00', breakMinutes: 30, requiredPersonnel: 2 },
      { name: 'Tagesveranstaltung', weekdays: [6, 7], startTime: '10:00', endTime: '18:00', breakMinutes: 30, requiredPersonnel: 2 },
    ]],
    [objects[2], [
      { name: 'Empfang Frühdienst', weekdays: [1, 2, 3, 4, 5], startTime: '06:00', endTime: '14:00', breakMinutes: 30 },
      { name: 'Empfang Spätdienst', weekdays: [1, 2, 3, 4, 5], startTime: '14:00', endTime: '22:00', breakMinutes: 30 },
    ]],
    [objects[3], [
      { name: 'Tagesrundgänge', weekdays: [1, 2, 3, 4, 5], startTime: '07:00', endTime: '19:00', breakMinutes: 45 },
    ]],
    [objects[4], [
      { name: 'Veranstaltungsschutz', weekdays: [5, 6, 7], startTime: '14:00', endTime: '22:00', breakMinutes: 30, requiredPersonnel: 3 },
    ]],
  ] as const;
  for (const [object, patterns] of scheduleTemplates) {
    for (const pattern of patterns) await ensureDemoShiftPattern(object.id, pattern);
  }
  console.log(`✅ ${scheduleTemplates.reduce((count, [, patterns]) => count + patterns.length, 0)} Besetzungszeitmuster und ${objectRequirements.length} Qualifikationsanforderungen hinterlegt`);

  // ═══════════════════════════════════════════════════════
  // 4b. MITARBEITER-QUALIFIKATIONEN & WÖCHENTLICHE VERFÜGBARKEITEN
  // ═══════════════════════════════════════════════════════
  console.log('🧑‍✈️ Hinterlege Qualifikationen und Verfügbarkeitszeiten der Mitarbeiter...');
  const employeeQualifications = [
    [employees[0], ['Bewachungserlaubnis §34a', 'Erste-Hilfe-Ausbildung', 'Objektschutz-Zertifikat']],
    [employees[1], ['Bewachungserlaubnis §34a', 'Erste-Hilfe-Ausbildung', 'Brandschutzhelfer', 'Sachkundeprüfung §34a']],
    [employees[2], ['Bewachungserlaubnis §34a', 'Sachkundeprüfung §34a', 'Waffenbesitzkarte']],
    [employees[3], ['Bewachungserlaubnis §34a', 'Erste-Hilfe-Ausbildung']],
    [employees[4], ['Bewachungserlaubnis §34a', 'Erste-Hilfe-Ausbildung', 'Objektschutz-Zertifikat']],
  ] as const;
  for (const [employee, names] of employeeQualifications) {
    for (const name of names) await ensureDemoEmployeeQualification(employee.id, qualificationByName.get(name).id, today);
  }

  const weekdayWindows = [1, 2, 3, 4, 5];
  const recurringWindows = [
    [employees[0], weekdayWindows, '06:00', '18:00', 'Vollzeit, Früh- und Spätdienst'],
    [employees[1], weekdayWindows, '14:00', '22:00', 'Bevorzugt Spätdienst'],
    [employees[1], [6], '08:00', '18:00', 'Samstags nach Absprache'],
    [employees[2], weekdayWindows, '06:00', '14:00', 'Teilzeit, Frühdienst'],
    [employees[3], [2, 3, 4, 5, 6], '08:00', '16:00', 'Verfügbarkeit Dienstag bis Samstag'],
    [employees[4], [6, 7], '10:00', '22:00', 'Wochenend- und Veranstaltungsdienst'],
  ] as const;
  const recurringAvailability = [];
  for (const [employee, days, start, end, notes] of recurringWindows) {
    for (const dayOfWeek of days) {
      recurringAvailability.push(await ensureRecurringDemoAvailability({
        tenantId: tenant.id,
        employeeId: employee.id,
        dayOfWeek,
        startTime: new Date(`1970-01-01T${start}:00.000Z`),
        endTime: new Date(`1970-01-01T${end}:00.000Z`),
        validFrom: new Date(today.getFullYear(), today.getMonth(), 1),
        validUntil: null,
        isActive: true,
        notes,
        status: 'approved',
        approvedById: teamLeaderUser.id,
        approvedAt: today,
      }));
    }
  }
  console.log(`✅ ${recurringAvailability.length} wöchentliche Mitarbeiter-Verfügbarkeiten hinterlegt`);

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
    ensureDemoDeployment({
      tenantId: tenant.id, objectId: objects[0].id, employeeId: employees[0].id,
      date: startDate, startTime: makeTime(8, 0), endTime: makeTime(16, 0),
      breakMinutes: 30, isNightShift: false, status: 'confirmed',
      plannedById: dispatcherUser.id,
      notes: 'Reguläre Schicht Hauptgebäude',
    }),
    ensureDemoDeployment({
      tenantId: tenant.id, objectId: objects[2].id, employeeId: employees[2].id,
      date: startDate, startTime: makeTime(6, 0), endTime: makeTime(14, 0),
      breakMinutes: 30, isNightShift: false, status: 'confirmed',
      plannedById: dispatcherUser.id,
      notes: 'TechPark Gebäude A - Frühschicht',
    }),
    ensureDemoDeployment({
      tenantId: tenant.id, objectId: objects[1].id, employeeId: employees[1].id,
      date: new Date(today.getFullYear(), today.getMonth() + 1, 15),
      startTime: makeTime(18, 0), endTime: makeTime(2, 0),
      breakMinutes: 60, isNightShift: true, status: 'planned',
      plannedById: dispatcherUser.id,
      notes: 'Kulturveranstaltung - Abend/Nacht',
    }),
    ensureDemoDeployment({
      tenantId: tenant.id, objectId: objects[4].id, employeeId: employees[4].id,
      date: new Date(today.getFullYear(), today.getMonth() + 1, 20),
      startTime: makeTime(9, 0), endTime: makeTime(23, 0),
      breakMinutes: 60, status: 'planned',
      plannedById: dispatcherUser.id,
      notes: 'Messeveranstaltung - Ganztags',
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
    ensureDemoTimeRecord({
      tenantId: tenant.id, employeeId: employees[0].id, deploymentId: deployments[0].id,
      date: lastWeek, clockIn: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 8, 0),
      clockOut: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 16, 0),
      breakDuration: 30, totalHours: 7.5, status: 'approved',
      approvedById: teamLeaderUser.id, approvedAt: new Date(),
    }),
    ensureDemoTimeRecord({
      tenantId: tenant.id, employeeId: employees[2].id, deploymentId: deployments[1].id,
      date: lastWeek, clockIn: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 6, 0),
      clockOut: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 14, 0),
      breakDuration: 30, totalHours: 7.5, status: 'approved',
      approvedById: teamLeaderUser.id, approvedAt: new Date(),
    }),
    ensureDemoTimeRecord({
      tenantId: tenant.id, employeeId: employees[0].id, deploymentId: deployments[0].id,
      date: startDate, clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0),
      clockOut: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
      breakDuration: 30, totalHours: 7.5, status: 'completed',
    }),
    ensureDemoTimeRecord({
      tenantId: tenant.id, employeeId: employees[4].id, deploymentId: deployments[3].id,
      date: startDate, clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
      clockOut: null,
      breakDuration: 0, status: 'open',
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
    ensureDemoAvailability({
      tenantId: tenant.id, employeeId: employees[0].id, type: 'available', startDate: weekStart, endDate: new Date(weekStart.getTime() + 4 * 86400000), allDay: true, status: 'approved', approvedById: teamLeaderUser.id,
    }),
    ensureDemoAvailability({
      tenantId: tenant.id, employeeId: employees[2].id, type: 'available', startDate: weekStart, endDate: new Date(weekStart.getTime() + 4 * 86400000), allDay: true, status: 'approved', approvedById: teamLeaderUser.id,
    }),
    ensureDemoAvailability({
      tenantId: tenant.id, employeeId: employees[3].id, type: 'vacation', startDate: new Date(today.getFullYear(), today.getMonth() + 1, 1), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 14), allDay: true, reason: 'Urlaub', status: 'pending',
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
