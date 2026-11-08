import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError } from '../middleware/errorHandler';

interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  isActive?: boolean;
}

export class UserService {
  async list(query: { search?: string; roleId?: string; isActive?: boolean; page?: number; limit?: number }) {
    const { search, roleId, isActive, page = 1, limit = 25 } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleId) where.roleId = roleId;
    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: { lastName: 'asc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u: any) => this.toSafeUser(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
              where: { granted: true },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundError('Benutzer');

    return {
      ...this.toSafeUser(user),
      role: {
        ...user.role,
        permissions: user.role.rolePermissions.map((rp: any) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          slug: rp.permission.slug,
          module: rp.permission.module,
        })),
      },
      lastLogin: user.lastLogin,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(input: CreateUserInput) {
    // Prüfen ob Username oder Email bereits vergeben
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: input.username },
          { email: input.email },
        ],
        deletedAt: null,
      },
    });

    if (existing) {
      if (existing.username === input.username) {
        throw new ConflictError('Benutzername ist bereits vergeben');
      }
      throw new ConflictError('E-Mail-Adresse ist bereits vergeben');
    }

    // Rolle prüfen
    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) throw new NotFoundError('Rolle');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: input.roleId,
      },
      include: { role: true },
    });

    logger.info(`Benutzer erstellt: ${user.username} (${role.slug})`);

    return this.toSafeUser(user);
  }

  async update(id: string, input: UpdateUserInput) {
    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Benutzer');

    // Bei E-Mail-Änderung prüfen
    if (input.email && input.email !== existing.email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email: input.email, deletedAt: null, id: { not: id } },
      });
      if (emailTaken) throw new ConflictError('E-Mail-Adresse ist bereits vergeben');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.email !== undefined && { email: input.email }),
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.roleId !== undefined && { roleId: input.roleId }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: { role: true },
    });

    logger.info(`Benutzer aktualisiert: ${user.username}`);

    return this.toSafeUser(user);
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('Benutzer');

    if (newPassword.length < 8) {
      throw new Error('Passwort muss mindestens 8 Zeichen lang sein');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Alle Sitzungen beenden
    await prisma.session.updateMany({
      where: { userId: id, isActive: true },
      data: { isActive: false },
    });

    logger.info(`Passwort zurückgesetzt für: ${user.username}`);
  }

  async delete(id: string) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('Benutzer');

    // Soft-Delete
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Sitzungen beenden
    await prisma.session.updateMany({
      where: { userId: id, isActive: true },
      data: { isActive: false },
    });

    logger.info(`Benutzer deaktiviert: ${user.username}`);
  }

  private toSafeUser(user: any) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: {
        id: user.role.id,
        name: user.role.name,
        slug: user.role.slug,
      },
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  }
}

export const userService = new UserService();
