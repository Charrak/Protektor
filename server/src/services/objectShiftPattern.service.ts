import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

export interface ShiftPatternInput {
  name: string;
  weekdays: number[];        // 1=Mo, 7=So
  startTime: string;         // "HH:mm"
  endTime: string;           // "HH:mm"
  breakMinutes?: number;
  requiredPersonnel?: number;
  notes?: string;
  isActive?: boolean;
}

export class ObjectShiftPatternService {
  /**
   * Erstellt ein Schichtmuster für ein Objekt
   */
  async create(tenantId: string, objectId: string, input: ShiftPatternInput, userId: string) {
    // Validierung
    if (!input.name) {
      throw new ValidationError('Name ist erforderlich');
    }
    if (!input.weekdays || input.weekdays.length === 0) {
      throw new ValidationError('Mindestens ein Wochentag muss angegeben werden');
    }
    if (input.weekdays.some(d => d < 1 || d > 7)) {
      throw new ValidationError('Wochentage müssen zwischen 1 (Mo) und 7 (So) liegen');
    }
    if (!input.startTime || !input.endTime) {
      throw new ValidationError('Start- und Endzeit sind erforderlich');
    }

    // Objekt prüfen
    const object = await prisma.sMSObject.findFirst({
      where: { id: objectId, tenantId }
    });
    if (!object) {
      throw new NotFoundError('Objekt');
    }

    const pattern = await prisma.objectShiftPattern.create({
      data: {
        objectId,
        name: input.name,
        weekdays: input.weekdays,
        startTime: new Date(`1970-01-01T${input.startTime}:00Z`),
        endTime: new Date(`1970-01-01T${input.endTime}:00Z`),
        breakMinutes: input.breakMinutes ?? 0,
        requiredPersonnel: input.requiredPersonnel ?? 1,
        notes: input.notes,
        isActive: input.isActive ?? true,
      }
    });

    logger.info(`Schichtmuster erstellt: ${input.name} für Objekt ${objectId}`);
    return pattern;
  }

  /**
   * Listet alle Schichtmuster eines Objekts
   */
  async listByObject(tenantId: string, objectId: string) {
    const object = await prisma.sMSObject.findFirst({
      where: { id: objectId, tenantId }
    });
    if (!object) {
      throw new NotFoundError('Objekt');
    }

    return prisma.objectShiftPattern.findMany({
      where: { objectId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
    });
  }

  /**
   * Aktualisiert ein Schichtmuster
   */
  async update(tenantId: string, patternId: string, input: Partial<ShiftPatternInput>) {
    const pattern = await prisma.objectShiftPattern.findFirst({
      where: { id: patternId },
      include: { object: { select: { tenantId: true } } }
    });

    if (!pattern || pattern.object.tenantId !== tenantId) {
      throw new NotFoundError('Schichtmuster');
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.weekdays !== undefined) updateData.weekdays = input.weekdays;
    if (input.startTime !== undefined) updateData.startTime = new Date(`1970-01-01T${input.startTime}:00Z`);
    if (input.endTime !== undefined) updateData.endTime = new Date(`1970-01-01T${input.endTime}:00Z`);
    if (input.breakMinutes !== undefined) updateData.breakMinutes = input.breakMinutes;
    if (input.requiredPersonnel !== undefined) updateData.requiredPersonnel = input.requiredPersonnel;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    return prisma.objectShiftPattern.update({
      where: { id: patternId },
      data: updateData
    });
  }

  /**
   * Löscht ein Schichtmuster
   */
  async delete(tenantId: string, patternId: string) {
    const pattern = await prisma.objectShiftPattern.findFirst({
      where: { id: patternId },
      include: { object: { select: { tenantId: true } } }
    });

    if (!pattern || pattern.object.tenantId !== tenantId) {
      throw new NotFoundError('Schichtmuster');
    }

    await prisma.objectShiftPattern.delete({ where: { id: patternId } });
    logger.info(`Schichtmuster gelöscht: ${patternId}`);
    return { success: true };
  }

  /**
   * Gibt die Schichtmuster für ein bestimmtes Datum zurück
   */
  async getPatternsForDate(objectId: string, date: Date) {
    // ISO Wochentag: 0=So, 1=Mo, ..., 6=Sa
    // Unser Format: 1=Mo, ..., 7=So
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

    const patterns = await prisma.objectShiftPattern.findMany({
      where: {
        objectId,
        isActive: true,
        weekdays: { has: dayOfWeek }
      }
    });

    return patterns.map(p => ({
      ...p,
      startTime: p.startTime.toISOString().substr(11, 5),
      endTime: p.endTime.toISOString().substr(11, 5)
    }));
  }
}

export const objectShiftPatternService = new ObjectShiftPatternService();
