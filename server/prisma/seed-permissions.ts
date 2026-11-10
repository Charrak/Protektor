import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed-Script für Rollen und Berechtigungen
 * Erstellt alle Permissions und Standard-Rollen für eine Sicherheitsfirma
 */
async function main() {
  console.log('🔐 Starte Rollen- & Berechtigungs-Setup...\n');

  // ═══════════════════════════════════════════════════════
  // 1. PERMISSIONS erstellen
  // ═══════════════════════════════════════════════════════
  console.log('📋 Erstelle Berechtigungen...');

  const permissions = await Promise.all([
    // DASHBOARD
    prisma.permission.upsert({
      where: { slug: 'dashboard:view' },
      update: {},
      create: {
        name: 'Dashboard anzeigen',
        slug: 'dashboard:view',
        module: 'dashboard',
        description: 'Dashboard und Statistiken einsehen',
      },
    }),

    // MITARBEITER (Employees)
    prisma.permission.upsert({
      where: { slug: 'employees:view' },
      update: {},
      create: {
        name: 'Mitarbeiter anzeigen',
        slug: 'employees:view',
        module: 'employees',
        description: 'Mitarbeiterliste und -details einsehen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'employees:create' },
      update: {},
      create: {
        name: 'Mitarbeiter erstellen',
        slug: 'employees:create',
        module: 'employees',
        description: 'Neue Mitarbeiter anlegen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'employees:edit' },
      update: {},
      create: {
        name: 'Mitarbeiter bearbeiten',
        slug: 'employees:edit',
        module: 'employees',
        description: 'Mitarbeiterdaten ändern, Qualifikationen verwalten',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'employees:delete' },
      update: {},
      create: {
        name: 'Mitarbeiter löschen',
        slug: 'employees:delete',
        module: 'employees',
        description: 'Mitarbeiter deaktivieren/löschen',
      },
    }),

    // KUNDEN (Customers)
    prisma.permission.upsert({
      where: { slug: 'customers:view' },
      update: {},
      create: {
        name: 'Kunden anzeigen',
        slug: 'customers:view',
        module: 'customers',
        description: 'Kunden und Objekte einsehen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'customers:create' },
      update: {},
      create: {
        name: 'Kunden erstellen',
        slug: 'customers:create',
        module: 'customers',
        description: 'Neue Kunden und Objekte anlegen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'customers:edit' },
      update: {},
      create: {
        name: 'Kunden bearbeiten',
        slug: 'customers:edit',
        module: 'customers',
        description: 'Kundendaten, Kontakte und Objekte ändern',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'customers:delete' },
      update: {},
      create: {
        name: 'Kunden löschen',
        slug: 'customers:delete',
        module: 'customers',
        description: 'Kunden und Objekte löschen',
      },
    }),

    // OBJEKTE (Objects)
    prisma.permission.upsert({
      where: { slug: 'objects:view' },
      update: {},
      create: {
        name: 'Objekte anzeigen',
        slug: 'objects:view',
        module: 'objects',
        description: 'Einsatzorte und Anforderungen einsehen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'objects:create' },
      update: {},
      create: {
        name: 'Objekte erstellen',
        slug: 'objects:create',
        module: 'objects',
        description: 'Neue Einsatzorte anlegen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'objects:edit' },
      update: {},
      create: {
        name: 'Objekte bearbeiten',
        slug: 'objects:edit',
        module: 'objects',
        description: 'Objektdaten und Anforderungen ändern',
      },
    }),

    // DIENSTPLANUNG (Scheduling)
    prisma.permission.upsert({
      where: { slug: 'scheduling:view' },
      update: {},
      create: {
        name: 'Dienstplan anzeigen',
        slug: 'scheduling:view',
        module: 'scheduling',
        description: 'Dienstpläne einsehen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'scheduling:view_all' },
      update: {},
      create: {
        name: 'Alle Dienstpläne anzeigen',
        slug: 'scheduling:view_all',
        module: 'scheduling',
        description: 'Dienstpläne aller Teams/Mitarbeiter einsehen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'scheduling:create' },
      update: {},
      create: {
        name: 'Dienstplan erstellen',
        slug: 'scheduling:create',
        module: 'scheduling',
        description: 'Neue Dienste und Schichten erstellen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'scheduling:edit' },
      update: {},
      create: {
        name: 'Dienstplan bearbeiten',
        slug: 'scheduling:edit',
        module: 'scheduling',
        description: 'Dienste ändern, verschieben, bestätigen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'scheduling:delete' },
      update: {},
      create: {
        name: 'Dienstplan löschen',
        slug: 'scheduling:delete',
        module: 'scheduling',
        description: 'Dienste löschen oder stornieren',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'scheduling:auto_plan' },
      update: {},
      create: {
        name: 'Auto-Planung nutzen',
        slug: 'scheduling:auto_plan',
        module: 'scheduling',
        description: 'Automatische Dienstplanung verwenden',
      },
    }),

    // ZEITERFASSUNG (Attendance)
    prisma.permission.upsert({
      where: { slug: 'attendance:view' },
      update: {},
      create: {
        name: 'Zeiterfassung anzeigen',
        slug: 'attendance:view',
        module: 'attendance',
        description: 'Zeiten einsehen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'attendance:view_all' },
      update: {},
      create: {
        name: 'Alle Zeiten anzeigen',
        slug: 'attendance:view_all',
        module: 'attendance',
        description: 'Zeiten aller Mitarbeiter einsehen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'attendance:create' },
      update: {},
      create: {
        name: 'Zeit erfassen',
        slug: 'attendance:create',
        module: 'attendance',
        description: 'Stempeln (Kommen/Gehen)',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'attendance:edit' },
      update: {},
      create: {
        name: 'Zeiten korrigieren',
        slug: 'attendance:edit',
        module: 'attendance',
        description: 'Zeiten manuell korrigieren',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'attendance:approve' },
      update: {},
      create: {
        name: 'Zeiten genehmigen',
        slug: 'attendance:approve',
        module: 'attendance',
        description: 'Zeiten freigeben',
      },
    }),

    // ABRECHNUNG (Billing)
    prisma.permission.upsert({
      where: { slug: 'billing:view' },
      update: {},
      create: {
        name: 'Abrechnung anzeigen',
        slug: 'billing:view',
        module: 'billing',
        description: 'Gehaltsabrechnungen einsehen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'billing:invoices' },
      update: {},
      create: {
        name: 'Rechnungen verwalten',
        slug: 'billing:invoices',
        module: 'billing',
        description: 'Kundenrechnungen erstellen und verwalten',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'billing:payroll' },
      update: {},
      create: {
        name: 'Gehaltsabrechnung',
        slug: 'billing:payroll',
        module: 'billing',
        description: 'Gehaltsabrechnungen erstellen',
      },
    }),

    // BERICHE (Reports)
    prisma.permission.upsert({
      where: { slug: 'reports:view' },
      update: {},
      create: {
        name: 'Berichte anzeigen',
        slug: 'reports:view',
        module: 'reports',
        description: 'Auswertungen und Statistiken einsehen',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'reports:export' },
      update: {},
      create: {
        name: 'Berichte exportieren',
        slug: 'reports:export',
        module: 'reports',
        description: 'Berichte als PDF/Excel exportieren',
      },
    }),

    // ADMINISTRATION
    prisma.permission.upsert({
      where: { slug: 'admin:roles' },
      update: {},
      create: {
        name: 'Rollen verwalten',
        slug: 'admin:roles',
        module: 'admin',
        description: 'Rollen und Berechtigungen verwalten',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'admin:users' },
      update: {},
      create: {
        name: 'Benutzer verwalten',
        slug: 'admin:users',
        module: 'admin',
        description: 'Benutzer und Zugänge verwalten',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'admin:settings' },
      update: {},
      create: {
        name: 'Einstellungen',
        slug: 'admin:settings',
        module: 'admin',
        description: 'Systemeinstellungen ändern',
      },
    }),
    prisma.permission.upsert({
      where: { slug: 'admin:audit_log' },
      update: {},
      create: {
        name: 'Audit-Log einsehen',
        slug: 'admin:audit_log',
        module: 'admin',
        description: 'Änderungsprotokoll einsehen',
      },
    }),
  ]);

  console.log(`✅ ${permissions.length} Berechtigungen erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 2. ROLLEN erstellen
  // ═══════════════════════════════════════════════════════
  console.log('👥 Erstelle Rollen...');

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('❌ Kein Tenant gefunden!');
    process.exit(1);
  }

  // Alle Permission-IDs nach Modul gruppieren
  const permMap: Record<string, string> = {};
  for (const p of permissions) {
    permMap[p.slug] = p.id;
  }

  // ADMIN - Hat ALLE Berechtigungen
  const adminRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'admin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Administrator',
      slug: 'admin',
      description: 'Vollzugriff auf alle Funktionen',
      isSystem: true,
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map(p => ({ roleId: adminRole.id, permissionId: p.id, granted: true })),
  });
  console.log(`✅ Rolle "Administrator" - ${permissions.length} Berechtigungen`);

  // DISPATCHER - Dienstplan-Manager (kann Pläne erstellen/ändern, alles sehen)
  const dispatcherPerms = [
    'dashboard:view',
    'employees:view', 'employees:edit',
    'customers:view',
    'objects:view',
    'scheduling:view', 'scheduling:view_all', 'scheduling:create', 'scheduling:edit', 'scheduling:delete', 'scheduling:auto_plan',
    'attendance:view', 'attendance:view_all',
    'reports:view',
  ];
  const dispatcherRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'dispatcher' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Disponent',
      slug: 'dispatcher',
      description: 'Dienstplanung und Einsatzsteuerung',
      isSystem: true,
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: dispatcherRole.id } });
  await prisma.rolePermission.createMany({
    data: dispatcherPerms.map(slug => ({ roleId: dispatcherRole.id, permissionId: permMap[slug], granted: true })),
  });
  console.log(`✅ Rolle "Disponent" - ${dispatcherPerms.length} Berechtigungen`);

  // TEAMLEADER - Teamleiter (sieht eigenes Team, darf Zeiten genehmigen, Plant für sein Team)
  const teamLeaderPerms = [
    'dashboard:view',
    'employees:view',
    'customers:view',
    'objects:view',
    'scheduling:view', 'scheduling:view_all', 'scheduling:create', 'scheduling:edit',
    'attendance:view', 'attendance:view_all', 'attendance:create', 'attendance:approve',
    'reports:view',
  ];
  const teamLeaderRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'teamleader' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Teamleiter',
      slug: 'teamleader',
      description: 'Teamverwaltung und Zeitgenehmigung',
      isSystem: true,
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: teamLeaderRole.id } });
  await prisma.rolePermission.createMany({
    data: teamLeaderPerms.map(slug => ({ roleId: teamLeaderRole.id, permissionId: permMap[slug], granted: true })),
  });
  console.log(`✅ Rolle "Teamleiter" - ${teamLeaderPerms.length} Berechtigungen`);

  // EMPLOYEE - Normaler Mitarbeiter (nur eigene Daten)
  const employeePerms = [
    'dashboard:view',
    'objects:view',
    'scheduling:view',
    'attendance:view', 'attendance:create',
  ];
  const employeeRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'employee' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Mitarbeiter',
      slug: 'employee',
      description: 'Eigene Zeiten und Dienstpläne einsehen',
      isSystem: true,
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: employeeRole.id } });
  await prisma.rolePermission.createMany({
    data: employeePerms.map(slug => ({ roleId: employeeRole.id, permissionId: permMap[slug], granted: true })),
  });
  console.log(`✅ Rolle "Mitarbeiter" - ${employeePerms.length} Berechtigungen`);

  // ACCOUNTANT - Buchhaltung (nur Abrechnung)
  const accountantPerms = [
    'dashboard:view',
    'employees:view',
    'customers:view',
    'attendance:view', 'attendance:view_all',
    'billing:view', 'billing:invoices', 'billing:payroll',
    'reports:view', 'reports:export',
  ];
  const accountantRole = await prisma.role.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'accountant' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Buchhaltung',
      slug: 'accountant',
      description: 'Abrechnung, Gehälter und Rechnungen',
      isSystem: true,
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: accountantRole.id } });
  await prisma.rolePermission.createMany({
    data: accountantPerms.map(slug => ({ roleId: accountantRole.id, permissionId: permMap[slug], granted: true })),
  });
  console.log(`✅ Rolle "Buchhaltung" - ${accountantPerms.length} Berechtigungen`);

  console.log(`\n🎉 Rollen-Setup abgeschlossen!\n`);
  console.log('📊 Übersicht:');
  console.log('   - 5 Standard-Rollen erstellt');
  console.log('   - 35 Berechtigungen in 8 Modulen');
  console.log('   - Admin hat jetzt vollen Zugriff');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
