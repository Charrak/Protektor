import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError } from '../middleware/errorHandler';

export class RoleService {
  async list() {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
          where: { granted: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.rolePermissions.map((rp: any) => ({
        id: rp.permission.id,
        slug: rp.permission.slug,
        module: rp.permission.module,
      })),
    }));
  }

  async getById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
          where: { granted: true },
        },
        _count: { select: { users: true } },
      },
    });

    if (!role) throw new NotFoundError('Rolle');

    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.rolePermissions.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        slug: rp.permission.slug,
        module: rp.permission.module,
        description: rp.permission.description,
      })),
    };
  }

  async create(data: { name: string; slug: string; description?: string }) {
    const existing = await prisma.role.findFirst({
      where: { slug: data.slug },
    });
    if (existing) throw new ConflictError('Rollen-Slug ist bereits vergeben');

    const role = await prisma.role.create({ data });
    logger.info(`Rolle erstellt: ${role.slug}`);
    return role;
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundError('Rolle');

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    logger.info(`Rolle aktualisiert: ${updated.slug}`);
    return updated;
  }

  async setPermissions(roleId: string, permissionIds: string[]) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Rolle');

    // Bestehende Berechtigungen löschen
    await prisma.rolePermission.deleteMany({ where: { roleId } });

    // Neue Berechtigungen hinzufügen
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId,
          permissionId,
          granted: true,
        })),
      });
    }

    logger.info(`Berechtigungen aktualisiert für Rolle: ${role.slug} (${permissionIds.length} Berechtigungen)`);
  }

  async delete(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) throw new NotFoundError('Rolle');
    if (role.isSystem) throw new ConflictError('Systemrollen können nicht gelöscht werden');
    if (role._count.users > 0) throw new ConflictError('Rolle hat noch zugewiesene Benutzer');

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });

    logger.info(`Rolle gelöscht: ${role.slug}`);
  }

  async listAllPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { slug: 'asc' }],
    });

    // Gruppieren nach Modul
    const grouped: Record<string, Array<{ id: string; name: string; slug: string; description?: string | null }>> = {};
    for (const p of permissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description || undefined,
      });
    }

    return grouped;
  }
}

export const roleService = new RoleService();
