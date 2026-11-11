import { Request, Response, NextFunction } from 'express';
import { autoPlannerService } from '../services/autoPlanner.service';
import { prisma } from '../config/database';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO } from 'date-fns';

export class AutoPlannerController {
  async findCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectId, date, startTime, endTime, requiredCount } = req.body;

      if (!objectId || !date || !startTime || !endTime || !requiredCount) {
        res.status(400).json({ error: 'Alle Felder erforderlich: objectId, date, startTime, endTime, requiredCount' });
        return;
      }

      const candidates = await autoPlannerService.findCandidates({
        tenantId: req.user!.tenantId || req.user!.id,
        objectId,
        date,
        startTime,
        endTime,
        requiredCount,
      });

      res.json({ candidates });
    } catch (error) {
      next(error);
    }
  }

  async generateWeekPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, objectId, startTime, endTime, employeesPerDay } = req.body;

      if (!startDate || !endDate || !objectId || !startTime || !endTime || !employeesPerDay) {
        res.status(400).json({ error: 'Alle Felder erforderlich: startDate, endDate, objectId, startTime, endTime, employeesPerDay' });
        return;
      }

      const tenantId = req.user!.tenantId || req.user!.id;
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const days = eachDayOfInterval({ start, end });

      // Hole Benutzer-ID für plannedById
      const userId = req.user!.id;

      // Hole Objekt-Info
      const object = await prisma.sMSObject.findFirst({
        where: { id: objectId, tenantId },
        include: { customer: true }
      });

      if (!object) {
        res.status(404).json({ error: 'Objekt nicht gefunden' });
        return;
      }

      const results = [];

      for (const day of days) {
        const date = format(day, 'yyyy-MM-dd');
        const candidates = await autoPlannerService.findCandidates({
          tenantId,
          objectId,
          date: day,
          startTime,
          endTime,
          requiredCount: employeesPerDay,
        });

        // Filter qualifizierte Kandidaten
        const qualified = candidates.filter(c => !c.disqualified).slice(0, employeesPerDay);

        // Erstelle Einsätze für qualifizierte Kandidaten
        const deployments = [];
        for (const candidate of qualified) {
          try {
            const deployment = await prisma.deployment.create({
              data: {
                tenantId,
                objectId,
                employeeId: candidate.employeeId,
                date: parseISO(date),
                startTime: new Date(`1970-01-01T${startTime}:00Z`),
                endTime: new Date(`1970-01-01T${endTime}:00Z`),
                breakMinutes: 0,
                status: 'planned',
                isNightShift: parseInt(startTime) >= 22 || parseInt(endTime) <= 6,
                isSunday: day.getDay() === 0,
                isHoliday: false,
                plannedById: userId,
                version: 1,
              },
              include: {
                employee: {
                  select: { id: true, firstName: true, lastName: true, personnelNumber: true }
                },
                object: {
                  select: { id: true, name: true, objectNumber: true }
                }
              }
            });
            deployments.push(deployment);
          } catch (error) {
            console.error(`Fehler beim Erstellen des Einsatzes für ${candidate.employeeName}:`, error);
          }
        }

        results.push({
          date,
          dayName: format(day, 'EEEE', { locale: require('date-fns/locale/de') }),
          candidates: qualified.length,
          deployments,
        });
      }

      res.json({ 
        success: true,
        object: { id: object.id, name: object.name, customer: object.customer.companyName },
        period: { startDate, endDate },
        schedule: startTime + ' - ' + endTime,
        days: results
      });
    } catch (error) {
      next(error);
    }
  }
}

export const autoPlannerController = new AutoPlannerController();
