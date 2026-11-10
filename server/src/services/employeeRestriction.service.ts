import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

interface CreateRestrictionInput {
  employeeId: string;
  type: string;
  description?: string;
  value?: string;
  objectId?: string;
  validFrom?: string;
  validUntil?: string;
}

interface UpdateRestrictionInput {
  description?: string;
  value?: string;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export class EmployeeRestrictionService {
  /**
   * Liste aller Restriktionen für einen Mitarbeiter
   */
  async listByEmployee(tenantId: string, employeeId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    return prisma.employeeRestriction.findMany({
      where: { employeeId, tenantId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        object: { select: { name: true, objectNumber: true } },
        creator: { select: { firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Erstelle eine neue Restriktion
   */
  async create(tenantId: string, input: CreateRestrictionInput, userId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    // Prüfe ob Objekt-spezifische Restriktion ein gültiges Objekt hat
    if (input.objectId) {
      const obj = await prisma.sMSObject.findFirst({
        where: { id: input.objectId, tenantId },
      });
      if (!obj) throw new NotFoundError('Objekt');
    }

    const restriction = await prisma.employeeRestriction.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        type: input.type as any,
        description: input.description,
        value: input.value,
        objectId: input.objectId,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        createdBy: userId,
      },
    });

    logger.info(`Restriktion erstellt: ${input.type} für MA ${input.employeeId}`);
    return restriction;
  }

  /**
   * Aktualisiere eine Restriktion
   */
  async update(tenantId: string, id: string, input: UpdateRestrictionInput) {
    const restriction = await prisma.employeeRestriction.findFirst({
      where: { id, tenantId },
    });
    if (!restriction) throw new NotFoundError('Restriktion');

    const data: any = {};
    if (input.description !== undefined) data.description = input.description;
    if (input.value !== undefined) data.value = input.value;
    if (input.validFrom !== undefined) data.validFrom = input.validFrom ? new Date(input.validFrom) : null;
    if (input.validUntil !== undefined) data.validUntil = input.validUntil ? new Date(input.validUntil) : null;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    return prisma.employeeRestriction.update({
      where: { id },
      data,
    });
  }

  /**
   * Lösche eine Restriktion
   */
  async delete(tenantId: string, id: string) {
    const restriction = await prisma.employeeRestriction.findFirst({
      where: { id, tenantId },
    });
    if (!restriction) throw new NotFoundError('Restriktion');

    await prisma.employeeRestriction.delete({ where: { id } });
    logger.info(`Restriktion gelöscht: ${id}`);
  }

  /**
   * Prüfe ob ein Mitarbeiter für eine Schicht verfügbar ist (alle Restriktionen)
   */
  async checkRestrictions(tenantId: string, employeeId: string, date: Date, startTime: Date, endTime: Date, objectId?: string) {
    const violations: { type: string; message: string }[] = [];

    // Lade Mitarbeiter mit Restriktionsfeldern
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) throw new NotFoundError('Mitarbeiter');

    // Lade explizite Restriktionen
    const restrictions = await prisma.employeeRestriction.findMany({
      where: {
        employeeId,
        tenantId,
        isActive: true,
        OR: [
          { validFrom: null, validUntil: null },
          { validFrom: { lte: date }, validUntil: { gte: date } },
          { validFrom: { lte: date }, validUntil: null },
        ],
      },
    });

    const dayOfWeek = date.getDay();
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();

    // Prüfe Felder aus Employee
    if (employee.noNightShift && (startHour >= 20 || endHour <= 6)) {
      violations.push({ type: 'no_night_shift', message: 'Keine Nachtschicht erlaubt (20-06 Uhr)' });
    }

    if (employee.noSundayShift && dayOfWeek === 0) {
      violations.push({ type: 'no_sunday', message: 'Keine Sonntagsarbeit erlaubt' });
    }

    if (employee.noHolidayShift) {
      // TODO: Feiertagsprüfung
    }

    // Prüfe maxDailyHours aus Employee
    const todayRecords = await prisma.timeRecord.findMany({
      where: { employeeId, tenantId, date: { equals: date } },
    });
    const todayMinutes = todayRecords.reduce((sum: number, r: any) => sum + (r.totalHours ? Number(r.totalHours) * 60 : 0), 0);
    const shiftMinutes = (endHour - startHour) * 60 + (endTime.getMinutes() - startTime.getMinutes());
    const totalMinutes = todayMinutes + shiftMinutes;
    
    if (totalMinutes > Number(employee.maxDailyHours) * 60) {
      violations.push({ 
        type: 'max_daily_hours', 
        message: `Maximale Arbeitszeit überschritten (${employee.maxDailyHours}h/Tag)` 
      });
    }

    // Prüfe explizite Restriktionen
    for (const r of restrictions) {
      switch (r.type) {
        case 'no_night_shift':
          if (startHour >= 20 || endHour <= 6) {
            violations.push({ type: r.type, message: r.description || 'Keine Nachtschicht erlaubt' });
          }
          break;
        case 'no_sunday':
          if (dayOfWeek === 0) {
            violations.push({ type: r.type, message: r.description || 'Keine Sonntagsarbeit erlaubt' });
          }
          break;
        case 'no_holiday':
          // TODO: Feiertagsprüfung
          break;
        case 'excluded_object':
          if (objectId && r.objectId === objectId) {
            violations.push({ type: r.type, message: r.description || 'Objekt ist ausgeschlossen' });
          }
          break;
        case 'allowed_object':
          if (objectId && r.objectId && r.objectId !== objectId) {
            violations.push({ type: r.type, message: 'Nur bestimmte Objekte erlaubt' });
          }
          break;
        case 'allowed_region':
          // TODO: Regionenprüfung
          break;
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
    };
  }

  /**
   * Hole alle Restriktionen für die Auto-Planung
   */
  async getAllForPlanning(tenantId: string, employeeIds: string[]) {
    // Employee-Felder
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, tenantId },
      select: {
        id: true,
        noNightShift: true,
        noSundayShift: true,
        noHolidayShift: true,
        maxDailyHours: true,
        maxWeeklyHours: true,
        minRestHours: true,
        maxConsecutiveDays: true,
        allowedRegions: true,
        allowedObjectIds: true,
        excludedObjectIds: true,
      },
    });

    // Explizite Restriktionen
    const restrictions = await prisma.employeeRestriction.findMany({
      where: {
        employeeId: { in: employeeIds },
        tenantId,
        isActive: true,
      },
    });

    return { employees, restrictions };
  }
}

export const employeeRestrictionService = new EmployeeRestrictionService();
