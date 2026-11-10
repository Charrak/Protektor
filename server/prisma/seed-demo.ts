import { PrismaClient, LicenseStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ensureDefaultRoles } from '../src/services/defaultRoles.service';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Starte Demo-Daten-Generierung...\n');

  // ═══════════════════════════════════════════════════════
  // 1. PLATFORM ADMIN erstellen
  // ═══════════════════════════════════════════════════════
  console.log('📊 Erstelle Platform Admin...');
  
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.platformAdmin.upsert({
    where: { email: 'admin@sms-platform.com' },
    update: { passwordHash: adminPassword },
    create: {
      username: 'admin',
      email: 'admin@sms-platform.com',
      passwordHash: adminPassword,
      firstName: 'Platform',
      lastName: 'Administrator',
      isActive: true,
    },
  });
  
  console.log('✅ Platform Admin erstellt:');
  console.log('   📧 Email: admin@sms-platform.com');
  console.log('   🔑 Password: Admin123!');
  console.log('   🌐 URL: http://localhost:5173/platform\n');

  // ═══════════════════════════════════════════════════════
  // 1B. Standardrollen für Platform-Tenant erstellen
  // ═══════════════════════════════════════════════════════
  const platformTenant = await prisma.tenant.upsert({
    where: { tenantId: 'PLATFORM' },
    update: {},
    create: {
      tenantId: 'PLATFORM',
      companyName: 'SMS Platform',
      contactEmail: 'platform@sms-platform.com',
      licenseStatus: 'ACTIVE',
      employeeLimit: 1000,
    },
  });

  // ═══════════════════════════════════════════════════════
  // 2. TARIFE erstellen
  // ═══════════════════════════════════════════════════════
  console.log('💰 Erstelle Tarife...');
  
  const starterPlan = await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      name: 'Starter',
      slug: 'starter',
      description: 'Perfekt für kleine Sicherheitsdienste',
      monthlyPrice: 49.99,
      yearlyPrice: 499.99,
      employeeLimit: 10,
      features: {
        basicEmployeeMgmt: true,
        basicCustomerMgmt: true,
        basicObjectMgmt: true,
        basicDeployment: true,
        basicTimeTracking: true,
        basicBilling: true,
        basicReports: true,
      },
      isActive: true,
      sortOrder: 1,
    },
  });

  const professionalPlan = await prisma.plan.upsert({
    where: { slug: 'professional' },
    update: {},
    create: {
      name: 'Professional',
      slug: 'professional',
      description: 'Für wachsende Sicherheitsunternehmen',
      monthlyPrice: 149.99,
      yearlyPrice: 1499.99,
      employeeLimit: 50,
      features: {
        basicEmployeeMgmt: true,
        basicCustomerMgmt: true,
        basicObjectMgmt: true,
        basicDeployment: true,
        basicTimeTracking: true,
        basicBilling: true,
        basicReports: true,
        advancedReports: true,
        autoPlanning: true,
        smsNotifications: true,
        apiAccess: true,
      },
      isActive: true,
      sortOrder: 2,
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { slug: 'enterprise' },
    update: {},
    create: {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Für große Sicherheitsorganisationen',
      monthlyPrice: 399.99,
      yearlyPrice: 3999.99,
      employeeLimit: 200,
      features: {
        basicEmployeeMgmt: true,
        basicCustomerMgmt: true,
        basicObjectMgmt: true,
        basicDeployment: true,
        basicTimeTracking: true,
        basicBilling: true,
        basicReports: true,
        advancedReports: true,
        autoPlanning: true,
        smsNotifications: true,
        apiAccess: true,
        datevExport: true,
        gpsTracking: true,
        mobileApp: true,
        auditLog: true,
        prioritySupport: true,
      },
      isActive: true,
      sortOrder: 3,
    },
  });

  console.log('✅ Tarife erstellt:');
  console.log(`   📋 Starter: €49.99/Monat (10 MA)`);
  console.log(`   📋 Professional: €149.99/Monat (50 MA)`);
  console.log(`   📋 Enterprise: €399.99/Monat (200 MA)\n`);

  // ═══════════════════════════════════════════════════════
  // 3. TENANT 1: Security Nord GmbH (Premium)
  // ═══════════════════════════════════════════════════════
  console.log('🏢 Erstelle Tenant 1: Security Nord GmbH...');
  
  const tenant1Password = await bcrypt.hash('Password123!', 12);
  
  const tenant1 = await prisma.tenant.upsert({
    where: { tenantId: 'SECURITY-NORD-001' },
    update: {},
    create: {
      tenantId: 'SECURITY-NORD-001',
      companyName: 'Security Nord GmbH',
      contactEmail: 'admin@security-nord.de',
      contactPhone: '+49 40 12345678',
      licenseStatus: 'ACTIVE' as LicenseStatus,
      employeeLimit: 50,
      featureFlags: {
        datevExport: true,
        apiAccess: true,
        autoPlanning: true,
      },
      address: {
        street: 'Hafenstraße 45',
        zipCode: '20359',
        city: 'Hamburg',
        country: 'DE',
      },
      taxNumber: 'DE123456789',
      vatId: 'DE123456789',
      createdById: admin.id,
    },
  });

  // Tenant 1 Standardrollen erstellen
  await ensureDefaultRoles(prisma, tenant1.id);
  const tenant1AdminRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: tenant1.id, slug: 'admin' } },
  });

  // Tenant 1 User
  const tenant1User = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant1.id, email: 'admin@security-nord.de' } },
    update: { passwordHash: tenant1Password, roleId: tenant1AdminRole.id },
    create: {
      username: 'admin-nord',
      email: 'admin@security-nord.de',
      passwordHash: tenant1Password,
      firstName: 'Thomas',
      lastName: 'Nordmann',
      tenantId: tenant1.id,
      roleId: tenant1AdminRole.id,
      isActive: true,
    },
  });

  // Tenant 1 Subscription
  const tenant1Sub = await prisma.subscription.findFirst({
    where: { tenantId: tenant1.id },
  });
  
  if (!tenant1Sub) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant1.id,
        planId: professionalPlan.id,
        status: 'active',
        billingInterval: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyRevenue: professionalPlan.monthlyPrice,
      },
    });
  }

  console.log('✅ Security Nord GmbH erstellt:');
  console.log('   🔑 License Key: lic_security-nord_premium');
  console.log('   📧 Email: admin@security-nord.de');
  console.log('   🔑 Password: Password123!');
  console.log('   💳 Plan: Professional (€149.99/Monat)\n');

  // ═══════════════════════════════════════════════════════
  // 4. TENANT 2: Schutz & Dienstleistungen AG (Enterprise)
  // ═══════════════════════════════════════════════════════
  console.log('🏢 Erstelle Tenant 2: Schutz & Dienstleistungen AG...');
  
  const tenant2Password = await bcrypt.hash('Password123!', 12);
  
  const tenant2 = await prisma.tenant.upsert({
    where: { tenantId: 'SCHUTZ-AG-001' },
    update: {},
    create: {
      tenantId: 'SCHUTZ-AG-001',
      companyName: 'Schutz & Dienstleistungen AG',
      contactEmail: 'info@schutz-ag.de',
      contactPhone: '+49 89 98765432',
      licenseStatus: 'ACTIVE' as LicenseStatus,
      employeeLimit: 200,
      featureFlags: {
        datevExport: true,
        apiAccess: true,
        autoPlanning: true,
        gpsTracking: true,
        mobileApp: true,
      },
      address: {
        street: 'Maximilianstraße 12',
        zipCode: '80539',
        city: 'München',
        country: 'DE',
      },
      taxNumber: 'DE987654321',
      vatId: 'DE987654321',
      createdById: admin.id,
    },
  });

  // Tenant 2 Standardrollen erstellen
  await ensureDefaultRoles(prisma, tenant2.id);
  const tenant2AdminRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: tenant2.id, slug: 'admin' } },
  });

  // Tenant 2 User
  const tenant2User = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant2.id, email: 'info@schutz-ag.de' } },
    update: { passwordHash: tenant2Password, roleId: tenant2AdminRole.id },
    create: {
      username: 'admin-schutz',
      email: 'info@schutz-ag.de',
      passwordHash: tenant2Password,
      firstName: 'Maria',
      lastName: 'Schütz',
      tenantId: tenant2.id,
      roleId: tenant2AdminRole.id,
      isActive: true,
    },
  });

  // Tenant 2 Subscription
  const tenant2Sub = await prisma.subscription.findFirst({
    where: { tenantId: tenant2.id },
  });
  
  if (!tenant2Sub) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant2.id,
        planId: enterprisePlan.id,
        status: 'active',
        billingInterval: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyRevenue: enterprisePlan.monthlyPrice,
      },
    });
  }

  console.log('✅ Schutz & Dienstleistungen AG erstellt:');
  console.log('   🔑 License Key: lic_schutz-ag_enterprise');
  console.log('   📧 Email: info@schutz-ag.de');
  console.log('   🔑 Password: Password123!');
  console.log('   💳 Plan: Enterprise (€399.99/Monat)\n');

  // ═══════════════════════════════════════════════════════
  // 5. TENANT 3: Secure Solutions UG (Startup/Test)
  // ═══════════════════════════════════════════════════════
  console.log('🏢 Erstelle Tenant 3: Secure Solutions UG (Test)...');
  
  const tenant3Password = await bcrypt.hash('Password123!', 12);
  
  const tenant3 = await prisma.tenant.upsert({
    where: { tenantId: 'SECURE-SOLUTIONS-001' },
    update: {},
    create: {
      tenantId: 'SECURE-SOLUTIONS-001',
      companyName: 'Secure Solutions UG',
      contactEmail: 'kontakt@secure-solutions.de',
      contactPhone: '+49 30 55556666',
      licenseStatus: 'TEST' as LicenseStatus,
      employeeLimit: 10,
      featureFlags: {},
      address: {
        street: 'Friedrichstraße 88',
        zipCode: '10117',
        city: 'Berlin',
        country: 'DE',
      },
      createdById: admin.id,
    },
  });

  // Tenant 3 Standardrollen erstellen
  await ensureDefaultRoles(prisma, tenant3.id);
  const tenant3AdminRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: tenant3.id, slug: 'admin' } },
  });

  // Tenant 3 User
  const tenant3User = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant3.id, email: 'kontakt@secure-solutions.de' } },
    update: { passwordHash: tenant3Password, roleId: tenant3AdminRole.id },
    create: {
      username: 'admin-secure',
      email: 'kontakt@secure-solutions.de',
      passwordHash: tenant3Password,
      firstName: 'Stefan',
      lastName: 'Solutions',
      tenantId: tenant3.id,
      roleId: tenant3AdminRole.id,
      isActive: true,
    },
  });

  // Tenant 3 Subscription (Trial)
  const tenant3Sub = await prisma.subscription.findFirst({
    where: { tenantId: tenant3.id },
  });
  
  if (!tenant3Sub) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant3.id,
        planId: starterPlan.id,
        status: 'TRIAL',
        billingInterval: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyRevenue: 0,
      },
    });
  }

  console.log('✅ Secure Solutions UG erstellt (TEST):');
  console.log('   🔑 License Key: lic_secure-solutions_test');
  console.log('   📧 Email: kontakt@secure-solutions.de');
  console.log('   🔑 Password: Password123!');
  console.log('   💳 Plan: Starter Test (30 Tage)\n');

  // ═══════════════════════════════════════════════════════
  // 6. MITARBEITER für Tenant 1 (20 Mitarbeiter)
  // ═══════════════════════════════════════════════════════
  console.log('👥 Erstelle Mitarbeiter für Security Nord GmbH...');
  
  const employeeNames1 = [
    ['Max', 'Mustermann'], ['Anna', 'Schmidt'], ['Thomas', 'Weber'],
    ['Sandra', 'Fischer'], ['Michael', 'Wagner'], ['Julia', 'Becker'],
    ['Peter', 'Hoffmann'], ['Lisa', 'Schäfer'], ['Markus', 'Koch'],
    ['Claudia', 'Richter'], ['Stefan', 'Klein'], ['Monika', 'Wolf'],
    ['Andreas', 'Schröder'], ['Kerstin', 'Neumann'], ['Frank', 'Schwarz'],
    ['Petra', 'Braun'], ['Jürgen', 'Krüger'], ['Sabine', 'Hartmann'],
    ['Ralf', 'Lange'], ['Birgit', 'Werner']
  ];

  for (let i = 0; i < employeeNames1.length; i++) {
    const [firstName, lastName] = employeeNames1[i];
    await prisma.employee.upsert({
      where: {
        tenantId_personnelNumber: {
          tenantId: tenant1.id,
          personnelNumber: `SN${String(i + 1).padStart(3, '0')}`,
        },
      },
      update: {},
      data: {
        tenantId: tenant1.id,
        firstName,
        lastName,
        personnelNumber: `SN${String(i + 1).padStart(3, '0')}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@security-nord.de`,
        employmentType: i < 15 ? 'FULL_TIME' : 'PART_TIME',
        hourlyRateBase: 15 + (i % 5) * 2,
        status: 'active',
        contractStart: new Date(2020 + (i % 4), i % 12, 1 + (i % 28)),
        street: `${['Hafenstraße', 'Reeperbahn', 'Jungfernstieg'][i % 3]} ${10 + i}`,
        zipCode: '20359',
        city: 'Hamburg',
        country: 'DE',
      },
    });
  }

  console.log(`✅ ${employeeNames1.length} Mitarbeiter erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 7. MITARBEITER für Tenant 2 (15 Mitarbeiter)
  // ═══════════════════════════════════════════════════════
  console.log('👥 Erstelle Mitarbeiter für Schutz & Dienstleistungen AG...');
  
  const employeeNames2 = [
    ['Hans', 'Müller'], ['Gabi', 'Schmidt'], ['Klaus', 'Fischer'],
    ['Ingrid', 'Weber'], ['Werner', 'Wagner'], ['Ursula', 'Becker'],
    ['Dieter', 'Hoffmann'], ['Helga', 'Schäfer'], ['Bernd', 'Koch'],
    ['Christa', 'Richter'], ['Horst', 'Klein'], ['Elfriede', 'Wolf'],
    ['Gerhard', 'Schröder'], ['Ilse', 'Neumann'], ['Karl', 'Braun']
  ];

  for (let i = 0; i < employeeNames2.length; i++) {
    const [firstName, lastName] = employeeNames2[i];
    await prisma.employee.upsert({
      where: {
        tenantId_personnelNumber: {
          tenantId: tenant1.id,
          personnelNumber: `SN${String(i + 1).padStart(3, '0')}`,
        },
      },
      update: {},
      data: {
        tenantId: tenant2.id,
        firstName,
        lastName,
        personnelNumber: `SA${String(i + 1).padStart(3, '0')}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@schutz-ag.de`,
        employmentType: i < 12 ? 'FULL_TIME' : 'MINIJOB',
        hourlyRateBase: 14 + (i % 4) * 2,
        status: 'active',
        contractStart: new Date(2019 + (i % 5), i % 12, 1 + (i % 28)),
        street: `${['Maximilianstraße', 'Leopoldstraße', 'Brienner Straße'][i % 3]} ${5 + i}`,
        zipCode: '80539',
        city: 'München',
        country: 'DE',
      },
    });
  }

  console.log(`✅ ${employeeNames2.length} Mitarbeiter erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 8. MITARBEITER für Tenant 3 (10 Mitarbeiter)
  // ═══════════════════════════════════════════════════════
  console.log('👥 Erstelle Mitarbeiter für Secure Solutions UG...');
  
  const employeeNames3 = [
    ['Tim', 'Berlin'], ['Sarah', 'Brandenburg'], ['Alex', 'Spree'],
    ['Nina', 'Kreuzberg'], ['Ben', 'Prenzlauer'], ['Lena', 'Friedrich'],
    ['Jonas', 'Alexander'], ['Mia', 'Unter den Linden'], ['Finn', 'Kurfürst'], ['Emma', 'Charlottenburg']
  ];

  for (let i = 0; i < employeeNames3.length; i++) {
    const [firstName, lastName] = employeeNames3[i];
    await prisma.employee.upsert({
      where: {
        tenantId_personnelNumber: {
          tenantId: tenant1.id,
          personnelNumber: `SN${String(i + 1).padStart(3, '0')}`,
        },
      },
      update: {},
      data: {
        tenantId: tenant3.id,
        firstName,
        lastName,
        personnelNumber: `SS${String(i + 1).padStart(3, '0')}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@secure-solutions.de`,
        employmentType: i < 7 ? 'FULL_TIME' : 'PART_TIME',
        hourlyRateBase: 13 + (i % 3) * 2,
        status: 'active',
        contractStart: new Date(2023, i % 12, 1 + (i % 28)),
        street: `Berliner Straße ${20 + i}`,
        zipCode: '10117',
        city: 'Berlin',
        country: 'DE',
      },
    });
  }

  console.log(`✅ ${employeeNames3.length} Mitarbeiter erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 9. KUNDEN & OBJEKTE
  // ═══════════════════════════════════════════════════════
  console.log('🏭 Erstelle Kunden und Objekte...');
  
  const customers1 = [
    { name: 'Hamburger Hafen GmbH', number: 'K001', objects: 5 },
    { name: 'Altonaer Einkaufszentrum', number: 'K002', objects: 3 },
    { name: 'Sparkasse Hamburg', number: 'K003', objects: 4 },
    { name: 'Universitätsklinikum Eppendorf', number: 'K004', objects: 2 },
    { name: 'Flughafen Hamburg GmbH', number: 'K005', objects: 3 },
  ];

  for (const customer of customers1) {
    const dbCustomer = await prisma.customer.create({
      data: {
        tenantId: tenant1.id,
        companyName: customer.name,
        customerNumber: customer.number,
        email: `info@${customer.name.toLowerCase().replace(/[^a-z]/g, '')}.de`,
        phone: '+49 40 ' + Math.floor(1000000 + Math.random() * 9000000),
        status: 'active',
        street: `Hamburger Straße ${Math.floor(Math.random() * 100)}`,
        zipCode: '20359',
        city: 'Hamburg',
        country: 'DE',
      },
    });

    for (let i = 0; i < customer.objects; i++) {
      await prisma.object.create({
        data: {
          tenantId: tenant1.id,
          customerId: dbCustomer.id,
          name: `${customer.name} - Objekt ${i + 1}`,
          objectNumber: `${customer.number}-O${String(i + 1).padStart(2, '0')}`,
          street: `Objektstraße ${10 + i}`,
          zipCode: '20359',
          city: 'Hamburg',
          specialInstructions: i % 2 === 0 ? 'Erste-Hilfe-Kenntnisse erforderlich' : 'Standard Bewachung',
        },
      });
    }
  }

  console.log(`✅ ${customers1.length} Kunden mit ${customers1.reduce((sum, c) => sum + c.objects, 0)} Objekten erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 10. EINSÄTZE & ZEITEINTRÄGE
  // ═══════════════════════════════════════════════════════
  console.log('📅 Erstelle Einsätze und Zeiteinträge...');
  
  const today = new Date();
  let deploymentCount = 0;
  let timeEntryCount = 0;

  // Einsätze für die letzten 30 Tage
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const deploymentDate = new Date(today);
    deploymentDate.setDate(today.getDate() - dayOffset);

    // Tenant 1: ~5 Einsätze pro Tag
    const tenant1Employees = await prisma.employee.findMany({
      where: { tenantId: tenant1.id },
      take: 5,
    });

    const tenant1Objects = await prisma.object.findMany({
      where: { tenantId: tenant1.id },
      take: 5,
    });

    for (let i = 0; i < Math.min(5, tenant1Employees.length); i++) {
      const startTime = new Date(deploymentDate);
      startTime.setHours(8, 0, 0, 0);
      const endTime = new Date(deploymentDate);
      endTime.setHours(16, 0, 0, 0);

      const deployment = await prisma.deployment.create({
        data: {
          tenantId: tenant1.id,
          employeeId: tenant1Employees[i].id,
          objectId: tenant1Objects[i % tenant1Objects.length].id,
          date: deploymentDate,
          startTime,
          endTime,
          status: 'COMPLETED',
          confirmedAt: new Date(),
        },
      });

      await prisma.timeRecord.create({
        data: {
          tenantId: tenant1.id,
          employeeId: tenant1Employees[i].id,
          deploymentId: deployment.id,
          date: deploymentDate,
          clockIn: startTime,
          clockOut: endTime,
          regularHours: 8,
        },
      });

      deploymentCount++;
      timeEntryCount++;
    }

    // Tenant 2: ~3 Einsätze pro Tag
    const tenant2Employees = await prisma.employee.findMany({
      where: { tenantId: tenant2.id },
      take: 3,
    });

    const tenant2Objects = await prisma.object.findMany({
      where: { tenantId: tenant2.id },
      take: 3,
    });

    for (let i = 0; i < Math.min(3, tenant2Employees.length); i++) {
      const startTime = new Date(deploymentDate);
      startTime.setHours(7, 0, 0, 0);
      const endTime = new Date(deploymentDate);
      endTime.setHours(15, 0, 0, 0);

      const deployment = await prisma.deployment.create({
        data: {
          tenantId: tenant2.id,
          employeeId: tenant2Employees[i].id,
          objectId: tenant2Objects[i % tenant2Objects.length].id,
          date: deploymentDate,
          startTime,
          endTime,
          status: 'COMPLETED',
          confirmedAt: new Date(),
        },
      });

      await prisma.timeRecord.create({
        data: {
          tenantId: tenant2.id,
          employeeId: tenant2Employees[i].id,
          deploymentId: deployment.id,
          date: deploymentDate,
          clockIn: startTime,
          clockOut: endTime,
          regularHours: 8,
        },
      });

      deploymentCount++;
      timeEntryCount++;
    }
  }

  console.log(`✅ ${deploymentCount} Einsätze erstellt`);
  console.log(`✅ ${timeEntryCount} Zeiteinträge erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 11. ZUSAMMENFASSUNG
  // ═══════════════════════════════════════════════════════
  const stats = await prisma.$transaction([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.employee.count(),
    prisma.customer.count(),
    prisma.object.count(),
    prisma.deployment.count(),
    prisma.timeRecord.count(),
    prisma.plan.count(),
  ]);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 DEMO-DATEN ERFOLGREICH GENERIERT!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📊 Statistiken:');
  console.log(`   🏢 Tenants: ${stats[0]}`);
  console.log(`   👤 Benutzer: ${stats[1]}`);
  console.log(`   👥 Mitarbeiter: ${stats[2]}`);
  console.log(`   🏭 Kunden: ${stats[3]}`);
  console.log(`   📦 Objekte: ${stats[4]}`);
  console.log(`   📅 Einsätze: ${stats[5]}`);
  console.log(`   ⏱️  Zeiteinträge: ${stats[6]}`);
  console.log(`   💰 Tarife: ${stats[7]}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🔐 ZUGANGSDATEN FÜR DEMO');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📊 PLATFORM ADMIN (Software-Betreiber):');
  console.log('   🌐 URL: http://localhost:5173/platform');
  console.log('   📧 Email: admin@sms-platform.com');
  console.log('   🔑 Password: Admin123!\n');

  console.log('🏢 TENANT 1: Security Nord GmbH (Premium)');
  console.log('   🌐 URL: http://localhost:5173');
  console.log('   🔑 License Key: lic_security-nord_premium');
  console.log('   📧 Email: admin@security-nord.de');
  console.log('   🔑 Password: Password123!');
  console.log('   💳 Plan: Professional (€149.99/Monat)\n');

  console.log('🏢 TENANT 2: Schutz & Dienstleistungen AG (Enterprise)');
  console.log('   🌐 URL: http://localhost:5173');
  console.log('   🔑 License Key: lic_schutz-ag_enterprise');
  console.log('   📧 Email: info@schutz-ag.de');
  console.log('   🔑 Password: Password123!');
  console.log('   💳 Plan: Enterprise (€399.99/Monat)\n');

  console.log('🏢 TENANT 3: Secure Solutions UG (Test/Startup)');
  console.log('   🌐 URL: http://localhost:5173');
  console.log('   🔑 License Key: lic_secure-solutions_test');
  console.log('   📧 Email: kontakt@secure-solutions.de');
  console.log('   🔑 Password: Password123!');
  console.log('   💳 Plan: Starter Test (30 Tage)\n');

  console.log('📚 API DOKUMENTATION:');
  console.log('   🌐 URL: http://localhost:5000/api-docs\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ BEREIT FÜR DEMO!');
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ FEHLER BEI DER DEMO-DATEN-GENERIERUNG:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
