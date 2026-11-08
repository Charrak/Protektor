import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Datenbank-Seed...');

  // ─── Rollen erstellen ───
  const roles = [
    { name: 'Administrator', slug: 'administrator', description: 'Voller Systemzugriff', isSystem: true },
    { name: 'Geschäftsführung', slug: 'management', description: 'Zugriff auf alle Geschäftsbereiche', isSystem: true },
    { name: 'Disposition', slug: 'dispatch', description: 'Dienstplanung und Einsatzkoordination', isSystem: true },
    { name: 'Personalverwaltung', slug: 'hr', description: 'Mitarbeiterstammdaten und Verträge', isSystem: true },
    { name: 'Buchhaltung', slug: 'accounting', description: 'Abrechnungen und Rechnungen', isSystem: true },
    { name: 'Einsatzleitung', slug: 'field_supervisor', description: 'Zeiterfassung und Einsatzbestätigung', isSystem: true },
    { name: 'Mitarbeiter', slug: 'employee', description: 'Eigene Daten einsehen', isSystem: true },
  ];

  const createdRoles: Record<string, { id: string }> = {};
  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description },
      create: role,
    });
    createdRoles[role.slug] = { id: created.id };
    console.log(`  Rolle erstellt: ${role.name}`);
  }

  // ─── Berechtigungen erstellen ───
  const permissions = [
    // Dashboard
    { name: 'Dashboard ansehen', slug: 'dashboard:view', module: 'dashboard' },
    // Mitarbeiter
    { name: 'Mitarbeiter ansehen', slug: 'employees:view', module: 'employees' },
    { name: 'Mitarbeiter erstellen', slug: 'employees:create', module: 'employees' },
    { name: 'Mitarbeiter bearbeiten', slug: 'employees:edit', module: 'employees' },
    { name: 'Mitarbeiter löschen', slug: 'employees:delete', module: 'employees' },
    { name: 'Eigene Daten ansehen', slug: 'employees:view_own', module: 'employees' },
    // Kunden
    { name: 'Kunden ansehen', slug: 'customers:view', module: 'customers' },
    { name: 'Kunden erstellen', slug: 'customers:create', module: 'customers' },
    { name: 'Kunden bearbeiten', slug: 'customers:edit', module: 'customers' },
    { name: 'Kunden löschen', slug: 'customers:delete', module: 'customers' },
    // Objekte
    { name: 'Objekte ansehen', slug: 'objects:view', module: 'objects' },
    { name: 'Objekte erstellen', slug: 'objects:create', module: 'objects' },
    { name: 'Objekte bearbeiten', slug: 'objects:edit', module: 'objects' },
    { name: 'Objekte löschen', slug: 'objects:delete', module: 'objects' },
    // Dienstplanung
    { name: 'Dienstplan ansehen', slug: 'scheduling:view', module: 'scheduling' },
    { name: 'Dienstplan erstellen', slug: 'scheduling:create', module: 'scheduling' },
    { name: 'Dienstplan bearbeiten', slug: 'scheduling:edit', module: 'scheduling' },
    { name: 'Dienstplan genehmigen', slug: 'scheduling:approve', module: 'scheduling' },
    { name: 'Auto-Planung nutzen', slug: 'scheduling:auto_plan', module: 'scheduling' },
    { name: 'Ersatz suchen', slug: 'scheduling:replacement', module: 'scheduling' },
    // Zeiterfassung
    { name: 'Zeiterfassung ansehen', slug: 'attendance:view', module: 'attendance' },
    { name: 'Zeiterfassung erstellen', slug: 'attendance:create', module: 'attendance' },
    { name: 'Zeiterfassung bearbeiten', slug: 'attendance:edit', module: 'attendance' },
    { name: 'Zeiterfassung genehmigen', slug: 'attendance:approve', module: 'attendance' },
    { name: 'Eigene Zeiten ansehen', slug: 'attendance:view_own', module: 'attendance' },
    // Abrechnung
    { name: 'MA-Vergütung verwalten', slug: 'billing:employee_rates', module: 'billing' },
    { name: 'Kundenstundensätze verwalten', slug: 'billing:customer_rates', module: 'billing' },
    { name: 'Lohnabrechnung', slug: 'billing:payroll', module: 'billing' },
    { name: 'Rechnungen erstellen', slug: 'billing:invoices', module: 'billing' },
    { name: 'Exporte erstellen', slug: 'billing:export', module: 'billing' },
    // Berichte
    { name: 'Berichte ansehen', slug: 'reports:view', module: 'reports' },
    { name: 'Berichte exportieren', slug: 'reports:export', module: 'reports' },
    // Administration
    { name: 'Benutzer verwalten', slug: 'admin:users', module: 'admin' },
    { name: 'Rollen verwalten', slug: 'admin:roles', module: 'admin' },
    { name: 'Audit-Protokoll', slug: 'admin:audit', module: 'admin' },
    { name: 'Systemeinstellungen', slug: 'admin:settings', module: 'admin' },
    { name: 'Backup verwalten', slug: 'admin:backup', module: 'admin' },
  ];

  const createdPermissions: Record<string, { id: string }> = {};
  for (const perm of permissions) {
    const created = await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: { name: perm.name },
      create: perm,
    });
    createdPermissions[perm.slug] = { id: created.id };
    console.log(`  Berechtigung erstellt: ${perm.slug}`);
  }

  // ─── Rollen mit Berechtigungen verknüpfen ───
  const rolePermissions: Record<string, string[]> = {
    administrator: Object.keys(createdPermissions),
    management: [
      'dashboard:view',
      'employees:view', 'employees:create', 'employees:edit',
      'customers:view', 'customers:create', 'customers:edit',
      'objects:view', 'objects:create', 'objects:edit',
      'scheduling:view', 'scheduling:create', 'scheduling:edit', 'scheduling:approve', 'scheduling:auto_plan', 'scheduling:replacement',
      'attendance:view', 'attendance:approve',
      'billing:employee_rates', 'billing:customer_rates', 'billing:payroll', 'billing:invoices', 'billing:export',
      'reports:view', 'reports:export',
      'admin:audit',
    ],
    dispatch: [
      'dashboard:view',
      'employees:view',
      'customers:view',
      'objects:view',
      'scheduling:view', 'scheduling:create', 'scheduling:edit', 'scheduling:auto_plan', 'scheduling:replacement',
      'attendance:view', 'attendance:approve',
      'reports:view',
    ],
    hr: [
      'dashboard:view',
      'employees:view', 'employees:create', 'employees:edit', 'employees:delete',
      'attendance:view', 'attendance:edit', 'attendance:approve',
      'billing:employee_rates', 'billing:payroll',
      'reports:view',
    ],
    accounting: [
      'dashboard:view',
      'employees:view',
      'customers:view',
      'objects:view',
      'attendance:view', 'attendance:approve',
      'billing:employee_rates', 'billing:customer_rates', 'billing:payroll', 'billing:invoices', 'billing:export',
      'reports:view', 'reports:export',
    ],
    field_supervisor: [
      'dashboard:view',
      'employees:view',
      'objects:view',
      'scheduling:view',
      'attendance:create',
      'attendance:view_own',
      'reports:view',
    ],
    employee: [
      'dashboard:view',
      'employees:view_own',
      'attendance:view_own', 'attendance:create',
    ],
  };

  for (const [roleSlug, permSlugs] of Object.entries(rolePermissions)) {
    const roleId = createdRoles[roleSlug]?.id;
    if (!roleId) continue;

    for (const permSlug of permSlugs) {
      const permId = createdPermissions[permSlug]?.id;
      if (!permId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId: permId },
        },
        update: { granted: true },
        create: { roleId, permissionId: permId, granted: true },
      });
    }
    console.log(`  Berechtigungen zugewiesen: ${roleSlug} (${permSlugs.length})`);
  }

  // ─── Beispielqualifikationen ───
  const qualifications = [
    { name: '§34a GewO Unterrichtung', category: 'gesetzlich', validityDays: 365 * 5, color: '#3b82f6' },
    { name: '§34a GewO Sachkundeprüfung', category: 'gesetzlich', validityDays: 365 * 5, color: '#2563eb' },
    { name: 'Waffensachkunde §7', category: 'waffen', validityDays: 365 * 5, color: '#dc2626' },
    { name: 'Bewachungsunternehmer', category: 'gesetzlich', validityDays: null, color: '#7c3aed' },
    { name: 'Ersthelfer-Ausbildung', category: 'intern', validityDays: 365 * 2, color: '#059669' },
    { name: 'Brandschutzhelfer', category: 'intern', validityDays: 365 * 3, color: '#ea580c' },
    { name: 'Pfortenschein', category: 'intern', validityDays: 365 * 5, color: '#0891b2' },
    { name: 'Luftsicherheitsassistent', category: 'gesetzlich', validityDays: 365 * 5, color: '#4f46e5' },
    { name: 'Führerschein Klasse B', category: 'intern', validityDays: null, color: '#65a30d' },
  ];

  for (const qual of qualifications) {
    await prisma.qualification.upsert({
      where: { id: qual.name }, // Will fail, use create or find
      update: {},
      create: {
        name: qual.name,
        category: qual.category,
        validityDays: qual.validityDays,
        color: qual.color,
        requiresRenewal: qual.validityDays !== null,
      },
    }).catch(() => {
      // Ignoriere Duplikate
      return prisma.qualification.create({
        data: {
          name: qual.name,
          category: qual.category,
          validityDays: qual.validityDays,
          color: qual.color,
          requiresRenewal: qual.validityDays !== null,
        },
      }).catch(() => {});
    });
  }
  console.log(`  ${qualifications.length} Qualifikationen erstellt`);

  // ─── Beispiel-Schichten ───
  const shifts = [
    { name: 'Frühschicht', startTime: '06:00:00', endTime: '14:00:00', breakMinutes: 30, isNightShift: false, color: '#f59e0b' },
    { name: 'Spätschicht', startTime: '14:00:00', endTime: '22:00:00', breakMinutes: 30, isNightShift: false, color: '#8b5cf6' },
    { name: 'Nachtschicht', startTime: '22:00:00', endTime: '06:00:00', breakMinutes: 30, isNightShift: true, color: '#1e3a8a' },
    { name: 'Tag (12h)', startTime: '06:00:00', endTime: '18:00:00', breakMinutes: 60, isNightShift: false, color: '#10b981' },
    { name: 'Nacht (12h)', startTime: '18:00:00', endTime: '06:00:00', breakMinutes: 60, isNightShift: true, color: '#6366f1' },
  ];

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { id: shift.name },
      update: {},
      create: {
        name: shift.name,
        startTime: new Date(`1970-01-01T${shift.startTime}`),
        endTime: new Date(`1970-01-01T${shift.endTime}`),
        breakMinutes: shift.breakMinutes,
        isNightShift: shift.isNightShift,
        color: shift.color,
      },
    }).catch(() => {
      return prisma.shift.create({
        data: {
          name: shift.name,
          startTime: new Date(`1970-01-01T${shift.startTime}`),
          endTime: new Date(`1970-01-01T${shift.endTime}`),
          breakMinutes: shift.breakMinutes,
          isNightShift: shift.isNightShift,
          color: shift.color,
        },
      }).catch(() => {});
    });
  }
  console.log(`  ${shifts.length} Schichtdefinitionen erstellt`);

  // ─── Admin-Benutzer erstellen ───
  const adminPasswordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@sms.local',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      roleId: createdRoles['administrator'].id,
      isActive: true,
    },
  });
  console.log(`  Admin-Benutzer erstellt: admin (Passwort: admin123)`);

  // ─── Feiertage NRW 2026 ───
  const holidays2026 = [
    { name: 'Neujahr', date: '2026-01-01', state: null },
    { name: 'Karfreitag', date: '2026-04-03', state: null },
    { name: 'Ostersonntag', date: '2026-04-05', state: null },
    { name: 'Ostermontag', date: '2026-04-06', state: null },
    { name: 'Tag der Arbeit', date: '2026-05-01', state: null },
    { name: 'Christi Himmelfahrt', date: '2026-05-14', state: null },
    { name: 'Pfingstsonntag', date: '2026-05-24', state: null },
    { name: 'Pfingstmontag', date: '2026-05-25', state: null },
    { name: 'Tag der Deutschen Einheit', date: '2026-10-03', state: null },
    { name: '1. Weihnachtstag', date: '2026-12-25', state: null },
    { name: '2. Weihnachtstag', date: '2026-12-26', state: null },
    // NRW-spezifisch
    { name: 'Fronleichnam', date: '2026-06-04', state: 'NW' },
    { name: 'Allerheiligen', date: '2026-11-01', state: 'NW' },
  ];

  for (const holiday of holidays2026) {
    await prisma.holiday.upsert({
      where: { date_state: { date: new Date(holiday.date), state: holiday.state } },
      update: { name: holiday.name },
      create: {
        name: holiday.name,
        date: new Date(holiday.date),
        state: holiday.state,
        isRecurring: false,
        year: 2026,
      },
    }).catch(() => {});
  }
  console.log(`  ${holidays2026.length} Feiertage (NRW) erstellt`);

  console.log('✅ Seed abgeschlossen!');
}

main()
  .catch((e) => {
    console.error('❌ Seed-Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
