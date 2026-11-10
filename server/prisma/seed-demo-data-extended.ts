/**
 * Erweiterte Demo-Daten für alle neuen Features
 * 
 * Dieses Script erweitert die Basis-Demo-Daten um:
 * - Kontakt-Personen bei Kunden
 * - Kundendokumente mit Versionierung
 * - Schichtberichte
 * - Erinnerungen / Mahnwesen
 * - Support-Tickets
 * - Benachrichtigungen
 * - Feedback-Einträge
 * - Erweiterte Kunden-Daten (Verträge, Rechnungsadressen)
 * 
 * Ausführung: npx tsx prisma/seed-demo-data-extended.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte erweiterte Demo-Daten-Generierung...\n');

  // Tenant finden
  const tenant = await prisma.tenant.findUnique({ where: { tenantId: 'DEMO-001' } });
  if (!tenant) {
    console.error('❌ Demo Tenant nicht gefunden! Bitte zuerst seed-demo.ts ausführen.');
    process.exit(1);
  }
  console.log('✅ Tenant gefunden:', tenant.companyName);

  // Bestehende Daten laden
  const users = await prisma.user.findMany({ where: { tenantId: tenant.id } });
  const employees = await prisma.employee.findMany({ where: { tenantId: tenant.id } });
  const customers = await prisma.customer.findMany({ where: { tenantId: tenant.id } });
  const objects = await prisma.sMSObject.findMany({ where: { tenantId: tenant.id } });
  const invoices = await prisma.customerInvoice.findMany({ where: { tenantId: tenant.id } });
  const deployments = await prisma.deployment.findMany({ where: { tenantId: tenant.id } });

  if (customers.length === 0) {
    console.error('❌ Keine Kunden gefunden! Bitte zuerst seed-demo-data.ts ausführen.');
    process.exit(1);
  }

  console.log(`📊 Bestehende Daten: ${users.length} User, ${employees.length} Mitarbeiter, ${customers.length} Kunden, ${objects.length} Objekte\n`);

  // ═══════════════════════════════════════════════════════
  // 1. KUNDEN-DATEN ERWEITERN (Verträge, Rechnungsadressen)
  // ═══════════════════════════════════════════════════════
  console.log('📝 Aktualisiere Kunden mit erweiterten Daten...');

  const mullerGmbh = customers.find(c => c.customerNumber === 'KD-001');
  const kulturamt = customers.find(c => c.customerNumber === 'KD-002');
  const techPark = customers.find(c => c.customerNumber === 'KD-003');
  const eventCompany = customers.find(c => c.customerNumber === 'KD-004');

  if (mullerGmbh) {
    await prisma.customer.update({
      where: { id: mullerGmbh.id },
      data: {
        // Rechnungsdaten
        invoiceEmail: 'rechnung@mueller-gmbh.de',
        invoiceStreet: 'Industriestraße 50',
        invoiceZipCode: '10555',
        invoiceCity: 'Berlin',
        invoiceCountry: 'DE',
        invoiceRecipientName: 'Hans Müller - Geschäftsführung',
        invoiceDeliveryMethod: 'email',
        
        // Steuerdaten
        taxNumber: '11/234/56789',
        vatId: 'DE123456789',
        
        // Vertragsdaten
        contractNumber: 'VTR-2023-001',
        contractStartDate: new Date('2023-01-01'),
        contractEndDate: null, // Unbefristet
        terminationNoticePeriod: 90,
        billingType: 'lumpSum',
        billingInterval: 'monthly',
        paymentTerms: 14,
        purchaseOrderNumber: 'PO-MUE-2024-001',
      },
    });
  }

  if (kulturamt) {
    await prisma.customer.update({
      where: { id: kulturamt.id },
      data: {
        invoiceEmail: 'abrechnung@berlin.de',
        invoiceRecipientName: 'Stadt Berlin - Kulturamt - Finanzabteilung',
        invoiceDeliveryMethod: 'email',
        taxNumber: '27/830/00345',
        vatId: 'DE811175105',
        contractNumber: 'VTR-2022-015',
        contractStartDate: new Date('2022-06-01'),
        billingType: 'hourly',
        billingInterval: 'monthly',
        paymentTerms: 30,
      },
    });
  }

  if (techPark) {
    await prisma.customer.update({
      where: { id: techPark.id },
      data: {
        invoiceEmail: 'finance@techpark.de',
        invoiceStreet: 'Tech-Allee 100',
        invoiceZipCode: '10243',
        invoiceCity: 'Berlin',
        invoiceRecipientName: 'TechPark Berlin - Finanzabteilung',
        invoiceDeliveryMethod: 'portal',
        taxNumber: '15/345/67890',
        vatId: 'DE987654321',
        contractNumber: 'VTR-2023-042',
        contractStartDate: new Date('2023-09-01'),
        billingType: 'perPost',
        billingInterval: 'monthly',
        paymentTerms: 14,
      },
    });
  }

  if (eventCompany) {
    await prisma.customer.update({
      where: { id: eventCompany.id },
      data: {
        invoiceEmail: 'billing@ec-berlin.de',
        invoiceRecipientName: 'Event Company Berlin',
        invoiceDeliveryMethod: 'email',
        contractNumber: 'VTR-2024-008',
        contractStartDate: new Date('2024-01-15'),
        billingType: 'hourly',
        billingInterval: 'monthly',
        paymentTerms: 7,
      },
    });
  }

  console.log('✅ Kundendaten erweitert\n');

  // ═══════════════════════════════════════════════════════
  // 2. KONTAKT-PERSONEN
  // ═══════════════════════════════════════════════════════
  console.log('👥 Erstelle Kontakt-Personen...');

  const contactPersons = await Promise.all([
    // Müller GmbH
    prisma.contactPerson.create({
      data: {
        tenantId: tenant.id,
        customerId: mullerGmbh!.id,
        firstName: 'Hans',
        lastName: 'Müller',
        role: 'Geschäftsführer',
        phone: '+49 30 12345678',
        mobile: '+49 171 98765432',
        email: 'hans.mueller@mueller-gmbh.de',
        isPrimary: true,
        isInvoiceContact: true,
        isEmergencyContact: true,
      },
    }),
    prisma.contactPerson.create({
      data: {
        tenantId: tenant.id,
        customerId: mullerGmbh!.id,
        firstName: 'Sabine',
        lastName: 'Müller',
        role: 'Objektbetreuung',
        phone: '+49 30 12345679',
        mobile: '+49 172 87654321',
        email: 'sabine.mueller@mueller-gmbh.de',
        isPrimary: false,
        isInvoiceContact: false,
        isEmergencyContact: true,
        availability: 'Mo-Fr 08:00-16:00',
      },
    }),
    // Kulturamt
    prisma.contactPerson.create({
      data: {
        tenantId: tenant.id,
        customerId: kulturamt!.id,
        firstName: 'Dr. Thomas',
        lastName: 'Berger',
        role: 'Amtsleiter',
        phone: '+49 30 98765432',
        email: 'thomas.berger@berlin.de',
        isPrimary: true,
        isInvoiceContact: true,
      },
    }),
    // TechPark
    prisma.contactPerson.create({
      data: {
        tenantId: tenant.id,
        customerId: techPark!.id,
        firstName: 'Michael',
        lastName: 'Schneider',
        role: 'Sicherheitskoordinator',
        phone: '+49 30 5551234',
        mobile: '+49 173 1112233',
        email: 'm.schneider@techpark.de',
        isPrimary: true,
        isInvoiceContact: true,
        isEmergencyContact: true,
        availability: 'Mo-Fr 07:00-18:00',
        notes: 'Hauptansprechpartner für Sicherheit',
      },
    }),
    prisma.contactPerson.create({
      data: {
        tenantId: tenant.id,
        customerId: techPark!.id,
        firstName: 'Julia',
        lastName: 'Hartmann',
        role: 'Facility Manager',
        phone: '+49 30 5551235',
        email: 'j.hartmann@techpark.de',
        isPrimary: false,
        isInvoiceContact: false,
        isEmergencyContact: true,
      },
    }),
    // Event Company
    prisma.contactPerson.create({
      data: {
        tenantId: tenant.id,
        customerId: eventCompany!.id,
        firstName: 'Frank',
        lastName: 'Weber',
        role: 'Geschäftsführer',
        phone: '+49 30 7778899',
        mobile: '+49 175 4433221',
        email: 'frank.weber@ec-berlin.de',
        isPrimary: true,
        isInvoiceContact: true,
        isEmergencyContact: true,
      },
    }),
  ]);

  console.log(`✅ ${contactPersons.length} Kontakt-Personen erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 3. KUNDEN-DOKUMENTE
  // ═══════════════════════════════════════════════════════
  console.log('📄 Erstelle Kunden-Dokumente...');

  const today = new Date();
  
  const customerDocuments = await Promise.all([
    // Müller GmbH - Vertrag
    prisma.customerDocument.create({
      data: {
        tenantId: tenant.id,
        customerId: mullerGmbh!.id,
        documentNumber: 'KD-DOC-001',
        name: 'Sicherheitsvertrag Müller GmbH',
        documentType: 'contract',
        category: 'Vertrag',
        fileUrl: '/documents/vertrag-mueller-gmbh.pdf',
        fileSize: 245678,
        mimeType: 'application/pdf',
        version: 1,
        isLatest: true,
        uploadedById: users[0].id,
        uploadedAt: new Date('2023-01-01'),
        expiresAt: null, // Unbefristet
        retentionPeriodMonths: 120, // 10 Jahre
        deleteAt: new Date(today.getFullYear() + 10, today.getMonth(), today.getDate()),
        purpose: 'contract_fulfillment',
        notes: 'Hauptvertrag für Objektsicherung',
      },
    }),
    // Müller GmbH - Hausordnung
    prisma.customerDocument.create({
      data: {
        tenantId: tenant.id,
        customerId: mullerGmbh!.id,
        documentNumber: 'KD-DOC-002',
        name: 'Hausordnung Müller GmbH',
        documentType: 'regulation',
        category: 'Vorschriften',
        fileUrl: '/documents/hausordnung-mueller.pdf',
        fileSize: 123456,
        mimeType: 'application/pdf',
        version: 2,
        isLatest: true,
        uploadedById: users[0].id,
        uploadedAt: new Date('2024-03-15'),
        purpose: 'contract_fulfillment',
      },
    }),
    // Kulturamt - Vertrag
    prisma.customerDocument.create({
      data: {
        tenantId: tenant.id,
        customerId: kulturamt!.id,
        documentNumber: 'KD-DOC-003',
        name: 'Dienstleistungsvertrag Kulturamt',
        documentType: 'contract',
        category: 'Vertrag',
        fileUrl: '/documents/vertrag-kulturamt.pdf',
        fileSize: 345678,
        mimeType: 'application/pdf',
        version: 1,
        isLatest: true,
        uploadedById: users[0].id,
        uploadedAt: new Date('2022-06-01'),
        purpose: 'contract_fulfillment',
      },
    }),
    // Kulturamt - Hygieneschutzordnung
    prisma.customerDocument.create({
      data: {
        tenantId: tenant.id,
        customerId: kulturamt!.id,
        documentNumber: 'KD-DOC-004',
        name: 'Hygieneschutzordnung Kulturzentrum',
        documentType: 'regulation',
        category: 'Vorschriften',
        fileUrl: '/documents/hygienekonzept-kulturamt.pdf',
        fileSize: 234567,
        mimeType: 'application/pdf',
        version: 1,
        isLatest: true,
        uploadedById: users[0].id,
        uploadedAt: new Date('2024-01-10'),
        expiresAt: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
        purpose: 'contract_fulfillment',
      },
    }),
    // TechPark - Vertrag
    prisma.customerDocument.create({
      data: {
        tenantId: tenant.id,
        customerId: techPark!.id,
        documentNumber: 'KD-DOC-005',
        name: 'Sicherheitsdienstleistungsvertrag TechPark',
        documentType: 'contract',
        category: 'Vertrag',
        fileUrl: '/documents/vertrag-techpark.pdf',
        fileSize: 456789,
        mimeType: 'application/pdf',
        version: 1,
        isLatest: true,
        uploadedById: users[0].id,
        uploadedAt: new Date('2023-09-01'),
        purpose: 'contract_fulfillment',
      },
    }),
    // TechPark - Schlüsselübergabeprotokoll
    prisma.customerDocument.create({
      data: {
        tenantId: tenant.id,
        customerId: techPark!.id,
        documentNumber: 'KD-DOC-006',
        name: 'Schlüsselübergabeprotokoll Gebäude A+B',
        documentType: 'key_protocol',
        category: 'Zugang',
        fileUrl: '/documents/schluesselprotokoll-techpark.pdf',
        fileSize: 98765,
        mimeType: 'application/pdf',
        version: 1,
        isLatest: true,
        uploadedById: users[0].id,
        uploadedAt: new Date('2023-09-15'),
        purpose: 'contract_fulfillment',
      },
    }),
    // Event Company - Veranstaltungsschutz Konzept
    prisma.customerDocument.create({
      data: {
        tenantId: tenant.id,
        customerId: eventCompany!.id,
        documentNumber: 'KD-DOC-007',
        name: 'Sicherheitskonzept Messehalle',
        documentType: 'concept',
        category: 'Konzepte',
        fileUrl: '/documents/sicherheitskonzept-messe.pdf',
        fileSize: 567890,
        mimeType: 'application/pdf',
        version: 3,
        isLatest: true,
        uploadedById: users[0].id,
        uploadedAt: new Date(today.getFullYear(), today.getMonth() - 2, 15),
        expiresAt: new Date(today.getFullYear() + 1, today.getMonth() - 2, 15),
        purpose: 'contract_fulfillment',
        notes: 'Aktualisiert für 2024 Veranstaltungssaison',
      },
    }),
  ]);

  console.log(`✅ ${customerDocuments.length} Kunden-Dokumente erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 4. SCHICHTBERICHTE
  // ═══════════════════════════════════════════════════════
  console.log('📋 Erstelle Schichtberichte...');

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const shiftReports = await Promise.all([
    // Bericht von Max Mustermann - Müller GmbH
    prisma.shiftReport.create({
      data: {
        tenantId: tenant.id,
        objectId: objects[0].id, // Müller Hauptgebäude
        employeeId: employees[0].id,
        reportDate: lastWeek,
        shiftStart: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 8, 0),
        shiftEnd: new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate(), 16, 0),
        weather: 'sunny',
        personnelCount: 1,
        visitorCount: 23,
        incidents: JSON.stringify([]),
        specialTasks: JSON.stringify([
          { task: 'Brandalarm Probe', completed: true, notes: '10:00 Uhr - alles ok' }
        ]),
        patrolChecks: JSON.stringify([
          { location: 'EG Flur', time: '09:00', status: 'ok' },
          { location: '1. OG Büro', time: '10:30', status: 'ok' },
          { location: '2. OG Serverraum', time: '12:00', status: 'ok' },
          { location: 'UG Tiefgarage', time: '14:00', status: 'ok' },
        ]),
        handoverNotes: 'Übergabe an Abendteam: Keine Besonderheiten',
        status: 'approved',
        approvedById: users[2].id, // Teamleiter
        approvedAt: lastWeek,
        submittedAt: lastWeek,
      },
    }),
    // Bericht von Tom Weber - TechPark
    prisma.shiftReport.create({
      data: {
        tenantId: tenant.id,
        objectId: objects[2].id, // TechPark Gebäude A
        employeeId: employees[2].id,
        reportDate: twoDaysAgo,
        shiftStart: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 6, 0),
        shiftEnd: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 14, 0),
        weather: 'cloudy',
        personnelCount: 1,
        visitorCount: 45,
        incidents: JSON.stringify([
          {
            time: '11:30',
            type: 'minor',
            description: 'Zugangsproblem - Mitarbeiterausweis defekt',
            action: 'Temporären Ausweis ausgestellt',
            severity: 'low',
          }
        ]),
        specialTasks: JSON.stringify([
          { task: 'Feueralarm-Zentrale kontrolliert', completed: true }
        ]),
        patrolChecks: JSON.stringify([
          { location: 'Eingang Nord', time: '07:00', status: 'ok' },
          { location: 'Parkdeck', time: '09:00', status: 'ok' },
          { location: 'Technikraum', time: '11:00', status: 'issue', notes: 'Wassermeldeanlage Test' },
          { location: 'Dach', time: '13:00', status: 'ok' },
        ]),
        handoverNotes: 'Technikraum: Wassermeldeanlage wurde gewartet (geplant)',
        status: 'submitted',
        submittedAt: twoDaysAgo,
      },
    }),
    // Heutiger Bericht - noch im Entwurf
    prisma.shiftReport.create({
      data: {
        tenantId: tenant.id,
        objectId: objects[0].id, // Müller Hauptgebäude
        employeeId: employees[0].id,
        reportDate: today,
        shiftStart: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0),
        shiftEnd: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
        weather: 'rainy',
        personnelCount: 1,
        visitorCount: 12,
        incidents: JSON.stringify([]),
        specialTasks: JSON.stringify([]),
        patrolChecks: JSON.stringify([
          { location: 'EG Eingang', time: '08:30', status: 'ok' },
          { location: '1. OG', time: '10:00', status: 'ok' },
        ]),
        handoverNotes: '',
        status: 'draft',
      },
    }),
    // Anna Schmidt - Kulturzentrum Nachtschicht
    prisma.shiftReport.create({
      data: {
        tenantId: tenant.id,
        objectId: objects[1].id, // Kulturzentrum
        employeeId: employees[1].id,
        reportDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
        shiftStart: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 18, 0),
        shiftEnd: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 2, 0),
        weather: 'clear',
        personnelCount: 2,
        visitorCount: 234,
        incidents: JSON.stringify([
          {
            time: '22:15',
            type: 'medium',
            description: 'Streit zwischen Besuchern an der Kasse',
            action: 'Schlichtung, Hausverweis ausgesprochen',
            severity: 'medium',
          }
        ]),
        specialTasks: JSON.stringify([
          { task: 'VIP-Bereich abgesichert', completed: true },
          { task: 'Kassenabschluss überwacht', completed: true },
        ]),
        patrolChecks: JSON.stringify([
          { location: 'Eingang West', time: '19:00', status: 'ok' },
          { location: 'Kassenbereich', time: '22:00', status: 'issue', notes: 'Streit' },
          { location: 'Notausgänge', time: '00:00', status: 'ok' },
          { location: 'Parkplatz', time: '01:30', status: 'ok' },
        ]),
        handoverNotes: 'Vorfall dokumentiert, Polizei war nicht nötig. Hausverweis für Person X.',
        status: 'approved',
        approvedById: users[2].id,
        approvedAt: today,
        submittedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 3, 0),
      },
    }),
  ]);

  console.log(`✅ ${shiftReports.length} Schichtberichte erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 5. ERINNERUNGEN / MAHNWESEN
  // ═══════════════════════════════════════════════════════
  console.log('📧 Erstelle Erinnerungen (Mahnwesen)...');

  // Erinnerung für offene Rechnung TechPark
  const techParkInvoice = invoices.find(inv => 
    inv.customerId === techPark?.id && inv.status === 'sent'
  );

  const reminders = [];

  if (techParkInvoice) {
    // Zahlungserinnerung
    reminders.push(await prisma.reminder.create({
      data: {
        tenantId: tenant.id,
        invoiceId: techParkInvoice.id,
        reminderNumber: 'REM-001',
        reminderType: 'reminder1',
        reminderDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14),
        dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 21),
        amount: techParkInvoice.totalAmount,
        lateFee: 0,
        message: 'Zahlungserinnerung - Bitte überweisen Sie den offenen Betrag innerhalb von 7 Tagen.',
        sent: false,
        paid: false,
        createdById: users[4].id, // Buchhaltung
      },
    }));
  }

  // Beispiel für eine bereits gemahnte Rechnung
  const mullerInvoice = invoices.find(inv => 
    inv.customerId === mullerGmbh?.id && inv.status === 'paid'
  );

  if (mullerInvoice) {
    reminders.push(await prisma.reminder.create({
      data: {
        tenantId: tenant.id,
        invoiceId: mullerInvoice.id,
        reminderNumber: 'REM-002',
        reminderType: 'reminder1',
        reminderDate: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 8),
        amount: mullerInvoice.totalAmount,
        lateFee: 0,
        message: 'Zahlungserinnerung',
        sent: true,
        paid: true,
        paidAt: new Date(today.getFullYear(), today.getMonth() - 1, 5),
        createdById: users[4].id,
      },
    }));
  }

  console.log(`✅ ${reminders.length} Erinnerungen erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 6. SUPPORT-TICKETS
  // ═══════════════════════════════════════════════════════
  console.log('🎫 Erstelle Support-Tickets...');

  const supportTickets = await Promise.all([
    prisma.supportTicket.create({
      data: {
        tenantId: tenant.id,
        userId: users[0].id,
        ticketNumber: 'SUP-2024-0001',
        category: 'technical',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        subject: 'Login-Problem nach Update',
        description: 'Seit dem letzten Update kann ich mich nicht mehr mit Chrome anmelden. Firefox funktioniert.',
        contactEmail: 'demo@protektor.de',
        assignedTo: null,
        createdAt: new Date(today.getFullYear(), today.getMonth() - 1, 15),
      },
    }),
    prisma.supportTicket.create({
      data: {
        tenantId: tenant.id,
        userId: users[1].id,
        ticketNumber: 'SUP-2024-0002',
        category: 'feature_request',
        priority: 'LOW',
        status: 'OPEN',
        subject: 'Feature-Wunsch: Mobile App',
        description: 'Wäre es möglich, eine native Mobile App für iOS und Android zu entwickeln?',
        contactEmail: 'sabine@demo.de',
        createdAt: new Date(today.getFullYear(), today.getMonth(), 1),
      },
    }),
    prisma.supportTicket.create({
      data: {
        tenantId: tenant.id,
        userId: users[4].id,
        ticketNumber: 'SUP-2024-0003',
        category: 'billing',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        subject: 'Frage zur Rechnungstellung',
        description: 'Wie kann ich Sammelrechnungen für mehrere Kunden erstellen?',
        contactEmail: 'claudia@demo.de',
        resolvedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
        resolution: 'Sammelrechnungen können über den DATEV-Export erstellt werden. Siehe Dokumentation.',
        createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5),
      },
    }),
    prisma.supportTicket.create({
      data: {
        tenantId: tenant.id,
        userId: users[3].id,
        ticketNumber: 'SUP-2024-0004',
        category: 'bug',
        priority: 'URGENT',
        status: 'OPEN',
        subject: 'Zeiterfassung zeigt falsche Stunden an',
        description: 'Bei der Wochenübersicht werden 45 Stunden angezeigt, ich habe aber nur 40 gearbeitet.',
        contactEmail: 'max@demo.de',
        createdAt: today,
      },
    }),
  ]);

  // Nachrichten zu Tickets hinzufügen
  await Promise.all([
    prisma.supportTicketMessage.create({
      data: {
        ticketId: supportTickets[0].id,
        userId: users[0].id,
        isAdmin: false,
        message: 'Seit dem letzten Update kann ich mich nicht mehr mit Chrome anmelden. Firefox funktioniert.',
        createdAt: new Date(today.getFullYear(), today.getMonth() - 1, 15),
      },
    }),
    prisma.supportTicketMessage.create({
      data: {
        ticketId: supportTickets[0].id,
        isAdmin: true,
        message: 'Vielen Dank für die Meldung. Könnten Sie bitte die Chrome-Version und das Betriebssystem mitteilen?',
        createdAt: new Date(today.getFullYear(), today.getMonth() - 1, 15, 14, 30),
      },
    }),
    prisma.supportTicketMessage.create({
      data: {
        ticketId: supportTickets[0].id,
        userId: users[0].id,
        isAdmin: false,
        message: 'Chrome Version 120.0.6099.130, Windows 11 Pro',
        createdAt: new Date(today.getFullYear(), today.getMonth() - 1, 16, 9, 15),
      },
    }),
    prisma.supportTicketMessage.create({
      data: {
        ticketId: supportTickets[3].id,
        userId: users[3].id,
        isAdmin: false,
        message: 'Bei der Wochenübersicht werden 45 Stunden angezeigt, ich habe aber nur 40 gearbeitet.',
        createdAt: today,
      },
    }),
  ]);

  console.log(`✅ ${supportTickets.length} Support-Tickets erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 7. BENACHRICHTIGUNGEN
  // ═══════════════════════════════════════════════════════
  console.log('🔔 Erstelle Benachrichtigungen...');

  const notifications = await Promise.all([
    // Für Admin
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'info',
        title: 'Willkommen bei Protektor!',
        message: 'Ihr Account wurde erfolgreich eingerichtet. Erkunden Sie die neuen Features.',
        isRead: true,
        readAt: new Date(today.getTime() - 86400000),
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'system',
        title: 'System-Update verfügbar',
        message: 'Version 2.1.0 ist verfügbar mit neuen Features für die Dienstplanung.',
        isRead: false,
      },
    }),
    // Für Disponentin
    prisma.notification.create({
      data: {
        userId: users[1].id,
        type: 'deployment',
        title: 'Neue Schicht zugewiesen',
        message: 'Max Mustermann wurde für morgen 08:00-16:00 bei Müller GmbH eingeteilt.',
        resourceType: 'deployment',
        resourceId: deployments[0]?.id,
        isRead: true,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[1].id,
        type: 'reminder',
        title: 'Schicht nicht bestätigt',
        message: 'Tom Weber hat die Schicht für morgen noch nicht bestätigt.',
        isRead: false,
      },
    }),
    // Für Teamleiter
    prisma.notification.create({
      data: {
        userId: users[2].id,
        type: 'shift_report',
        title: 'Schichtbericht zur Genehmigung',
        message: 'Tom Weber hat einen Schichtbericht für TechPark eingereicht.',
        resourceType: 'shift_report',
        resourceId: shiftReports[1]?.id,
        isRead: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[2].id,
        type: 'document',
        title: 'Neues Dokument hochgeladen',
        message: 'Sicherheitskonzept Messehalle (Version 3) wurde hochgeladen.',
        resourceType: 'document',
        resourceId: customerDocuments[6]?.id,
        isRead: false,
      },
    }),
    // Für Mitarbeiter Max
    prisma.notification.create({
      data: {
        userId: users[3].id,
        type: 'deployment',
        title: 'Schicht morgen',
        message: 'Erinnerung: Sie haben morgen 08:00-16:00 Schicht bei Müller GmbH.',
        isRead: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[3].id,
        type: 'invoice',
        title: 'Zeiten genehmigt',
        message: 'Ihre Zeiten für letzte Woche wurden genehmigt.',
        isRead: true,
        readAt: new Date(today.getTime() - 43200000), // vor 12h
      },
    }),
    // Für Buchhaltung
    prisma.notification.create({
      data: {
        userId: users[4].id,
        type: 'invoice',
        title: 'Rechnung überfällig',
        message: 'Rechnung INV-2024-002 (TechPark) ist seit 14 Tagen überfällig.',
        resourceType: 'invoice',
        resourceId: invoices[1]?.id,
        isRead: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[4].id,
        type: 'info',
        title: 'Monatsabrechnung bereit',
        message: 'Die Abrechnung für den letzten Monat kann erstellt werden.',
        isRead: false,
      },
    }),
  ]);

  console.log(`✅ ${notifications.length} Benachrichtigungen erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 8. FEEDBACK
  // ═══════════════════════════════════════════════════════
  console.log('💬 Erstelle Feedback-Einträge...');

  const feedbacks = await Promise.all([
    prisma.feedback.create({
      data: {
        tenantId: tenant.id,
        userId: users[1].id,
        feedbackType: 'FEATURE_REQUEST',
        subject: 'Drag & Drop Dienstplanung',
        message: 'Es wäre super, wenn man Schichten per Drag & Drop verschieben könnte.',
        context: 'scheduling',
        rating: null,
        status: 'NEW',
      },
    }),
    prisma.feedback.create({
      data: {
        tenantId: tenant.id,
        userId: users[3].id,
        feedbackType: 'IMPROVEMENT',
        subject: 'Mobile Zeitbuchung',
        message: 'Die mobile Zeitbuchung funktioniert, aber die Buttons sind zu klein für Touchscreens.',
        context: 'time_tracking',
        rating: 3,
        status: 'ACKNOWLEDGED',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        browser: 'Safari Mobile',
      },
    }),
    prisma.feedback.create({
      data: {
        tenantId: tenant.id,
        userId: users[4].id,
        feedbackType: 'COMPLIMENT',
        subject: 'Tolles Update!',
        message: 'Die neuen Kundenmanagement-Features sind hervorragend! Genau das haben wir gebraucht.',
        context: 'customer_management',
        rating: 5,
        status: 'NEW',
      },
    }),
    prisma.feedback.create({
      data: {
        tenantId: tenant.id,
        userId: users[0].id,
        feedbackType: 'BUG_REPORT',
        subject: 'Export-Fehler bei großen Datenmengen',
        message: 'Der CSV-Export bricht ab wenn mehr als 1000 Zeilen exportiert werden.',
        context: 'export',
        rating: 2,
        status: 'IN_PROGRESS',
      },
    }),
  ]);

  console.log(`✅ ${feedbacks.length} Feedback-Einträge erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 9. KONTAKT-ANFRAGEN
  // ═══════════════════════════════════════════════════════
  console.log('📞 Erstelle Kontakt-Anfragen...');

  const contactRequests = await Promise.all([
    prisma.contactRequest.create({
      data: {
        tenantId: tenant.id,
        name: 'Michael Schmidt',
        email: 'm.schmidt@example-sicherheit.de',
        phone: '+49 176 12345678',
        company: 'Schmidt Security GmbH',
        subject: 'Demo anfragen',
        message: 'Wir interessieren uns für Protektor und würden gerne eine Demo sehen. Können Sie einen Termin vereinbaren?',
        requestType: 'demo',
        status: 'NEW',
      },
    }),
    prisma.contactRequest.create({
      data: {
        name: 'Sandra Klein',
        email: 'sandra.klein@event-kg.de',
        company: 'Event KG',
        subject: 'Preise für Event-Schutz',
        message: 'Was kostet Protektor für einen Sicherheitsdienst mit 50 Mitarbeitern?',
        requestType: 'pricing',
        status: 'RESPONDED',
        processedAt: new Date(today.getTime() - 86400000 * 2),
      },
    }),
    prisma.contactRequest.create({
      data: {
        tenantId: tenant.id,
        name: 'Thomas Braun',
        email: 't.braun@partner.de',
        company: 'Sicherheitsverbund Deutschland',
        subject: 'Partnerschaftsanfrage',
        message: 'Wir würden gerne Partner von Protektor werden. Gibt es ein Partnerprogramm?',
        requestType: 'partnership',
        status: 'NEW',
      },
    }),
  ]);

  console.log(`✅ ${contactRequests.length} Kontakt-Anfragen erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 10. HILFE-ARTIKEL
  // ═══════════════════════════════════════════════════════
  console.log('📚 Erstelle Hilfe-Artikel...');

  const helpArticles = await Promise.all([
    prisma.helpArticle.create({
      data: {
        category: 'user',
        subcategory: 'getting_started',
        title: 'Erste Schritte mit Protektor',
        slug: 'erste-schritte',
        content: '# Willkommen bei Protektor\n\nDiese Anleitung führt Sie durch die ersten Schritte...\n\n## Anmeldung\n\nMelden Sie sich mit Ihren Zugangsdaten an...\n\n## Dashboard\n\nDas Dashboard gibt Ihnen einen Überblick...',
        tags: ['einrichtung', 'start', 'anmeldung'],
        isPublished: true,
        sortOrder: 1,
      },
    }),
    prisma.helpArticle.create({
      data: {
        category: 'user',
        subcategory: 'scheduling',
        title: 'Dienstplanung erstellen',
        slug: 'dienstplanung-erstellen',
        content: '# Dienstplanung\n\nSo erstellen Sie eine neue Dienstplanung...\n\n## Mitarbeiter zuweisen\n\n1. Klicken Sie auf "Neue Schicht"\n2. Wählen Sie einen Mitarbeiter aus\n3. Definieren Sie Zeitraum und Objekt...',
        tags: ['dienstplan', 'schicht', 'zuweisung'],
        isPublished: true,
        sortOrder: 2,
      },
    }),
    prisma.helpArticle.create({
      data: {
        category: 'admin',
        subcategory: 'customer',
        title: 'Kunden verwalten',
        slug: 'kunden-verwalten',
        content: '# Kundenverwaltung\n\n## Neuen Kunden anlegen\n\n1. Navigieren Sie zu "Kunden"\n2. Klicken Sie auf "Neuer Kunde"\n3. Füllen Sie die Pflichtfelder aus\n\n## Kundennummer\n\nDie Kundennummer wird automatisch generiert im Format KD-JAHR-NR...',
        tags: ['kunde', 'verwaltung', 'kd-nummer'],
        isPublished: true,
        sortOrder: 3,
      },
    }),
    prisma.helpArticle.create({
      data: {
        category: 'admin',
        subcategory: 'billing',
        title: 'Rechnungen erstellen',
        slug: 'rechnungen-erstellen',
        content: '# Rechnungen\n\n## Automatische Abrechnung\n\nProtektor kann Rechnungen automatisch basierend auf den erfassten Zeiten erstellen...\n\n## Mahnwesen\n\nDas 3-stufige Mahnwesen unterstützt Sie bei der Zahlungserinnerung...',
        tags: ['rechnung', 'abrechnung', 'mahnwesen'],
        isPublished: true,
        sortOrder: 4,
      },
    }),
    prisma.helpArticle.create({
      data: {
        category: 'troubleshooting',
        subcategory: 'login',
        title: 'Login-Probleme beheben',
        slug: 'login-probleme',
        content: '# Login-Probleme\n\n## Passwort vergessen?\n\nNutzen Sie die "Passwort vergessen"-Funktion...\n\n## Account gesperrt?\n\nNach 5 fehlgeschlagenen Versuchen wird der Account für 15 Minuten gesperrt...',
        tags: ['login', 'passwort', 'problem', 'hilfe'],
        isPublished: true,
        sortOrder: 10,
        viewCount: 145,
      },
    }),
  ]);

  console.log(`✅ ${helpArticles.length} Hilfe-Artikel erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // ZUSAMMENFASSUNG
  // ═══════════════════════════════════════════════════════
  console.log('═'.repeat(60));
  console.log('🎉 Erweiterte Demo-Daten erfolgreich erstellt!');
  console.log('═'.repeat(60));
  console.log('\n📊 Neue Daten:');
  console.log(`   📝 Kunden erweitert: ${customers.length} (mit Verträgen, Rechnungsdaten)`);
  console.log(`   👥 Kontakt-Personen: ${contactPersons.length}`);
  console.log(`   📄 Kunden-Dokumente: ${customerDocuments.length}`);
  console.log(`   📋 Schichtberichte: ${shiftReports.length}`);
  console.log(`   📧 Erinnerungen: ${reminders.length}`);
  console.log(`   🎫 Support-Tickets: ${supportTickets.length}`);
  console.log(`   🔔 Benachrichtigungen: ${notifications.length}`);
  console.log(`   💬 Feedback: ${feedbacks.length}`);
  console.log(`   📞 Kontakt-Anfragen: ${contactRequests.length}`);
  console.log(`   📚 Hilfe-Artikel: ${helpArticles.length}`);
  
  console.log('\n📝 Hinweis:');
  console.log('   - Alle neuen Features sind mit Demo-Daten gefüllt');
  console.log('   - Schichtberichte haben verschiedene Status (draft, submitted, approved)');
  console.log('   - Support-Tickets haben Konversations-Verläufe');
  console.log('   - Kunden haben vollständige Vertrags- und Rechnungsdaten');
  console.log('   - Help-Artikel können unter /api/v1/help/articles abgerufen werden');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
