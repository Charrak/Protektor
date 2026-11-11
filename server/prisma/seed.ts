import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ensureDefaultRoles } from '../src/services/defaultRoles.service';

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
  const existingSubscription = await prisma.subscription.findFirst({ where: { tenantId: demoTenant.id } });
  if (professionalPlan && !existingSubscription) {
    await prisma.subscription.create({
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

  // 5. Standardrollen und Permissions erstellen (zentral)
  await ensureDefaultRoles(prisma, demoTenant.id);

  console.log('✅ 5 Standardrollen + alle Permissions erstellt\n');

  // 6. Demo User für Tenant erstellen (mit Admin-Rolle)
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: demoTenant.id, slug: 'admin' } },
  });
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

  console.log('✅ Demo User erstellt:');
  console.log(`   Username: demo`);
  console.log(`   Password: Demo123!`);
  console.log(`   Rolle: Administrator (alle Berechtigungen)\n`);

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
