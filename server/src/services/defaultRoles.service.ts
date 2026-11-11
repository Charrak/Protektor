import { PrismaClient, Prisma } from '@prisma/client';
import { PERMISSIONS, DEFAULT_ROLES } from '../config/permissions';
import { logger } from '../config/logger';

type TxClient = Prisma.TransactionClient | PrismaClient;

/**
 * Stellt sicher, dass alle Berechtigungen und Standardrollen
 * für einen Mandanten existieren. Idempotent und NICHT-destruktiv:
 *  - Berechtigungen werden systemweit angelegt/aktualisiert (ohne Namenskonflikte).
 *  - Neue Rollen erhalten ihre Standardrechte.
 *  - Die Admin-Rolle bekommt immer alle Rechte (auch neu hinzugekommene).
 *  - Rollen ohne jede Berechtigung (z. B. von alten Seeds) werden mit den Standardrechten gefüllt.
 *  - Von Administratoren angepasste Rollen werden NICHT überschrieben.
 */
export async function ensureDefaultRoles(db: TxClient, tenantId: string): Promise<void> {
  // 1. Permissions sequentiell anlegen (Permission.name ist UNIQUE -> Namenskonflikte abfangen)
  const permBySlug = new Map<string, string>();
  for (const p of PERMISSIONS) {
    const bySlug = await db.permission.findUnique({ where: { slug: p.slug } });
    const nameOwner = await db.permission.findFirst({ where: { name: p.name } });
    const nameFree = !nameOwner || (bySlug && nameOwner.id === bySlug.id);

    if (bySlug) {
      await db.permission.update({
        where: { id: bySlug.id },
        data: {
          module: p.module,
          description: p.description,
          ...(nameFree ? { name: p.name } : {}),
        },
      });
      permBySlug.set(p.slug, bySlug.id);
    } else {
      const created = await db.permission.create({
        data: { ...p, name: nameFree ? p.name : `${p.name} (${p.slug})` },
      });
      permBySlug.set(p.slug, created.id);
    }
  }

  // 2. Standardrollen sicherstellen
  for (const def of DEFAULT_ROLES) {
    const existing = await db.role.findUnique({
      where: { tenantId_slug: { tenantId, slug: def.slug } },
    });

    const role = existing
      ? await db.role.update({ where: { id: existing.id }, data: { isSystem: true } })
      : await db.role.create({
          data: {
            tenantId,
            slug: def.slug,
            name: def.name,
            description: def.description,
            isSystem: true,
          },
        });

    const defaultIds: string[] =
      def.perms === '*'
        ? [...permBySlug.values()]
        : def.perms.map((s) => permBySlug.get(s)).filter((id): id is string => !!id);

    const current = await db.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const currentIds = new Set(current.map((c) => c.permissionId));

    const shouldFill = !existing || def.perms === '*' || currentIds.size === 0;
    if (shouldFill) {
      const missing = defaultIds.filter((id) => !currentIds.has(id));
      if (missing.length > 0) {
        await db.rolePermission.createMany({
          data: missing.map((permissionId) => ({ roleId: role.id, permissionId, granted: true })),
          skipDuplicates: true,
        });
      }
    }

    if (def.perms === '*') {
      await db.rolePermission.updateMany({
        where: { roleId: role.id, granted: false },
        data: { granted: true },
      });
    }
  }

  logger.info(`Standardrollen für Mandant ${tenantId} sichergestellt (${permBySlug.size} Permissions)`);
}

/**
 * Stellt Standardrollen für ALLE Mandanten sicher.
 * Wird beim Seed und beim Serverstart verwendet.
 */
export async function ensureDefaultRolesForAllTenants(db: PrismaClient): Promise<void> {
  const tenants = await db.tenant.findMany({ select: { id: true, companyName: true } });
  logger.info(`Stelle Standardrollen für ${tenants.length} Mandanten sicher...`);

  for (const tenant of tenants) {
    await ensureDefaultRoles(db, tenant.id);
  }

  logger.info('Standardrollen für alle Mandanten sichergestellt');
}
