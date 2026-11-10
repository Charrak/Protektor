import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Database Seeding...\n');

  // 1. Platform Admin erstellen
  const platformAdminPassword = await bcrypt.hash('Admin123!', 12);
  
  const platformAdmin = await prisma.platformAdmin.upsert({
    where: { email: 'admin@sms-platform.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@sms-platform.com',
      passwordHash: platformAdminPassword,
      firstName: 'Platform',
      lastName: 'Administrator',
      isActive: true,
    },
  });

  console.log('✅ Platform Admin erstellt:');
  console.log(`   Email: admin@sms-platform.com`);
  console.log(`   Password: Admin123!\n`);

  // 2. Demo Tenant erstellen
  const demoTenant = await prisma.tenant.upsert({
    where: { tenantId: 'DEMO-001' },
    update: {},
    create: {
      tenantId: 'DEMO-001',
      companyName: 'Demo Security GmbH',
      contactEmail: 'demo@security-company.de',
      contactPhone: '+49 123 456789',
      address: {
        street: 'Musterstraße 1',
        city: 'Berlin',
        zipCode: '10115',
        country: 'DE',
      },
      licenseStatus: 'ACTIVE',
      employeeLimit: 50,
      paymentGraceDays: 7,
      offlineGraceMinutes: 1440,
      createdById: platformAdmin.id,
    },
  });

  console.log('✅ Demo Tenant erstellt:');
  console.log(`   Company: Demo Security GmbH`);
  console.log(`   Tenant ID: DEMO-001`);
  console.log(`   Lizenz: ACTIVE\n`);

  // 3. Pläne erstellen
  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      description: 'Perfekt für kleine Teams',
      monthlyPrice: 49.99,
      yearlyPrice: 499.99,
      employeeLimit: 10,
      features: {
        basicScheduling: true,
        timeTracking: true,
        basicReports: true,
        emailSupport: true,
      },
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Professional',
      slug: 'professional',
      description: 'Für wachsende Unternehmen',
      monthlyPrice: 149.99,
      yearlyPrice: 1499.99,
      employeeLimit: 50,
      features: {
        basicScheduling: true,
        advancedScheduling: true,
        timeTracking: true,
        advancedReports: true,
        billing: true,
        prioritySupport: true,
        emailSupport: true,
      },
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Für große Organisationen',
      monthlyPrice: 399.99,
      yearlyPrice: 3999.99,
      employeeLimit: 200,
      features: {
        basicScheduling: true,
        advancedScheduling: true,
        timeTracking: true,
        advancedReports: true,
        billing: true,
        prioritySupport: true,
        emailSupport: true,
        api: true,
        customIntegrations: true,
        dedicatedSupport: true,
      },
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  console.log('✅ Pläne erstellt:');
  console.log('   - Starter (49.99€/Monat, 10 Mitarbeiter)');
  console.log('   - Professional (149.99€/Monat, 50 Mitarbeiter)');
  console.log('   - Enterprise (399.99€/Monat, 200 Mitarbeiter)\n');

  // 4. Subscription für Demo Tenant
  const professionalPlan = await prisma.plan.findUnique({ where: { slug: 'professional' } });
  if (professionalPlan) {
    const subscription = await prisma.subscription.create({
      data: {
        tenantId: demoTenant.id,
        planId: professionalPlan.id,
        status: 'ACTIVE',
        billingInterval: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 Tage
        monthlyRevenue: 149.99,
      },
    });
    console.log('✅ Subscription erstellt für Demo Tenant\n');
  }

  // 5. Rollen erstellen
  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_slug: {
        tenantId: demoTenant.id,
        slug: 'admin',
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Administrator',
      slug: 'admin',
      description: 'Vollzugriff auf alle Funktionen',
      isSystem: true,
    },
  });

  const dispatcherRole = await prisma.role.upsert({
    where: {
      tenantId_slug: {
        tenantId: demoTenant.id,
        slug: 'dispatcher',
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Disponent',
      slug: 'dispatcher',
      description: 'Dienstplanung und Einsatzsteuerung',
      isSystem: true,
    },
  });

  const teamLeaderRole = await prisma.role.upsert({
    where: {
      tenantId_slug: {
        tenantId: demoTenant.id,
        slug: 'teamleader',
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Teamleiter',
      slug: 'teamleader',
      description: 'Teamverwaltung und Zeitgenehmigung',
      isSystem: true,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: {
      tenantId_slug: {
        tenantId: demoTenant.id,
        slug: 'employee',
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Mitarbeiter',
      slug: 'employee',
      description: 'Eigene Daten einsehen',
      isSystem: true,
    },
  });

  const accountantRole = await prisma.role.upsert({
    where: {
      tenantId_slug: {
        tenantId: demoTenant.id,
        slug: 'accountant',
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Buchhaltung',
      slug: 'accountant',
      description: 'Abrechnung und Gehälter',
      isSystem: true,
    },
  });

  console.log('✅ Rollen erstellt:');
  console.log('   - Administrator');
  console.log('   - Disponent');
  console.log('   - Teamleiter');
  console.log('   - Mitarbeiter');
  console.log('   - Buchhaltung\n');

  // 7. Permissions erstellen
  const permissions = [
    // Employee-Permissions
    { name: 'Employees: Create', slug: 'employees.create', module: 'employees', description: 'Mitarbeiter erstellen' },
    { name: 'Employees: Read', slug: 'employees.read', module: 'employees', description: 'Mitarbeiter anzeigen' },
    { name: 'Employees: Update', slug: 'employees.update', module: 'employees', description: 'Mitarbeiter bearbeiten' },
    { name: 'Employees: Delete', slug: 'employees.delete', module: 'employees', description: 'Mitarbeiter löschen' },
    
    // Customer-Permissions
    { name: 'Customers: Create', slug: 'customers.create', module: 'customers', description: 'Kunden erstellen' },
    { name: 'Customers: Read', slug: 'customers.read', module: 'customers', description: 'Kunden anzeigen' },
    { name: 'Customers: Update', slug: 'customers.update', module: 'customers', description: 'Kunden bearbeiten' },
    { name: 'Customers: Delete', slug: 'customers.delete', module: 'customers', description: 'Kunden löschen' },
    
    // Object-Permissions
    { name: 'Objects: Create', slug: 'objects.create', module: 'objects', description: 'Objekte erstellen' },
    { name: 'Objects: Read', slug: 'objects.read', module: 'objects', description: 'Objekte anzeigen' },
    { name: 'Objects: Update', slug: 'objects.update', module: 'objects', description: 'Objekte bearbeiten' },
    { name: 'Objects: Delete', slug: 'objects.delete', module: 'objects', description: 'Objekte löschen' },
    
    // Deployment-Permissions
    { name: 'Deployments: Create', slug: 'deployments.create', module: 'deployments', description: 'Einsätze erstellen' },
    { name: 'Deployments: Read', slug: 'deployments.read', module: 'deployments', description: 'Einsätze anzeigen' },
    { name: 'Deployments: Update', slug: 'deployments.update', module: 'deployments', description: 'Einsätze bearbeiten' },
    { name: 'Deployments: Delete', slug: 'deployments.delete', module: 'deployments', description: 'Einsätze löschen' },
    
    // Invoice-Permissions
    { name: 'Invoices: Create', slug: 'invoices.create', module: 'invoices', description: 'Rechnungen erstellen' },
    { name: 'Invoices: Read', slug: 'invoices.read', module: 'invoices', description: 'Rechnungen anzeigen' },
    { name: 'Invoices: Update', slug: 'invoices.update', module: 'invoices', description: 'Rechnungen bearbeiten' },
    { name: 'Invoices: Delete', slug: 'invoices.delete', module: 'invoices', description: 'Rechnungen löschen' },
    
    // Report-Permissions
    { name: 'Reports: View', slug: 'reports.view', module: 'reports', description: 'Berichte anzeigen' },
    
    // Settings-Permissions
    { name: 'Settings: View', slug: 'settings.view', module: 'settings', description: 'Einstellungen anzeigen' },
    { name: 'Settings: Update', slug: 'settings.update', module: 'settings', description: 'Einstellungen bearbeiten' },
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const permission = await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {},
      create: perm,
    });
    createdPermissions.push(permission);
  }

  console.log(`✅ ${createdPermissions.length} Permissions erstellt\n`);

  // 8. RolePermissions für Admin erstellen (alle Berechtigungen)
  const adminRolePermissions = [];
  for (const permission of createdPermissions) {
    const rolePermission = await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
        granted: true,
      },
    });
    adminRolePermissions.push(rolePermission);
  }

  console.log(`✅ ${adminRolePermissions.length} RolePermissions für Admin erstellt\n`);

  // 9. Demo User für Tenant erstellen
  const demoUserPassword = await bcrypt.hash('Demo123!', 12);
  
  const demoUser = await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: demoTenant.id,
        username: 'demo',
      },
    },
    update: {
      roleId: adminRole.id,
    },
    create: {
      username: 'demo',
      email: 'demo@security-company.de',
      passwordHash: demoUserPassword,
      firstName: 'Demo',
      lastName: 'User',
      isActive: true,
      tenant: { connect: { id: demoTenant.id } },
      role: { connect: { id: adminRole.id } },
    },
  });

  // 10. User RolePermissions zuweisen
  for (const rolePermission of adminRolePermissions) {
    await prisma.user.update({
      where: { id: demoUser.id },
      data: {
        rolePermissions: {
          connect: { id: rolePermission.id },
        },
      },
    });
  }

  console.log('✅ Demo User erstellt:');
  console.log(`   Username: demo`);
  console.log(`   Password: Demo123!`);
  console.log(`   Rolle: Administrator`);
  console.log(`   Berechtigungen: ${adminRolePermissions.length} Permissions zugewiesen\n`);

  // 6. Demo Mitarbeiter erstellen
  const demoEmployees = [
    { firstName: 'Max', lastName: 'Mustermann', email: 'max@demo.de', personnelNumber: 'MA001' },
    { firstName: 'Anna', lastName: 'Schmidt', email: 'anna@demo.de', personnelNumber: 'MA002' },
    { firstName: 'Thomas', lastName: 'Weber', email: 'thomas@demo.de', personnelNumber: 'MA003' },
  ];

  for (const emp of demoEmployees) {
    await prisma.employee.upsert({
      where: {
        tenantId_personnelNumber: {
          tenantId: demoTenant.id,
          personnelNumber: emp.personnelNumber,
        },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        ...emp,
        country: 'DE',
        status: 'active',
      },
    });
  }

  console.log('✅ Demo Mitarbeiter erstellt:');
  demoEmployees.forEach(emp => console.log(`   - ${emp.firstName} ${emp.lastName} (${emp.personnelNumber})`));
  console.log();

  // 6. Demo Kunden erstellen
  const demoCustomers = [
    { companyName: 'ABC GmbH', customerNumber: 'K001', email: 'info@abc-gmbh.de', street: 'Industriestraße 1', zipCode: '10115', city: 'Berlin' },
    { companyName: 'XYZ AG', customerNumber: 'K002', email: 'kontakt@xyz-ag.de', street: 'Hauptstraße 42', zipCode: '80331', city: 'München' },
  ];

  for (const cust of demoCustomers) {
    await prisma.customer.upsert({
      where: {
        tenantId_customerNumber: {
          tenantId: demoTenant.id,
          customerNumber: cust.customerNumber,
        },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        ...cust,
        status: 'active',
      },
    });
  }

  console.log('✅ Demo Kunden erstellt:');
  demoCustomers.forEach(cust => console.log(`   - ${cust.companyName} (${cust.customerNumber})`));
  console.log();

  console.log('🎉 Seeding abgeschlossen!\n');
  console.log('═══════════════════════════════════════════════');
  console.log('Zugangsdaten:');
  console.log('═══════════════════════════════════════════════');
  console.log('\n📊 Platform Admin (Software-Betreiber):');
  console.log('   URL: http://92.5.64.224:3000/platform');
  console.log('   Email: admin@sms-platform.com');
  console.log('   Password: Admin123!');
  console.log('\n🏢 Tenant App (Kunden-Portal):');
  console.log('   URL: http://92.5.64.224:3000');
  console.log('   Tenant ID: DEMO-001');
  console.log('   Username: demo');
  console.log('   Password: Demo123!');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
