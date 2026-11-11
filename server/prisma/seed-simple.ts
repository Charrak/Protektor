import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ensureDefaultRoles } from '../src/services/defaultRoles.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starte Database Seeding...\n');

  // 1. Platform Admin erstellen
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  
  const platformAdmin = await prisma.platformAdmin.upsert({
    where: { email: 'admin@sms-platform.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@sms-platform.com',
      passwordHash: passwordHash,
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
      licenseStatus: 'ACTIVE',
      employeeLimit: 50,
      paymentGraceDays: 7,
      offlineGraceMinutes: 1440,
      createdById: platformAdmin.id,
    },
  });

  console.log('✅ Demo Tenant erstellt:');
  console.log(`   Company: Demo Security GmbH`);
  console.log(`   Tenant ID: DEMO-001\n`);

  // 3. Standardrollen + Berechtigungen erstellen (zentrale Definition)
  await ensureDefaultRoles(prisma, demoTenant.id);
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_slug: { tenantId: demoTenant.id, slug: 'admin' } },
  });

  console.log('✅ Standardrollen und Berechtigungen erstellt\n');

  // 4. Demo User erstellen
  const userPasswordHash = await bcrypt.hash('Demo123!', 12);
  
  const demoUser = await prisma.user.upsert({
    where: { 
      tenantId_username: {
        tenantId: demoTenant.id,
        username: 'demo'
      }
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      username: 'demo',
      email: 'demo@security-company.de',
      passwordHash: userPasswordHash,
      firstName: 'Demo',
      lastName: 'Benutzer',
      isActive: true,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Demo User erstellt:');
  console.log(`   Username: demo`);
  console.log(`   Email: demo@security-company.de`);
  console.log(`   Password: Demo123!\n`);

  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 Seeding abgeschlossen!');
  console.log('═══════════════════════════════════════════════════');
  console.log('\n📋 Login-Daten:\n');
  console.log('Platform Admin:');
  console.log('   URL: http://92.5.64.224:3000/platform/login');
  console.log('   Email: admin@sms-platform.com');
  console.log('   Password: Admin123!\n');
  console.log('Tenant User:');
  console.log('   URL: http://92.5.64.224:3000/login');
  console.log('   Username: demo');
  console.log('   Password: Demo123!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
