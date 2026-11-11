import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';

export class PlanningGroupService {
  /**
   * Erstellt eine neue Planungsgruppe
   */
  async create(tenantId: string, input: {
    name: string;
    description?: string;
    color?: string;
    leadUserId?: string;
    leadDeputies?: string[];
    objectIds: string[];
    employeeIds: string[];
  }, userId: string) {
    // Prüfe, ob Name bereits existiert (nur aktive Gruppen)
    const existing = await prisma.planningGroup.findFirst({
      where: { tenantId, name: input.name, isActive: true }
    });
    if (existing) {
      throw new ConflictError(`Planungsgruppe "${input.name}" existiert bereits`);
    }

    // Validiere Teamleiter (leere Strings ignorieren)
    if (input.leadUserId && input.leadUserId.trim() !== '') {
      const leadUser = await prisma.user.findFirst({
        where: { id: input.leadUserId, tenantId }
      });
      if (!leadUser) {
        throw new ValidationError('Teamleiter existiert nicht oder gehört nicht zu diesem Mandanten');
      }
    } else {
      input.leadUserId = undefined;
    }

    // Validiere Vertreter (leere Strings filtern)
    if (input.leadDeputies && input.leadDeputies.length > 0) {
      const validDeputies = input.leadDeputies.filter(id => id && id.trim() !== '');
      if (validDeputies.length > 0) {
        const deputies = await prisma.user.findMany({
          where: { id: { in: validDeputies }, tenantId }
        });
        if (deputies.length !== validDeputies.length) {
          throw new ValidationError('Ein oder mehrere Vertreter existieren nicht oder gehören nicht zu diesem Mandanten');
        }
        input.leadDeputies = validDeputies;
      } else {
        input.leadDeputies = [];
      }
    }

    // Validiere Objekte (nur wenn welche vorhanden)
    if (input.objectIds.length > 0) {
      const objects = await prisma.sMSObject.findMany({
        where: { id: { in: input.objectIds }, tenantId }
      });
      if (objects.length !== input.objectIds.length) {
        throw new ValidationError('Ein oder mehrere Objekte existieren nicht oder gehören nicht zu diesem Mandanten');
      }
    }

    // Validiere Mitarbeiter (nur wenn welche vorhanden)
    if (input.employeeIds.length > 0) {
      const employees = await prisma.employee.findMany({
        where: { id: { in: input.employeeIds }, tenantId, deletedAt: null }
      });
      if (employees.length !== input.employeeIds.length) {
        throw new ValidationError('Ein oder mehrere Mitarbeiter existieren nicht oder gehören nicht zu diesem Mandanten');
      }
    }

    const group = await prisma.planningGroup.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        color: input.color,
        leadUserId: input.leadUserId,
        leadDeputies: input.leadDeputies || [],
        createdBy: userId,
        objects: {
          create: input.objectIds.map((objectId, index) => ({
            objectId,
            sortOrder: index
          }))
        },
        employees: {
          create: input.employeeIds.map((employeeId, index) => ({
            employeeId,
            sortOrder: index,
            isPrimary: index < 5 // Erste 5 als primär markieren
          }))
        }
      },
      include: {
        objects: {
          include: {
            object: {
              include: {
                customer: true
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        },
        employees: {
          include: {
            employee: true
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    logger.info(`Planungsgruppe erstellt: ${group.name} (${group.id}) mit ${input.objectIds.length} Objekten und ${input.employeeIds.length} Mitarbeitern`);
    return group;
  }

  /**
   * Listet alle Planungsgruppen eines Mandanten
   */
  async list(tenantId: string, userId?: string) {
    const where: any = { tenantId, isActive: true };
    
    // Wenn userId übergeben wird, filtere nach Planungsgruppen, bei denen der User
    // Teamleiter oder Vertreter ist
    if (userId) {
      where.OR = [
        { leadUserId: userId },
        { leadDeputies: { has: userId } }
      ];
    }
    
    return prisma.planningGroup.findMany({
      where,
      include: {
        leadUser: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        objects: {
          include: {
            object: {
              include: {
                customer: true
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        },
        employees: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                personnelNumber: true
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Holt eine einzelne Planungsgruppe
   */
  async getById(tenantId: string, groupId: string) {
    const group = await prisma.planningGroup.findFirst({
      where: { id: groupId, tenantId },
      include: {
        leadUser: {
          select: { id: true, firstName: true, lastName: true, username: true }
        },
        objects: {
          include: {
            object: {
              include: {
                customer: true,
                requirements: {
                  include: {
                    qualification: true
                  }
                }
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        },
        employees: {
          include: {
            employee: {
              include: {
                qualifications: {
                  include: {
                    qualification: true
                  }
                }
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!group) {
      throw new NotFoundError('Planungsgruppe');
    }

    return group;
  }

  /**
   * Aktualisiert eine Planungsgruppe
   */
  async update(tenantId: string, groupId: string, input: {
    name?: string;
    description?: string;
    color?: string;
    leadUserId?: string | null;
    leadDeputies?: string[];
    isActive?: boolean;
    objectIds?: string[];
    employeeIds?: string[];
  }) {
    const group = await prisma.planningGroup.findFirst({
      where: { id: groupId, tenantId }
    });

    if (!group) {
      throw new NotFoundError('Planungsgruppe');
    }

    // Prüfe Namenskonflikt bei Namensänderung (nur aktive Gruppen)
    if (input.name && input.name !== group.name) {
      const existing = await prisma.planningGroup.findFirst({
        where: { tenantId, name: input.name, id: { not: groupId }, isActive: true }
      });
      if (existing) {
        throw new ConflictError(`Planungsgruppe "${input.name}" existiert bereits`);
      }
    }

    // Validiere Teamleiter (leere Strings ignorieren)
    if (input.leadUserId && input.leadUserId.trim() !== '') {
      const leadUser = await prisma.user.findFirst({
        where: { id: input.leadUserId, tenantId }
      });
      if (!leadUser) {
        throw new ValidationError('Teamleiter existiert nicht oder gehört nicht zu diesem Mandanten');
      }
    } else {
      input.leadUserId = undefined;
    }

    // Validiere Vertreter (leere Strings filtern)
    if (input.leadDeputies && input.leadDeputies.length > 0) {
      const validDeputies = input.leadDeputies.filter(id => id && id.trim() !== '');
      if (validDeputies.length > 0) {
        const deputies = await prisma.user.findMany({
          where: { id: { in: validDeputies }, tenantId }
        });
        if (deputies.length !== validDeputies.length) {
          throw new ValidationError('Ein oder mehrere Vertreter existieren nicht oder gehören nicht zu diesem Mandanten');
        }
        input.leadDeputies = validDeputies;
      } else {
        input.leadDeputies = [];
      }
    }

    // Aktualisiere Grunddaten
    const updatedGroup = await prisma.planningGroup.update({
      where: { id: groupId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.leadUserId !== undefined && { leadUserId: input.leadUserId }),
        ...(input.leadDeputies !== undefined && { leadDeputies: input.leadDeputies }),
        ...(input.isActive !== undefined && { isActive: input.isActive })
      }
    });

    // Aktualisiere Objekte wenn angegeben
    if (input.objectIds !== undefined) {
      await prisma.planningGroupObject.deleteMany({
        where: { planningGroupId: groupId }
      });

      if (input.objectIds.length > 0) {
        await prisma.planningGroupObject.createMany({
          data: input.objectIds.map((objectId, index) => ({
            planningGroupId: groupId,
            objectId,
            sortOrder: index
          }))
        });
      }
    }

    // Aktualisiere Mitarbeiter wenn angegeben
    if (input.employeeIds !== undefined) {
      await prisma.planningGroupEmployee.deleteMany({
        where: { planningGroupId: groupId }
      });

      if (input.employeeIds.length > 0) {
        await prisma.planningGroupEmployee.createMany({
          data: input.employeeIds.map((employeeId, index) => ({
            planningGroupId: groupId,
            employeeId,
            sortOrder: index,
            isPrimary: index < 5
          }))
        });
      }
    }

    logger.info(`Planungsgruppe aktualisiert: ${updatedGroup.name} (${updatedGroup.id})`);

    return this.getById(tenantId, groupId);
  }

  /**
   * Löscht eine Planungsgruppe (soft delete)
   */
  async delete(tenantId: string, groupId: string) {
    const group = await prisma.planningGroup.findFirst({
      where: { id: groupId, tenantId }
    });

    if (!group) {
      throw new NotFoundError('Planungsgruppe');
    }

    await prisma.planningGroup.update({
      where: { id: groupId },
      data: { isActive: false }
    });

    logger.info(`Planungsgruppe deaktiviert: ${group.name} (${group.id})`);
    return { success: true };
  }

  /**
   * Fügt Objekte zu einer Planungsgruppe hinzu
   */
  async addObjects(tenantId: string, groupId: string, objectIds: string[]) {
    const group = await prisma.planningGroup.findFirst({
      where: { id: groupId, tenantId }
    });

    if (!group) {
      throw new NotFoundError('Planungsgruppe');
    }

    // Hole bestehende Zuordnungen
    const existing = await prisma.planningGroupObject.findMany({
      where: { planningGroupId: groupId }
    });

    const existingIds = new Set(existing.map(e => e.objectId));
    const maxSortOrder = existing.length > 0 ? Math.max(...existing.map(e => e.sortOrder)) : -1;

    // Füge neue Objekte hinzu (überspringe bereits vorhandene)
    const newObjects = objectIds
      .filter(id => !existingIds.has(id))
      .map((objectId, index) => ({
        planningGroupId: groupId,
        objectId,
        sortOrder: maxSortOrder + index + 1
      }));

    if (newObjects.length > 0) {
      await prisma.planningGroupObject.createMany({
        data: newObjects
      });
    }

    logger.info(`${newObjects.length} Objekte zu Planungsgruppe ${group.name} hinzugefügt`);
    return this.getById(tenantId, groupId);
  }

  /**
   * Fügt Mitarbeiter zu einer Planungsgruppe hinzu
   */
  async addEmployees(tenantId: string, groupId: string, employeeIds: string[]) {
    const group = await prisma.planningGroup.findFirst({
      where: { id: groupId, tenantId }
    });

    if (!group) {
      throw new NotFoundError('Planungsgruppe');
    }

    // Hole bestehende Zuordnungen
    const existing = await prisma.planningGroupEmployee.findMany({
      where: { planningGroupId: groupId }
    });

    const existingIds = new Set(existing.map(e => e.employeeId));
    const maxSortOrder = existing.length > 0 ? Math.max(...existing.map(e => e.sortOrder)) : -1;

    // Füge neue Mitarbeiter hinzu (überspringe bereits vorhandene)
    const newEmployees = employeeIds
      .filter(id => !existingIds.has(id))
      .map((employeeId, index) => ({
        planningGroupId: groupId,
        employeeId,
        sortOrder: maxSortOrder + index + 1,
        isPrimary: false
      }));

    if (newEmployees.length > 0) {
      await prisma.planningGroupEmployee.createMany({
        data: newEmployees
      });
    }

    logger.info(`${newEmployees.length} Mitarbeiter zu Planungsgruppe ${group.name} hinzugefügt`);
    return this.getById(tenantId, groupId);
  }

  /**
   * Entfernt Objekte aus einer Planungsgruppe
   */
  async removeObjects(tenantId: string, groupId: string, objectIds: string[]) {
    await prisma.planningGroupObject.deleteMany({
      where: {
        planningGroupId: groupId,
        objectId: { in: objectIds }
      }
    });

    logger.info(`${objectIds.length} Objekte aus Planungsgruppe entfernt`);
    return this.getById(tenantId, groupId);
  }

  /**
   * Entfernt Mitarbeiter aus einer Planungsgruppe
   */
  async removeEmployees(tenantId: string, groupId: string, employeeIds: string[]) {
    await prisma.planningGroupEmployee.deleteMany({
      where: {
        planningGroupId: groupId,
        employeeId: { in: employeeIds }
      }
    });

    logger.info(`${employeeIds.length} Mitarbeiter aus Planungsgruppe entfernt`);
    return this.getById(tenantId, groupId);
  }
}

export const planningGroupService = new PlanningGroupService();
