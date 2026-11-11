import { PrismaClient } from '@prisma/client';
import { ensureDefaultRolesForAllTenants } from '../src/services/defaultRoles.service';

const prisma = new PrismaClient();

/**
 * Rollen- & Berechtigungs-Setup.
 * Nutzt die zentrale Definition aus src/config/permissions.ts
 * (Single Source of Truth) und gilt für ALLE Mandanten.
 * Das Script ist beliebig oft wiederholbar und überschreibt keine
 * von Administratoren angepassten Rollen.
 */
async function main() {
  console.log('🔐 Starte Rollen- & Berechtigungs-Setup...\n');
  await ensureDefaultRolesForAllTenants(prisma);
  console.log('\n🎉 Rollen-Setup abgeschlossen!');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
