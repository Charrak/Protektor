import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Demo-Daten-Generierung...\n');

  // Tenant finden
  const tenant = await prisma.tenant.findUnique({ where: { tenantId: 'DEMO-001' }});
  if (!tenant) {
    console.error('❌ Demo Tenant nicht gefunden!');
    process.exit(1);
  }
  console.log('✅ Tenant gefunden:', tenant.companyName);

  // Role finden
  const role = await prisma.role.findFirst({ where: { slug: 'admin', tenantId: tenant.id }});
  if (!role) {
    console.error('❌ Admin Role nicht gefunden!');
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════
  // 1. MITARBEITER (Employees)
  // ═══════════════════════════════════════════════════════
  console.log('\n👥 Erstelle Mitarbeiter...');

  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max.mustermann@demo.de',
        phone: '+49 171 1234567',
        address: { street: 'Hauptstraße 1', city: 'Berlin', zipCode: '10115', country: 'DE' },
        position: 'Sicherheitsmitarbeiter',
        department: 'Objektschutz',
        employmentType: 'FULL_TIME',
        hireDate: new Date('2023-01-15'),
        isActive: true,
      },
    }),
    prisma.employee.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Anna',
        lastName: 'Schmidt',
        email: 'anna.schmidt@demo.de',
        phone: '+49 172 2345678',
        address: { street: 'Nebenstraße 5', city: 'Berlin', zipCode: '10116', country: 'DE' },
        position: 'Schichtleiter',
        department: 'Objektschutz',
        employmentType: 'FULL_TIME',
        hireDate: new Date('2022-06-01'),
        isActive: true,
      },
    }),
    prisma.employee.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Tom',
        lastName: 'Weber',
        email: 'tom.weber@demo.de',
        phone: '+49 173 3456789',
        address: { street: 'Seitenweg 10', city: 'Berlin', zipCode: '10117', country: 'DE' },
        position: 'Sicherheitsmitarbeiter',
        department: 'Veranstaltungsschutz',
        employmentType: 'PART_TIME',
        hireDate: new Date('2023-09-01'),
        isActive: true,
      },
    }),
    prisma.employee.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Lisa',
        lastName: 'Fischer',
        email: 'lisa.fischer@demo.de',
        phone: '+49 174 4567890',
        address: { street: 'Allee 20', city: 'Berlin', zipCode: '10118', country: 'DE' },
        position: 'Empfangssicherheit',
        department: 'Objektschutz',
        employmentType: 'MINI_JOB',
        hireDate: new Date('2024-01-10'),
        isActive: true,
      },
    }),
    prisma.employee.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Peter',
        lastName: 'Wagner',
        email: 'peter.wagner@demo.de',
        phone: '+49 175 5678901',
        address: { street: 'Platz 3', city: 'Berlin', zipCode: '10119', country: 'DE' },
        position: 'Sicherheitsmitarbeiter',
        department: 'Veranstaltungsschutz',
        employmentType: 'FULL_TIME',
        hireDate: new Date('2023-03-20'),
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ ${employees.length} Mitarbeiter erstellt`);

  // ═══════════════════════════════════════════════════════
  // 2. KUNDEN (Customers)
  // ═══════════════════════════════════════════════════════
  console.log('\n🏢 Erstelle Kunden...');

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'Müller GmbH',
        contactPerson: 'Hans Müller',
        email: 'hans.mueller@mueller-gmbh.de',
        phone: '+49 30 12345678',
        address: { street: 'Industriestraße 50', city: 'Berlin', zipCode: '10555', country: 'DE' },
        customerType: 'BUSINESS',
        notes: 'Wichtiger Kunde - Industriegebiet',
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'Stadt Berlin - Kulturamt',
        contactPerson: 'Petra Schneider',
        email: 'kultur@berlin.de',
        phone: '+49 30 98765432',
        address: { street: 'Rathausstraße 1', city: 'Berlin', zipCode: '10178', country: 'DE' },
        customerType: 'GOVERNMENT',
        notes: 'Öffentlicher Auftraggeber',
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'TechPark Berlin',
        contactPerson: 'Michael Braun',
        email: 'security@techpark.de',
        phone: '+49 30 5551234',
        address: { street: 'Tech-Allee 100', city: 'Berlin', zipCode: '10243', country: 'DE' },
        customerType: 'BUSINESS',
        notes: 'Technologie-Park mit 5 Gebäuden',
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'Event Company Berlin',
        contactPerson: 'Sandra Klein',
        email: 'events@ec-berlin.de',
        phone: '+49 30 7778899',
        address: { street: 'Friedrichstraße 25', city: 'Berlin', zipCode: '10117', country: 'DE' },
        customerType: 'BUSINESS',
        notes: 'Veranstaltungsagentur',
      },
    }),
  ]);
  console.log(`✅ ${customers.length} Kunden erstellt`);

  // ═══════════════════════════════════════════════════════
  // 3. OBJEKTE (SMS Objects)
  // ═══════════════════════════════════════════════════════
  console.log('\n🏗️ Erstelle Sicherheitsobjekte...');

  const objects = await Promise.all([
    prisma.sMSObject.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[0].id,
        name: 'Müller GmbH - Hauptgebäude',
        objectType: 'BUILDING',
        address: { street: 'Industriestraße 50', city: 'Berlin', zipCode: '10555', country: 'DE' },
        size: '5000',
        floors: 3,
        description: 'Hauptverwaltung mit 3 Etagen',
        accessInfo: 'Zutritt nur mit Ausweis',
        emergencyContact: '+49 171 9999999',
        isActive: true,
      },
    }),
    prisma.sMSObject.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[1].id,
        name: 'Kulturzentrum Berlin',
        objectType: 'PUBLIC_BUILDING',
        address: { street: 'Rathausstraße 1', city: 'Berlin', zipCode: '10178', country: 'DE' },
        size: '10000',
        floors: 4,
        description: 'Kulturzentrum mit Veranstaltungshallen',
        accessInfo: 'Öffentliche Zugänge',
        emergencyContact: '+49 172 8888888',
        isActive: true,
      },
    }),
    prisma.sMSObject.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[2].id,
        name: 'TechPark - Gebäude A',
        objectType: 'OFFICE',
        address: { street: 'Tech-Allee 100', city: 'Berlin', zipCode: '10243', country: 'DE' },
        size: '8000',
        floors: 5,
        description: 'Bürogebäude A im TechPark',
        accessInfo: 'Chipkarte erforderlich',
        emergencyContact: '+49 173 7777777',
        isActive: true,
      },
    }),
    prisma.sMSObject.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[2].id,
        name: 'TechPark - Gebäude B',
        objectType: 'OFFICE',
        address: { street: 'Tech-Allee 102', city: 'Berlin', zipCode: '10243', country: 'DE' },
        size: '6000',
        floors: 4,
        description: 'Bürogebäude B im TechPark',
        accessInfo: 'Chipkarte erforderlich',
        emergencyContact: '+49 173 7777776',
        isActive: true,
      },
    }),
    prisma.sMSObject.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[3].id,
        name: 'Messehalle Berlin',
        objectType: 'EVENT_VENUE',
        address: { street: 'Messeweg 5', city: 'Berlin', zipCode: '10367', country: 'DE' },
        size: '15000',
        floors: 1,
        description: 'Veranstaltungshalle für Messen und Events',
        accessInfo: 'Ticketsystem + Sicherheitscheck',
        emergencyContact: '+49 174 6666666',
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ ${objects.length} Objekte erstellt`);

  // ═══════════════════════════════════════════════════════
  // 4. DIENSTPLÄNE (Deployments)
  // ═══════════════════════════════════════════════════════
  console.log('\n📅 Erstelle Dienstpläne...');

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const deployments = await Promise.all([
    // Aktueller Monat
    prisma.deployment.create({
      data: {
        tenantId: tenant.id,
        objectId: objects[0].id,
        customerId: customers[0].id,
        plannedByUserId: employees[1].id, // Anna als Schichtleiter
        deploymentDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        startTime: '08:00',
        endTime: '16:00',
        status: 'CONFIRMED',
        notes: 'Reguläre Schicht Hauptgebäude',
      },
    }),
    prisma.deployment.create({
      data: {
        tenantId: tenant.id,
        objectId: objects[2].id,
        customerId: customers[2].id,
        plannedByUserId: employees[1].id,
        deploymentDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        startTime: '06:00',
        endTime: '22:00',
        status: 'CONFIRMED',
        notes: 'TechPark Gebäude A - Tagschicht',
      },
    }),
    // Nächster Monat
    prisma.deployment.create({
      data: {
        tenantId: tenant.id,
        objectId: objects[1].id,
        customerId: customers[1].id,
        plannedByUserId: employees[1].id,
        deploymentDate: new Date(today.getFullYear(), today.getMonth() + 1, 15),
        startTime: '18:00',
        endTime: '02:00',
        status: 'PLANNED',
        notes: 'Kulturveranstaltung - Abend',
      },
    }),
    prisma.deployment.create({
      data: {
        tenantId: tenant.id,
        objectId: objects[4].id,
        customerId: customers[3].id,
        plannedByUserId: employees[1].id,
        deploymentDate: new Date(today.getFullYear(), today.getMonth() + 1, 20),
        startTime: '09:00',
        endTime: '23:00',
        status: 'PLANNED',
        notes: 'Messeveranstaltung - Ganztags',
      },
    }),
  ]);
  console.log(`✅ ${deployments.length} Dienstpläne erstellt`);

  // ═══════════════════════════════════════════════════════
  // 5. ZEITERFASSUNG (Time Records)
  // ═══════════════════════════════════════════════════════
  console.log('\n⏰ Erstelle Zeiterfassung...');

  const timeRecords = await Promise.all([
    // Letzte Woche
    prisma.timeRecord.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[0].id, // Max
        deploymentId: deployments[0].id,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
        startTime: '08:00',
        endTime: '16:00',
        breakMinutes: 30,
        workMinutes: 450,
        status: 'APPROVED',
        approvedByUserId: employees[1].id,
        notes: 'Normale Schicht',
      },
    }),
    prisma.timeRecord.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[2].id, // Tom
        deploymentId: deployments[1].id,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
        startTime: '06:00',
        endTime: '14:00',
        breakMinutes: 30,
        workMinutes: 450,
        status: 'APPROVED',
        approvedByUserId: employees[1].id,
        notes: 'TechPark Frühschicht',
      },
    }),
    // Heute
    prisma.timeRecord.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[0].id, // Max
        deploymentId: deployments[0].id,
        date: today,
        startTime: '08:00',
        endTime: '16:00',
        breakMinutes: 30,
        workMinutes: 450,
        status: 'PENDING',
        notes: 'Heutige Schicht',
      },
    }),
    prisma.timeRecord.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[4].id, // Peter
        deploymentId: deployments[1].id,
        date: today,
        startTime: '14:00',
        endTime: '22:00',
        breakMinutes: 30,
        workMinutes: 450,
        status: 'PENDING',
        notes: 'TechPark Spätschicht',
      },
    }),
  ]);
  console.log(`✅ ${timeRecords.length} Zeiteinträge erstellt`);

  // ═══════════════════════════════════════════════════════
  // 6. RECHNUNGEN (Invoices)
  // ═══════════════════════════════════════════════════════
  console.log('\n💰 Erstelle Rechnungen...');

  const invoices = await Promise.all([
    prisma.customerInvoice.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[0].id,
        invoiceNumber: 'INV-2024-001',
        invoiceDate: new Date(today.getFullYear(), today.getMonth() - 1, 28),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 28),
        subtotal: 5000,
        taxRate: 19,
        taxAmount: 950,
        total: 5950,
        status: 'PAID',
        notes: 'Monatliche Abrechnung Müller GmbH',
      },
    }),
    prisma.customerInvoice.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[2].id,
        invoiceNumber: 'INV-2024-002',
        invoiceDate: new Date(today.getFullYear(), today.getMonth() - 1, 28),
        dueDate: new Date(today.getFullYear(), today.getMonth(), 28),
        subtotal: 12000,
        taxRate: 19,
        taxAmount: 2280,
        total: 14280,
        status: 'PENDING',
        notes: 'Monatliche Abrechnung TechPark',
      },
    }),
    prisma.customerInvoice.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[3].id,
        invoiceNumber: 'INV-2024-003',
        invoiceDate: today,
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30),
        subtotal: 3500,
        taxRate: 19,
        taxAmount: 665,
        total: 4165,
        status: 'DRAFT',
        notes: 'Veranstaltungsschutz Messe',
      },
    }),
  ]);
  console.log(`✅ ${invoices.length} Rechnungen erstellt`);

  // ═══════════════════════════════════════════════════════
  // 7. VERFÜGBARKEITEN (Availabilities)
  // ═══════════════════════════════════════════════════════
  console.log('\n📆 Erstelle Verfügbarkeiten...');

  const availabilities = await Promise.all([
    prisma.availability.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[0].id, // Max
        dayOfWeek: 1, // Montag
        startTime: '08:00',
        endTime: '16:00',
        type: 'AVAILABLE',
      },
    }),
    prisma.availability.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[0].id,
        dayOfWeek: 2, // Dienstag
        startTime: '08:00',
        endTime: '16:00',
        type: 'AVAILABLE',
      },
    }),
    prisma.availability.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[0].id,
        dayOfWeek: 3, // Mittwoch
        startTime: '08:00',
        endTime: '16:00',
        type: 'AVAILABLE',
      },
    }),
    prisma.availability.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[2].id, // Tom
        dayOfWeek: 1,
        startTime: '06:00',
        endTime: '14:00',
        type: 'AVAILABLE',
      },
    }),
    prisma.availability.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[2].id,
        dayOfWeek: 4,
        startTime: '06:00',
        endTime: '14:00',
        type: 'AVAILABLE',
      },
    }),
    prisma.availability.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[4].id, // Peter
        dayOfWeek: 2,
        startTime: '14:00',
        endTime: '22:00',
        type: 'AVAILABLE',
      },
    }),
    prisma.availability.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[4].id,
        dayOfWeek: 5,
        startTime: '14:00',
        endTime: '22:00',
        type: 'AVAILABLE',
      },
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
  console.log(`   👥 Mitarbeiter: ${employees.length}`);
  console.log(`   🏢 Kunden: ${customers.length}`);
  console.log(`   🏗️ Objekte: ${objects.length}`);
  console.log(`   📅 Dienstpläne: ${deployments.length}`);
  console.log(`   ⏰ Zeiterfassung: ${timeRecords.length}`);
  console.log(`   💰 Rechnungen: ${invoices.length}`);
  console.log(`   📆 Verfügbarkeiten: ${availabilities.length}`);
  console.log('\n🔐 Login:');
  console.log('   Tenant User: demo / Demo123!');
  console.log('   Platform Admin: admin@sms-platform.com / Admin123!');
  console.log('\n🌐 URLs:');
  console.log('   Tenant Login: http://92.5.64.224:3000/login');
  console.log('   Platform Login: http://92.5.64.224:3000/platform/login');
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Erstellen der Demo-Daten:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
