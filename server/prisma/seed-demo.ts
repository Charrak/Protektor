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
      createdById: admin.id,
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
        status: 'ACTIVE',
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
        status: 'ACTIVE',
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
      featureFlags: {
        datevExport: false,
        apiAccess: true,
        autoPlanning: false,
      },
      address: {
        street: 'Friedrichstraße 88',
        zipCode: '10117',
        city: 'Berlin',
        country: 'DE',
      },
      taxNumber: 'DE111222333',
      vatId: 'DE111222333',
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
      username: 'admin-solutions',
      email: 'kontakt@secure-solutions.de',
      passwordHash: tenant3Password,
      firstName: 'Lukas',
      lastName: 'Berliner',
      tenantId: tenant3.id,
      roleId: tenant3AdminRole.id,
      isActive: true,
    },
  });

  // Tenant 3 Subscription
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
        monthlyRevenue: starterPlan.monthlyPrice,
      },
    });
  }

  console.log('✅ Secure Solutions UG erstellt:');
  console.log('   🔑 License Key: lic_secure-solutions_test');
  console.log('   📧 Email: kontakt@secure-solutions.de');
  console.log('   🔑 Password: Password123!');
  console.log('   💳 Plan: Starter Test (30 Tage)\n');

  // ═══════════════════════════════════════════════════════
  // 6. QUALIFIKATIONEN (global, keine Tenant-Trennung)
  // ═══════════════════════════════════════════════════════
  console.log('🎓 Erstelle Qualifikationen...');
  
  const qualificationNames = [
    { name: 'Bewachungserlaubnis §34a', description: 'Erlaubnis nach §34a GewO', validityDays: 365 },
    { name: 'Erste-Hilfe-Ausbildung', description: 'Erste-Hilfe-Kurs (9 Stunden)', validityDays: 365 },
    { name: 'Brandschutzhelfer', description: 'Brandschutz-Ausbildung', validityDays: 365 },
    { name: 'Sachkundeprüfung §34a', description: 'IHK-Sachkundeprüfung', validityDays: 3650 },
    { name: 'Unterweisung §34a', description: 'Unterrichtung nach §34a Abs. 1 Satz 4', validityDays: 365 },
    { name: 'Waffenbesitzkarte', description: 'Erlaubnis zum Führen von Schusswaffen', validityDays: 1825 },
    { name: 'Führerschein Klasse B', description: 'Fahrerlaubnis Klasse B', validityDays: 5475 },
    { name: 'Gabelstaplerschein', description: 'Staplerschein nach DGUV', validityDays: 1825 },
    { name: 'Security-Management', description: 'Fortbildung Security-Management', validityDays: 1095 },
    { name: 'Objektschutz-Zertifikat', description: 'Spezialisierung Objektschutz', validityDays: 730 },
  ];

  const createdQualifications = [];
  for (const qual of qualificationNames) {
    // Erst suchen, dann erstellen (kein @unique auf name)
    let qualification = await prisma.qualification.findFirst({
      where: { name: qual.name },
    });
    if (!qualification) {
      qualification = await prisma.qualification.create({
        data: {
          name: qual.name,
          description: qual.description,
          category: 'security',
          validityDays: qual.validityDays,
          requiresRenewal: true,
          color: '#3B82F6',
        },
      });
    }
    createdQualifications.push(qualification);
  }

  console.log(`✅ ${qualificationNames.length} Qualifikationen erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 7. MITARBEITER für Tenant 1 (15 Mitarbeiter, vollständig)
  // ═══════════════════════════════════════════════════════
  console.log('👥 Erstelle Mitarbeiter für Security Nord GmbH...');
  
  const employeeNames1 = [
    ['Max', 'Mustermann'], ['Anna', 'Schmidt'], ['Thomas', 'Weber'],
    ['Sarah', 'Fischer'], ['Michael', 'Wagner'], ['Julia', 'Becker'],
    ['Stefan', 'Hoffmann'], ['Laura', 'Schäfer'], ['Markus', 'Koch'],
    ['Lisa', 'Richter'], ['Christian', 'Klein'], ['Nina', 'Wolf'],
    ['Andreas', 'Schröder'], ['Sandra', 'Neumann'], ['Peter', 'Braun']
  ];

  const employees1 = [];
  for (let i = 0; i < employeeNames1.length; i++) {
    const [firstName, lastName] = employeeNames1[i];
    const employee = await prisma.employee.upsert({
      where: {
        tenantId_personnelNumber: {
          tenantId: tenant1.id,
          personnelNumber: `SN${String(i + 1).padStart(3, '0')}`,
        },
      },
      update: {},
      create: {
        tenantId: tenant1.id,
        firstName,
        lastName,
        personnelNumber: `SN${String(i + 1).padStart(3, '0')}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@security-nord.de`,
        phone: `+49 40 ${1000000 + i * 1234}`,
        mobile: `+49 17${i % 10} ${1000000 + i * 5678}`,
        dateOfBirth: new Date(1980 + i, i % 12, 1 + (i * 2) % 28),
        gender: i % 2 === 0 ? 'male' : 'female',
        nationality: 'Deutsch',
        maritalStatus: ['single', 'married', 'divorced', 'single'][i % 4],
        street: `Hamburger Straße ${10 + i}`,
        zipCode: '20359',
        city: 'Hamburg',
        country: 'DE',
        taxClass: ['I', 'II', 'III', 'IV'][i % 4],
        religion: ['none', 'catholic', 'protestant', 'none'][i % 4],
        socialInsuranceId: `12 ${String(20 + i).padStart(2, '0')} ${String(180 + i).padStart(4, '0')} ${String(700 + i).padStart(3, '0')}`,
        healthInsurance: ['TK', 'AOK', 'Barmer', 'DAK', 'KKH'][i % 5],
        healthInsuranceId: `H${String(100000 + i).padStart(6, '0')}`,
        healthInsuranceType: i < 12 ? 'statutory' : 'private',
        bankName: ['Sparkasse Hamburg', 'Hamburger Volksbank', 'Haspa'][i % 3],
        iban: `DE89 ${String(3704 + i).padStart(4, '0')} 0600 ${String(10000000 + i).padStart(7, '0')}`,
        employmentType: i < 10 ? 'full_time' : i < 13 ? 'part_time' : 'mini_job',
        contractType: 'permanent',
        contractStart: new Date(2020 + (i % 4), i % 12, 1 + (i * 3) % 28),
        weeklyHours: i < 10 ? 40 : i < 13 ? 20 : 10,
        hourlyRateBase: 15 + (i % 5) * 2,
        monthlySalary: i < 10 ? 2800 + (i % 5) * 200 : i < 13 ? 1400 + (i % 3) * 100 : 450,
        vacationDays: 30,
        position: ['Sicherheitsmitarbeiter', 'Objektleiter', 'Schichtleiter', 'Sicherheitsmitarbeiter'][i % 4],
        department: ['Objektschutz', 'Event', 'Werkschutz', 'Empfang'][i % 4],
        preferredRegion: 'Hamburg',
        languages: 'Deutsch' + (i % 3 === 0 ? ', Englisch' : i % 3 === 1 ? ', Türkisch' : ', Polnisch'),
        uniformSize: ['S', 'M', 'L', 'XL'][i % 4],
        shoeSize: 40 + (i % 6),
        driverLicense: i % 2 === 0 ? 'B, BE' : 'B',
        bewachungserlaubnisNr: `Bew/${2020 + (i % 4)}/${String(100 + i).padStart(4, '0')}`,
        bewachungserlaubnisExpiry: new Date(2025 + (i % 3), (i * 2) % 12, 1),
        bewachungserlaubnisAuthority: 'Hamburg Behörde für Inneres',
        emergencyContactName: `${firstName} ${lastName} (Familie)`,
        emergencyContactPhone: `+49 40 ${2000000 + i * 4321}`,
        emergencyContactRelation: ['Ehepartner', 'Elternteil', 'Geschwister'][i % 3],
        status: 'ACTIVE',
      },
    });
    employees1.push(employee);
  }

  console.log(`✅ ${employeeNames1.length} Mitarbeiter erstellt (vollständige Daten)\n`);

  // ═══════════════════════════════════════════════════════
  // 8. MITARBEITER für Tenant 2 (20 Mitarbeiter, vollständig)
  // ═══════════════════════════════════════════════════════
  console.log('👥 Erstelle Mitarbeiter für Schutz & Dienstleistungen AG...');
  
  const employeeNames2 = [
    ['Peter', 'Münchner'], ['Anna', 'Bayerisch'], ['Hans', 'Isar'],
    ['Maria', 'Alpenblick'], ['Josef', 'Englgarten'], ['Ursula', 'Viktualien'],
    ['Wolfgang', 'Marienplatz'], ['Brigitte', 'Residenz'], ['Franz', 'Leopoldstraße'],
    ['Ingrid', 'Maximilian'], ['Georg', 'Brienner'], ['Monika', 'Schwabing'],
    ['Rudolf', 'Odeonsplatz'], ['Helga', 'Englischer', ], ['Klaus', 'Garching'],
    ['Renate', 'Sendling', ], ['Dieter', 'Haidhausen'], ['Christine', 'Bogenhausen'],
    ['Bernd', 'Pasing'], ['Sabine', 'Nymphenburg']
  ];

  const employees2 = [];
  for (let i = 0; i < employeeNames2.length; i++) {
    const [firstName, lastName] = employeeNames2[i];
    const employee = await prisma.employee.upsert({
      where: {
        tenantId_personnelNumber: {
          tenantId: tenant2.id,
          personnelNumber: `SA${String(i + 1).padStart(3, '0')}`,
        },
      },
      update: {},
      create: {
        tenantId: tenant2.id,
        firstName,
        lastName,
        personnelNumber: `SA${String(i + 1).padStart(3, '0')}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}@schutz-ag.de`,
        phone: `+49 89 ${2000000 + i * 2345}`,
        mobile: `+49 17${(i + 1) % 10} ${2000000 + i * 6789}`,
        dateOfBirth: new Date(1978 + i, i % 12, 1 + (i * 3) % 28),
        gender: i % 2 === 0 ? 'male' : 'female',
        nationality: 'Deutsch',
        maritalStatus: ['married', 'single', 'divorced', 'widowed', 'married'][i % 5],
        street: `Münchner Straße ${20 + i}`,
        zipCode: '80539',
        city: 'München',
        country: 'DE',
        taxClass: ['I', 'III', 'II', 'IV'][i % 4],
        religion: ['catholic', 'catholic', 'protestant', 'none'][i % 4],
        socialInsuranceId: `18 ${String(15 + i).padStart(2, '0')} ${String(200 + i).padStart(4, '0')} ${String(800 + i).padStart(3, '0')}`,
        healthInsurance: ['AOK Bayern', 'TK Bayern', 'Barmer', 'HKK'][i % 4],
        healthInsuranceId: `B${String(200000 + i).padStart(6, '0')}`,
        healthInsuranceType: i < 15 ? 'statutory' : 'private',
        bankName: ['Sparkasse München', 'Volksbank München', 'HypoVereinsbank', 'Postbank'][i % 4],
        iban: `DE27 ${String(7000 + i).padStart(4, '0')} 0100 ${String(20000000 + i).padStart(7, '0')}`,
        employmentType: i < 14 ? 'full_time' : i < 18 ? 'part_time' : 'mini_job',
        contractType: 'permanent',
        contractStart: new Date(2019 + (i % 5), i % 12, 1 + (i * 2) % 28),
        weeklyHours: i < 14 ? 40 : i < 18 ? 25 : 12,
        hourlyRateBase: 16 + (i % 6) * 2,
        monthlySalary: i < 14 ? 3000 + (i % 6) * 250 : i < 18 ? 1600 + (i % 4) * 150 : 520,
        vacationDays: 30,
        position: ['Sicherheitsmitarbeiter', 'Objektleiter', 'Schichtleiter', 'Qualitätsmanager'][i % 4],
        department: ['Objektschutz', 'Event', 'Mobile Dienste', 'Verwaltung'][i % 4],
        preferredRegion: 'München',
        languages: 'Deutsch' + (i % 4 === 0 ? ', Englisch, Französisch' : i % 4 === 1 ? ', Englisch' : i % 4 === 2 ? ', Englisch, Italienisch' : ', Türkisch'),
        uniformSize: ['M', 'L', 'XL', 'S'][i % 4],
        shoeSize: 41 + (i % 5),
        driverLicense: i < 16 ? 'B, BE, C1' : 'B',
        bewachungserlaubnisNr: `M/Bew/${2019 + (i % 5)}/${String(200 + i).padStart(4, '0')}`,
        bewachungserlaubnisExpiry: new Date(2026 + (i % 3), (i * 3) % 12, 1),
        bewachungserlaubnisAuthority: 'Kreisverwaltung München',
        emergencyContactName: `${firstName} ${lastName} (Familie)`,
        emergencyContactPhone: `+49 89 ${3000000 + i * 5432}`,
        emergencyContactRelation: ['Ehepartner', 'Elternteil', 'Kind'][i % 3],
        status: 'ACTIVE',
      },
    });
    employees2.push(employee);
  }

  console.log(`✅ ${employeeNames2.length} Mitarbeiter erstellt (vollständige Daten)\n`);

  // ═══════════════════════════════════════════════════════
  // 9. MITARBEITER für Tenant 3 (10 Mitarbeiter, vollständig)
  // ═══════════════════════════════════════════════════════
  console.log('👥 Erstelle Mitarbeiter für Secure Solutions UG...');
  
  const employeeNames3 = [
    ['Tim', 'Brandenburg'], ['Sarah', 'Potsdam'], ['Alex', 'Spree'],
    ['Nina', 'Kreuzberg'], ['Ben', 'Neukölln'], ['Lena', 'Friedrichshain'],
    ['Jonas', 'Charlottenburg'], ['Mia', 'Wilmersdorf'], ['Finn', 'Tempelhof'], ['Emma', 'Steglitz']
  ];

  const employees3 = [];
  for (let i = 0; i < employeeNames3.length; i++) {
    const [firstName, lastName] = employeeNames3[i];
    const employee = await prisma.employee.upsert({
      where: {
        tenantId_personnelNumber: {
          tenantId: tenant3.id,
          personnelNumber: `SS${String(i + 1).padStart(3, '0')}`,
        },
      },
      update: {},
      create: {
        tenantId: tenant3.id,
        firstName,
        lastName,
        personnelNumber: `SS${String(i + 1).padStart(3, '0')}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@secure-solutions.de`,
        phone: `+49 30 ${3000000 + i * 3456}`,
        mobile: `+49 17${(i + 2) % 10} ${3000000 + i * 7890}`,
        dateOfBirth: new Date(1985 + i, i % 12, 1 + (i * 2) % 28),
        gender: i % 2 === 0 ? 'male' : 'female',
        nationality: 'Deutsch',
        maritalStatus: ['single', 'single', 'married', 'single'][i % 4],
        street: `Berliner Straße ${30 + i}`,
        zipCode: '10117',
        city: 'Berlin',
        country: 'DE',
        taxClass: ['I', 'I', 'III', 'I'][i % 4],
        religion: 'none',
        socialInsuranceId: `21 ${String(25 + i).padStart(2, '0')} ${String(300 + i).padStart(4, '0')} ${String(900 + i).padStart(3, '0')}`,
        healthInsurance: ['TK', 'AOK', 'Barmer', 'DAK'][i % 4],
        healthInsuranceId: `BE${String(300000 + i).padStart(6, '0')}`,
        healthInsuranceType: 'statutory',
        bankName: ['Sparkasse Berlin', 'Berliner Volksbank', 'Deutsche Bank'][i % 3],
        iban: `DE44 ${String(1000 + i).padStart(4, '0')} 0100 ${String(30000000 + i).padStart(7, '0')}`,
        employmentType: i < 7 ? 'full_time' : i < 9 ? 'part_time' : 'mini_job',
        contractType: i < 8 ? 'permanent' : 'fixed_term',
        contractStart: new Date(2022 + (i % 2), i % 12, 1 + (i * 2) % 28),
        weeklyHours: i < 7 ? 40 : i < 9 ? 20 : 10,
        hourlyRateBase: 14 + (i % 4) * 2,
        monthlySalary: i < 7 ? 2600 + (i % 4) * 200 : i < 9 ? 1300 + (i % 2) * 100 : 450,
        vacationDays: 28,
        position: ['Sicherheitsmitarbeiter', 'Empfangsmitarbeiter', 'Objektschutz'][i % 3],
        department: ['Objektschutz', 'Empfang', 'Mobile Dienste'][i % 3],
        preferredRegion: 'Berlin Mitte',
        languages: 'Deutsch' + (i % 2 === 0 ? ', Englisch' : ', Englisch, Arabisch'),
        uniformSize: ['S', 'M', 'L', 'XL'][i % 4],
        shoeSize: 38 + (i % 6),
        driverLicense: i % 2 === 0 ? 'B' : 'Keine',
        bewachungserlaubnisNr: `B/Bew/${2022 + (i % 2)}/${String(300 + i).padStart(4, '0')}`,
        bewachungserlaubnisExpiry: new Date(2027 + (i % 2), (i * 4) % 12, 1),
        bewachungserlaubnisAuthority: 'Landesamt Berlin',
        emergencyContactName: `${firstName} ${lastName} (Familie)`,
        emergencyContactPhone: `+49 30 ${4000000 + i * 6543}`,
        emergencyContactRelation: ['Elternteil', 'Geschwister', 'Partner'][i % 3],
        status: 'ACTIVE',
      },
    });
    employees3.push(employee);
  }

  console.log(`✅ ${employeeNames3.length} Mitarbeiter erstellt (vollständige Daten)\n`);

  // ═══════════════════════════════════════════════════════
  // 10. KUNDEN & OBJEKTE für Tenant 1 (vollständig)
  // ═══════════════════════════════════════════════════════
  console.log('🏭 Erstelle Kunden und Objekte für Security Nord GmbH...');
  
  const customers1Data = [
    { 
      name: 'Hamburger Hafen GmbH', 
      number: 'K001', 
      street: 'Kaiserkai 12',
      contacts: [
        { name: 'Klaus Hafner', role: 'Objektleiter', phone: '+49 40 4441001', email: 'k.hafner@hamburger-hafen.de' },
        { name: 'Petra Dampfer', role: 'Sicherheitsbeauftragte', phone: '+49 40 4441002', email: 'p.dampfer@hamburger-hafen.de' }
      ],
      objects: [
        { name: 'Terminal A', instructions: '24/7 Bewachung, Zugangskontrolle LKW', type: 'industrial' },
        { name: 'Terminal B', instructions: 'Nachtschicht, Fahrzeugkontrolle', type: 'industrial' },
        { name: 'Verwaltungsgebäude', instructions: 'Empfangsdienst Mo-Fr 7-19 Uhr', type: 'office' },
        { name: 'Lagerhalle 3', instructions: 'Brandwache nachts, Rundgang alle 2h', type: 'warehouse' },
        { name: 'Parkplatz Süd', instructions: 'Mobile Streife alle 30 min', type: 'parking' },
      ]
    },
    { 
      name: 'Altonaer Einkaufszentrum', 
      number: 'K002',
      street: 'Große Bergstraße 88',
      contacts: [
        { name: 'Monika Einkauf', role: 'Center Managerin', phone: '+49 40 5552001', email: 'm.einkauf@altona-ec.de' },
        { name: 'Ralf Sicherheit', role: 'Sicherheitsleitung', phone: '+49 40 5552002', email: 'r.sicherheit@altona-ec.de' }
      ],
      objects: [
        { name: 'Haupteingang', instructions: 'Diebstahlsicherung, Kundenbetreuung', type: 'retail' },
        { name: 'Parkhaus', instructions: 'Nachtkontrolle, Verkehrssicherung', type: 'parking' },
        { name: 'Technikbereich', instructions: 'Zutrittskontrolle, Brandschutz', type: 'industrial' },
      ]
    },
    { 
      name: 'Sparkasse Hamburg', 
      number: 'K003',
      street: 'Jungfernstieg 25',
      contacts: [
        { name: 'Dr. Banker', role: 'Filialleiter', phone: '+49 40 6663001', email: 'dr.banker@sparkasse-hh.de' },
        { name: 'Sabine Geld', role: 'Sicherheitsbeauftragte', phone: '+49 40 6663002', email: 's.geld@sparkasse-hh.de' }
      ],
      objects: [
        { name: 'Hauptfiliale Jungfernstieg', instructions: 'Werttransportbegleitung, Überfallprävention', type: 'bank' },
        { name: 'Filiale Altona', instructions: 'Öffnungssicherung, Geldautomaten-Überwachung', type: 'bank' },
        { name: 'Filiale Harburg', instructions: 'Mo-Fr 8-18 Uhr, Schließservice', type: 'bank' },
        { name: 'Rechenzentrum', instructions: '24/7 Hochsicherheit, Biometrische Zutrittskontrolle', type: 'datacenter' },
      ]
    },
    { 
      name: 'Universitätsklinikum Eppendorf', 
      number: 'K004',
      street: 'Martinistraße 52',
      contacts: [
        { name: 'Dr. Mediziner', role: 'Klinikdirektor', phone: '+49 40 7774001', email: 'd.mediziner@uke.de' },
        { name: 'Maria Pflege', role: 'Sicherheitsleitung', phone: '+49 40 7774002', email: 'm.pflege@uke.de' }
      ],
      objects: [
        { name: 'Notaufnahme', instructions: '24/7, Personenkontrolle, Deeskalation', type: 'hospital' },
        { name: 'Apotheke', instructions: 'Zugangskontrolle, Diebstahlsicherung', type: 'hospital' },
      ]
    },
    { 
      name: 'Flughafen Hamburg GmbH', 
      number: 'K005',
      street: 'Flughafenstraße 1',
      contacts: [
        { name: 'Kpt. Himmel', role: 'Betriebsleiter', phone: '+49 40 8885001', email: 'k.himmel@ham.de' },
        { name: 'Anna Himmel', role: 'Sicherheitskoordinatorin', phone: '+49 40 8885002', email: 'a.himmel@ham.de' }
      ],
      objects: [
        { name: 'Terminal 1 Abflug', instructions: 'Passagierkontrolle, Gefahrenabwehr', type: 'airport' },
        { name: 'Terminal 2 Abflug', instructions: 'Passagierkontrolle, Gefahrenabwehr', type: 'airport' },
        { name: 'Parkhaus P3', instructions: 'Mobile Streife, Verkehrsregelung', type: 'parking' },
      ]
    },
  ];

  for (const customerData of customers1Data) {
    const dbCustomer = await prisma.customer.upsert({
      where: {
        tenantId_customerNumber: {
          tenantId: tenant1.id,
          customerNumber: customerData.number,
        },
      },
      update: {},
      create: {
        tenantId: tenant1.id,
        companyName: customerData.name,
        customerNumber: customerData.number,
        email: `info@${customerData.name.toLowerCase().replace(/[^a-z]/g, '')}.de`,
        phone: '+49 40 ' + (Math.floor(1000000 + Math.random() * 9000000)),
        street: customerData.street,
        zipCode: '20359',
        city: 'Hamburg',
        country: 'DE',
        status: 'ACTIVE',
        vatId: `DE${String(100000000 + Math.floor(Math.random() * 900000000))}`,
      },
    });

    // Kontaktpersonen erstellen
    for (const contact of customerData.contacts) {
      await prisma.contactPerson.create({
        data: {
          tenantId: tenant1.id,
          customerId: dbCustomer.id,
          firstName: contact.name.split(' ')[0],
          lastName: contact.name.split(' ').slice(1).join(' '),
          role: contact.role,
          phone: contact.phone,
          email: contact.email,
          isPrimary: contact === customerData.contacts[0],
        },
      });
    }

    // Objekte erstellen
    for (const obj of customerData.objects) {
      await prisma.sMSObject.create({
        data: {
          tenantId: tenant1.id,
          customerId: dbCustomer.id,
          name: obj.name,
          objectNumber: `${customerData.number}-O${String(customerData.objects.indexOf(obj) + 1).padStart(2, '0')}`,
          street: customerData.street,
          zipCode: '20359',
          city: 'Hamburg',
          specialInstructions: obj.instructions,
          objectType: obj.type,
        },
      });
    }
  }

  console.log(`✅ ${customers1Data.length} Kunden mit ${customers1Data.reduce((sum, c) => sum + c.objects.length, 0)} Objekten erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 11. KUNDEN & OBJEKTE für Tenant 2 (vollständig)
  // ═══════════════════════════════════════════════════════
  console.log('🏭 Erstelle Kunden und Objekte für Schutz & Dienstleistungen AG...');
  
  const customers2Data = [
    { 
      name: 'BMW Werk München', 
      number: 'K101',
      street: 'Am Olympiapark 1',
      contacts: [
        { name: 'Dr. Motor', role: 'Werksleiter', phone: '+49 89 1111001', email: 'd.motor@bmw-muc.de' },
        { name: 'Karl Rad', role: 'Sicherheitsbeauftragter', phone: '+49 89 1111002', email: 'k.rad@bmw-muc.de' }
      ],
      objects: [
        { name: 'Haupttor Nord', instructions: '24/7 Werkschutz, LKW-Kontrolle', type: 'industrial' },
        { name: 'Haupttor Süd', instructions: '24/7 Werkschutz, Mitarbeiterkontrolle', type: 'industrial' },
        { name: 'Produktionshalle A', instructions: 'Nachtschicht, Brandwache', type: 'industrial' },
        { name: 'Verwaltungsgebäude', instructions: 'Empfangsdienst Mo-Fr 7-19 Uhr', type: 'office' },
        { name: 'Parkplatz Mitarbeiter', instructions: 'Mobile Streife, Verkehrssicherung', type: 'parking' },
        { name: 'Teststrecke', instructions: 'Zugangskontrolle, Hochsicherheit', type: 'industrial' },
      ]
    },
    { 
      name: 'Allianz Arena GmbH', 
      number: 'K102',
      street: 'Werner-Heiß-Allee 1',
      contacts: [
        { name: 'Franz Stadion', role: 'Arena Manager', phone: '+49 89 2222001', email: 'f.stadion@allianz-arena.de' },
        { name: 'Lisa Tor', role: 'Event Managerin', phone: '+49 89 2222002', email: 'l.tor@allianz-arena.de' }
      ],
      objects: [
        { name: 'Nordtribüne', instructions: 'Spieltage: Crowd Management, Zutrittskontrolle', type: 'stadium' },
        { name: 'Südtribüne', instructions: 'Spieltage: Crowd Management, Zutrittskontrolle', type: 'stadium' },
        { name: 'Parkhaus West', instructions: 'Verkehrsregelung an Spieltagen', type: 'parking' },
        { name: 'VIP-Bereich', instructions: 'Personenschutz, Zugangskontrolle', type: 'vip' },
      ]
    },
    { 
      name: 'Messe München', 
      number: 'K103',
      street: 'Messegelände 1',
      contacts: [
        { name: 'Helmut Messe', role: 'Messeleiter', phone: '+49 89 3333001', email: 'h.messe@messe-muc.de' },
        { name: 'Anna Stand', role: 'Event Koordinatorin', phone: '+49 89 3333002', email: 'a.stand@messe-muc.de' }
      ],
      objects: [
        { name: 'Halle 1', instructions: 'Messetage: Objektschutz, Diebstahlsicherung', type: 'exhibition' },
        { name: 'Halle 2', instructions: 'Messetage: Objektschutz, Diebstahlsicherung', type: 'exhibition' },
        { name: 'Eingang West', instructions: 'Besucherkontrolle, Ticketprüfung', type: 'exhibition' },
      ]
    },
    { 
      name: 'Klinikum Rechts der Isar', 
      number: 'K104',
      street: 'Ismaninger Straße 22',
      contacts: [
        { name: 'Dr. Klinik', role: 'Klinikdirektor', phone: '+49 89 4444001', email: 'd.klinik@rechtsderisar.de' },
        { name: 'Maria Krank', role: 'Sicherheitsleitung', phone: '+49 89 4444002', email: 'm.krank@rechtsderisar.de' }
      ],
      objects: [
        { name: 'Notaufnahme', instructions: '24/7, Personenkontrolle, Deeskalation', type: 'hospital' },
        { name: 'Apotheke', instructions: 'Zugangskontrolle, Diebstahlsicherung', type: 'hospital' },
      ]
    },
    { 
      name: 'Bayerische Staatsoper', 
      number: 'K105',
      street: 'Max-Joseph-Platz 2',
      contacts: [
        { name: 'Maestro Musik', role: 'Intendant', phone: '+49 89 5555001', email: 'm.musik@staatsoper.de' },
        { name: 'Anna Kunst', role: 'Hausverwaltung', phone: '+49 89 5555002', email: 'a.kunst@staatsoper.de' }
      ],
      objects: [
        { name: 'Hauptfoyer', instructions: 'Vorstellungen: Publikumsbetreuung, Garderobe', type: 'cultural' },
        { name: 'Bühnenbereich', instructions: 'Zugangskontrolle, Künstlerschutz', type: 'cultural' },
      ]
    },
    { 
      name: 'Hofbräuhaus München', 
      number: 'K106',
      street: 'Platzl 9',
      contacts: [
        { name: 'Sepp Bier', role: 'Wirt', phone: '+49 89 6666001', email: 's.bier@hofbraeuhaus.de' }
      ],
      objects: [
        { name: 'Festsaal', instructions: 'Abends: Personenschutz, Deeskalation', type: 'restaurant' },
      ]
    },
  ];

  for (const customerData of customers2Data) {
    const dbCustomer = await prisma.customer.upsert({
      where: {
        tenantId_customerNumber: {
          tenantId: tenant2.id,
          customerNumber: customerData.number,
        },
      },
      update: {},
      create: {
        tenantId: tenant2.id,
        companyName: customerData.name,
        customerNumber: customerData.number,
        email: `info@${customerData.name.toLowerCase().replace(/[^a-z]/g, '')}.de`,
        phone: '+49 89 ' + (Math.floor(1000000 + Math.random() * 9000000)),
        street: customerData.street,
        zipCode: '80539',
        city: 'München',
        country: 'DE',
        status: 'ACTIVE',
        vatId: `DE${String(200000000 + Math.floor(Math.random() * 900000000))}`,
      },
    });

    // Kontaktpersonen erstellen
    for (const contact of customerData.contacts) {
      await prisma.contactPerson.create({
        data: {
          tenantId: tenant2.id,
          customerId: dbCustomer.id,
          firstName: contact.name.split(' ')[0],
          lastName: contact.name.split(' ').slice(1).join(' '),
          role: contact.role,
          phone: contact.phone,
          email: contact.email,
          isPrimary: contact === customerData.contacts[0],
        },
      });
    }

    // Objekte erstellen
    for (const obj of customerData.objects) {
      await prisma.sMSObject.create({
        data: {
          tenantId: tenant2.id,
          customerId: dbCustomer.id,
          name: obj.name,
          objectNumber: `${customerData.number}-O${String(customerData.objects.indexOf(obj) + 1).padStart(2, '0')}`,
          street: customerData.street,
          zipCode: '80539',
          city: 'München',
          specialInstructions: obj.instructions,
          objectType: obj.type,
        },
      });
    }
  }

  console.log(`✅ ${customers2Data.length} Kunden mit ${customers2Data.reduce((sum, c) => sum + c.objects.length, 0)} Objekten erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 12. KUNDEN & OBJEKTE für Tenant 3 (vollständig)
  // ═══════════════════════════════════════════════════════
  console.log('🏭 Erstelle Kunden und Objekte für Secure Solutions UG...');
  
  const customers3Data = [
    { 
      name: 'Berlin Mall', 
      number: 'K201',
      street: 'Kurfürstendamm 1',
      contacts: [
        { name: 'Hans Einkauf', role: 'Center Manager', phone: '+49 30 1111001', email: 'h.einkauf@berlin-mall.de' }
      ],
      objects: [
        { name: 'Haupteingang', instructions: 'Öffnungszeiten: Diebstahlsicherung, Kundenbetreuung', type: 'retail' },
        { name: 'Parkhaus', instructions: 'Nachtkontrolle, Verkehrssicherung', type: 'parking' },
      ]
    },
    { 
      name: 'Charité Berlin', 
      number: 'K202',
      street: 'Charitéplatz 1',
      contacts: [
        { name: 'Dr. Krank', role: 'Klinikdirektor', phone: '+49 30 2222001', email: 'd.krank@charite.de' },
        { name: 'Maria Pflege', role: 'Sicherheitsleitung', phone: '+49 30 2222002', email: 'm.pflege@charite.de' }
      ],
      objects: [
        { name: 'Notaufnahme', instructions: '24/7, Personenkontrolle, Deeskalation', type: 'hospital' },
        { name: 'Apotheke', instructions: 'Zugangskontrolle, Diebstahlsicherung', type: 'hospital' },
      ]
    },
    { 
      name: 'Deutsche Bank Berlin', 
      number: 'K203',
      street: 'Unter den Linden 1',
      contacts: [
        { name: 'Dr. Bank', role: 'Filialleiter', phone: '+49 30 3333001', email: 'd.bank@deutsche-bank.de' }
      ],
      objects: [
        { name: 'Hauptfiliale', instructions: 'Werttransportbegleitung, Überfallprävention', type: 'bank' },
        { name: 'Rechenzentrum', instructions: '24/7 Hochsicherheit, Biometrische Zutrittskontrolle', type: 'datacenter' },
        { name: 'Filiale Alexanderplatz', instructions: 'Öffnungszeiten: Öffnungssicherung, Geldautomaten-Überwachung', type: 'bank' },
      ]
    },
  ];

  for (const customerData of customers3Data) {
    const dbCustomer = await prisma.customer.upsert({
      where: {
        tenantId_customerNumber: {
          tenantId: tenant3.id,
          customerNumber: customerData.number,
        },
      },
      update: {},
      create: {
        tenantId: tenant3.id,
        companyName: customerData.name,
        customerNumber: customerData.number,
        email: `info@${customerData.name.toLowerCase().replace(/[^a-z]/g, '')}.de`,
        phone: '+49 30 ' + (Math.floor(1000000 + Math.random() * 9000000)),
        street: customerData.street,
        zipCode: '10117',
        city: 'Berlin',
        country: 'DE',
        status: 'ACTIVE',
        vatId: `DE${String(300000000 + Math.floor(Math.random() * 900000000))}`,
      },
    });

    // Kontaktpersonen erstellen
    for (const contact of customerData.contacts) {
      await prisma.contactPerson.create({
        data: {
          tenantId: tenant3.id,
          customerId: dbCustomer.id,
          firstName: contact.name.split(' ')[0],
          lastName: contact.name.split(' ').slice(1).join(' '),
          role: contact.role,
          phone: contact.phone,
          email: contact.email,
          isPrimary: contact === customerData.contacts[0],
        },
      });
    }

    // Objekte erstellen
    for (const obj of customerData.objects) {
      await prisma.sMSObject.create({
        data: {
          tenantId: tenant3.id,
          customerId: dbCustomer.id,
          name: obj.name,
          objectNumber: `${customerData.number}-O${String(customerData.objects.indexOf(obj) + 1).padStart(2, '0')}`,
          street: customerData.street,
          zipCode: '10117',
          city: 'Berlin',
          specialInstructions: obj.instructions,
          objectType: obj.type,
        },
      });
    }
  }

  console.log(`✅ ${customers3Data.length} Kunden mit ${customers3Data.reduce((sum, c) => sum + c.objects.length, 0)} Objekten erstellt\n`);

  // ═══════════════════════════════════════════════════════
  // 13. EINSÄTZE & ZEITEINTRÄGE (2 Monate zurück + 1 Monat Zukunft)
  // ═══════════════════════════════════════════════════════
  console.log('📅 Erstelle Einsätze und Zeiteinträge (2 Monate zurück + 1 Monat Zukunft)...');
  
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 60); // 2 Monate zurück
  
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 30); // 1 Monat Zukunft
  
  let deploymentCount = 0;
  let timeEntryCount = 0;

  // Einsätze für den gesamten Zeitraum
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const deploymentDate = new Date(startDate);
    deploymentDate.setDate(startDate.getDate() + dayOffset);
    
    // Wochenende überspringen (0 = Sonntag, 6 = Samstag)
    const dayOfWeek = deploymentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Tenant 1: ~5 Einsätze pro Tag
    const tenant1Employees = await prisma.employee.findMany({
      where: { tenantId: tenant1.id },
      take: 5,
    });

    const tenant1Objects = await prisma.sMSObject.findMany({
      where: { tenantId: tenant1.id },
      take: 5,
    });

    for (let i = 0; i < Math.min(5, tenant1Employees.length); i++) {
      const startTime = new Date(deploymentDate);
      startTime.setHours(8, 0, 0, 0);
      const endTime = new Date(deploymentDate);
      endTime.setHours(16, 0, 0, 0);

      // Status abhängig vom Datum
      const isFuture = deploymentDate > today;
      const isToday = deploymentDate.toDateString() === today.toDateString();
      const deploymentStatus = isFuture ? 'planned' : isToday ? 'confirmed' : 'completed';

      const deployment = await prisma.deployment.create({
        data: {
          tenantId: tenant1.id,
          employeeId: tenant1Employees[i].id,
          objectId: tenant1Objects[i % tenant1Objects.length].id,
          date: deploymentDate,
          startTime,
          endTime,
          status: deploymentStatus,
          plannedById: tenant1User.id,
          confirmedAt: isFuture ? null : new Date(),
        },
      });

      // Nur für Vergangenheit und heute TimeRecords erstellen
      if (!isFuture) {
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
        timeEntryCount++;
      }

      deploymentCount++;
    }

    // Tenant 2: ~3 Einsätze pro Tag
    const tenant2Employees = await prisma.employee.findMany({
      where: { tenantId: tenant2.id },
      take: 3,
    });

    const tenant2Objects = await prisma.sMSObject.findMany({
      where: { tenantId: tenant2.id },
      take: 3,
    });

    for (let i = 0; i < Math.min(3, tenant2Employees.length); i++) {
      const startTime = new Date(deploymentDate);
      startTime.setHours(7, 0, 0, 0);
      const endTime = new Date(deploymentDate);
      endTime.setHours(15, 0, 0, 0);

      // Status abhängig vom Datum
      const isFuture = deploymentDate > today;
      const isToday = deploymentDate.toDateString() === today.toDateString();
      const deploymentStatus = isFuture ? 'planned' : isToday ? 'confirmed' : 'completed';

      const deployment = await prisma.deployment.create({
        data: {
          tenantId: tenant2.id,
          employeeId: tenant2Employees[i].id,
          objectId: tenant2Objects[i % tenant2Objects.length].id,
          date: deploymentDate,
          startTime,
          endTime,
          status: deploymentStatus,
          plannedById: tenant2User.id,
          confirmedAt: isFuture ? null : new Date(),
        },
      });

      // Nur für Vergangenheit und heute TimeRecords erstellen
      if (!isFuture) {
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
        timeEntryCount++;
      }

      deploymentCount++;
    }

    // Tenant 3: ~2 Einsätze pro Tag
    const tenant3Employees = await prisma.employee.findMany({
      where: { tenantId: tenant3.id },
      take: 2,
    });

    const tenant3Objects = await prisma.sMSObject.findMany({
      where: { tenantId: tenant3.id },
      take: 2,
    });

    for (let i = 0; i < Math.min(2, tenant3Employees.length); i++) {
      const startTime = new Date(deploymentDate);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(deploymentDate);
      endTime.setHours(17, 0, 0, 0);

      // Status abhängig vom Datum
      const isFuture = deploymentDate > today;
      const isToday = deploymentDate.toDateString() === today.toDateString();
      const deploymentStatus = isFuture ? 'planned' : isToday ? 'confirmed' : 'completed';

      const deployment = await prisma.deployment.create({
        data: {
          tenantId: tenant3.id,
          employeeId: tenant3Employees[i].id,
          objectId: tenant3Objects[i % tenant3Objects.length].id,
          date: deploymentDate,
          startTime,
          endTime,
          status: deploymentStatus,
          plannedById: tenant3User.id,
          confirmedAt: isFuture ? null : new Date(),
        },
      });

      // Nur für Vergangenheit und heute TimeRecords erstellen
      if (!isFuture) {
        await prisma.timeRecord.create({
          data: {
            tenantId: tenant3.id,
            employeeId: tenant3Employees[i].id,
            deploymentId: deployment.id,
            date: deploymentDate,
            clockIn: startTime,
            clockOut: endTime,
            regularHours: 8,
          },
        });
        timeEntryCount++;
      }

      deploymentCount++;
    }
  }

  console.log(`✅ ${deploymentCount} Einsätze erstellt`);
  console.log(`✅ ${timeEntryCount} Zeiteinträge erstellt`);
  console.log(`📅 Zeitraum: ${startDate.toLocaleDateString('de-DE')} bis ${endDate.toLocaleDateString('de-DE')}\n`);

  // ═══════════════════════════════════════════════════════
  // 14. ZUSAMMENFASSUNG
  // ═══════════════════════════════════════════════════════
  const stats = await prisma.$transaction([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.employee.count(),
    prisma.customer.count(),
    prisma.sMSObject.count(),
    prisma.deployment.count(),
    prisma.timeRecord.count(),
    prisma.plan.count(),
    prisma.qualification.count(),
    prisma.contactPerson.count(),
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
  console.log(`   💰 Tarife: ${stats[7]}`);
  console.log(`   🎓 Qualifikationen: ${stats[8]}`);
  console.log(`   👔 Kontaktpersonen: ${stats[9]}\n`);

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
  console.log('   💳 Plan: Professional (€149.99/Monat)');
  console.log(`   👥 Mitarbeiter: ${employeeNames1.length}`);
  console.log(`   🏭 Kunden: ${customers1Data.length}`);
  console.log(`   📦 Objekte: ${customers1Data.reduce((sum, c) => sum + c.objects.length, 0)}\n`);

  console.log('🏢 TENANT 2: Schutz & Dienstleistungen AG (Enterprise)');
  console.log('   🌐 URL: http://localhost:5173');
  console.log('   🔑 License Key: lic_schutz-ag_enterprise');
  console.log('   📧 Email: info@schutz-ag.de');
  console.log('   🔑 Password: Password123!');
  console.log('   💳 Plan: Enterprise (€399.99/Monat)');
  console.log(`   👥 Mitarbeiter: ${employeeNames2.length}`);
  console.log(`   🏭 Kunden: ${customers2Data.length}`);
  console.log(`   📦 Objekte: ${customers2Data.reduce((sum, c) => sum + c.objects.length, 0)}\n`);

  console.log('🏢 TENANT 3: Secure Solutions UG (Test/Startup)');
  console.log('   🌐 URL: http://localhost:5173');
  console.log('   🔑 License Key: lic_secure-solutions_test');
  console.log('   📧 Email: kontakt@secure-solutions.de');
  console.log('   🔑 Password: Password123!');
  console.log('   💳 Plan: Starter Test (30 Tage)');
  console.log(`   👥 Mitarbeiter: ${employeeNames3.length}`);
  console.log(`   🏭 Kunden: ${customers3Data.length}`);
  console.log(`   📦 Objekte: ${customers3Data.reduce((sum, c) => sum + c.objects.length, 0)}\n`);

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
