import { PrismaClient, Prisma } from '@prisma/client';
import { PERMISSIONS, DEFAULT_ROLES } from '../config/permissions';
import { logger } from '../config/logger';

type TxClient = Prisma.TransactionClient | PrismaClient;

/**
 * Stellt sicher, dass alle Berechtigungen und Standardrollen
 * für einen Mandanten existieren. Idempotent.
 */
export async function ensureDefaultRoles(db: TxClient, tenantId: string): Promise<void> {
  // 1. Alle Permissions upserten (systemweit, einmalig)
  const perms = await Promise.all(
    PERMISSIONS.map((p) =>
      db.permission.upsert({
        where: { slug: p.slug },
        update: { name: p.name, module: p.module, description: p.description },
        create: p,
      })
    )
  );
  const permBySlug = new Map(perms.map((p) => [p.slug, p.id]));

  // 2. Für jede Standardrolle: upserten + Permissions zuweisen
  for (const def of DEFAULT_ROLES) {
    const role = await db.role.upsert({
      where: { tenantId_slug: { tenantId, slug: def.slug } },
      update: { name: def.name, description: def.description, isSystem: true },
      create: {
        tenantId,
        slug: def.slug,
        name: def.name,
        description: def.description,
        isSystem: true,
      },
    });

    // Berechtigungen ermitteln
    const permIds =
      def.perms === '*' ? [...permBySlug.values()] : def.perms.map((s) => permBySlug.get(s)!).filter(Boolean);

    // Vorhandene löschen und neu anlegen (in Transaktion)
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });

    if (permIds.length > 0) {
      await db.rolePermission.createMany({
        data: permIds.map((permissionId) => ({ roleId: role.id, permissionId, granted: true })),
      });
    }
  }

  logger.info(`Standardrollen für Mandant ${tenantId} sichergestellt (${perms.length} Permissions)`);
}

/**
 * Stellt Standardrollen für ALLE Mandanten sicher.
 * Wird beim Seed verwendet.
 */
export async function ensureDefaultRolesForAllTenants(db: PrismaClient): Promise<void> {
  const tenants = await db.tenant.findMany({ select: { id: true, companyName: true } });
  logger.info(`Stelle Standardrollen für ${tenants.length} Mandanten sicher...`);

  for (const tenant of tenants) {
    await ensureDefaultRoles(db, tenant.id);
  }

  logger.info(`Standardrollen für alle Mandanten sichergestellt`);
}
