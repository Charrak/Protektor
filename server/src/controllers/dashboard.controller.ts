import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

function formatDbTime(value: Date): string {
  return value.toISOString().slice(11, 16);
}

function getUtcDayBounds(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function getUtcMonthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

function getRecordedHours(record: {
  totalHours: unknown;
  clockIn: Date;
  clockOut: Date | null;
  breakDuration: number;
  status: string;
}, now: Date): number {
  if (record.totalHours !== null && record.totalHours !== undefined) return Number(record.totalHours);
  const finish = record.clockOut ?? (record.status === 'open' ? now : null);
  if (!finish) return 0;
  return Math.max(0, (finish.getTime() - record.clockIn.getTime()) / 3_600_000 - record.breakDuration / 60);
}

function getPlannedHours(deployment: { startTime: Date; endTime: Date; breakMinutes: number }): number {
  const startMinutes = deployment.startTime.getUTCHours() * 60 + deployment.startTime.getUTCMinutes();
  let endMinutes = deployment.endTime.getUTCHours() * 60 + deployment.endTime.getUTCMinutes();
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return Math.max(0, (endMinutes - startMinutes - deployment.breakMinutes) / 60);
}

export class DashboardController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Nicht angemeldet' });
        return;
      }

      const now = new Date();
      const { start, end } = getUtcDayBounds(now);
      const { start: monthStart, end: monthEnd } = getUtcMonthBounds(now);
      const isEmployee = req.user.roleSlug === 'employee';

      if (isEmployee) {
        // Employee-Accounts sind im Datenmodell über die E-Mail mit dem Mitarbeiterprofil verknüpft.
        // Bei keinem oder mehreren Treffern liefern wir absichtlich keine Mitarbeiterdaten aus.
        const matches = await prisma.employee.findMany({
          where: {
            tenantId: req.user.tenantId,
            email: req.user.email,
            status: 'active',
            deletedAt: null,
          },
          select: { id: true },
          take: 2,
        });
        const employee = matches.length === 1 ? matches[0] : null;

        if (!employee) {
          res.json({
            isEmployee: true,
            employeeRecordLinked: false,
            stats: { activeEmployees: 0, todayDeployments: 0, sickToday: 0, openDeployments: 0, ownTimeRecordsToday: 0, monthHoursToDate: 0, projectedMonthHours: 0 },
            todayDeployments: [],
          });
          return;
        }

        const [deployments, monthRecords, futureDeployments] = await Promise.all([
          prisma.deployment.findMany({
            where: {
              tenantId: req.user.tenantId,
              employeeId: employee.id,
              date: { gte: start, lt: end },
              status: { in: ['released', 'confirmed', 'completed'] },
            },
            include: {
              object: { include: { customer: { select: { companyName: true } } } },
              employee: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: [{ startTime: 'asc' }],
          }),
          prisma.timeRecord.findMany({
            where: {
              tenantId: req.user.tenantId,
              employeeId: employee.id,
              date: { gte: monthStart, lt: end },
              voidedAt: null,
            },
            select: { date: true, totalHours: true, clockIn: true, clockOut: true, breakDuration: true, status: true },
          }),
          prisma.deployment.findMany({
            where: {
              tenantId: req.user.tenantId,
              employeeId: employee.id,
              date: { gte: end, lt: monthEnd },
              status: { in: ['released', 'confirmed'] },
            },
            select: { startTime: true, endTime: true, breakMinutes: true },
          }),
        ]);

        const monthHoursToDate = monthRecords.reduce((sum, record) => sum + getRecordedHours(record, now), 0);
        const plannedHoursRemainder = futureDeployments.reduce((sum, deployment) => sum + getPlannedHours(deployment), 0);
        const ownTimeRecordsToday = monthRecords.filter((record) => record.date >= start && record.date < end).length;

        res.json({
          isEmployee: true,
          employeeRecordLinked: true,
          stats: {
            activeEmployees: 0,
            todayDeployments: deployments.length,
            sickToday: 0,
            openDeployments: 0,
            ownTimeRecordsToday,
            monthHoursToDate: Math.round(monthHoursToDate * 10) / 10,
            projectedMonthHours: Math.round((monthHoursToDate + plannedHoursRemainder) * 10) / 10,
          },
          todayDeployments: deployments.map((deployment) => ({
            id: deployment.id,
            date: deployment.date.toISOString(),
            startTime: formatDbTime(deployment.startTime),
            endTime: formatDbTime(deployment.endTime),
            object: { id: deployment.object.id, name: deployment.object.name },
            employee: deployment.employee,
            customer: { name: deployment.object.customer.companyName },
          })),
        });
        return;
      }

      const [activeEmployees, todayDeployments, sickToday, openDeployments, deployments] = await Promise.all([
        prisma.employee.count({ where: { tenantId: req.user.tenantId, status: 'active', deletedAt: null } }),
        prisma.deployment.count({ where: { tenantId: req.user.tenantId, date: { gte: start, lt: end } } }),
        prisma.availability.count({
          where: {
            tenantId: req.user.tenantId,
            type: 'sick',
            status: 'approved',
            startDate: { lt: end },
            endDate: { gte: start },
          },
        }),
        prisma.deployment.count({
          where: { tenantId: req.user.tenantId, date: { gte: start, lt: end }, status: { in: ['planned', 'released'] } },
        }),
        prisma.deployment.findMany({
          where: { tenantId: req.user.tenantId, date: { gte: start, lt: end } },
          include: {
            object: { include: { customer: { select: { companyName: true } } } },
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ startTime: 'asc' }],
        }),
      ]);

      res.json({
        isEmployee: false,
        employeeRecordLinked: true,
        stats: { activeEmployees, todayDeployments, sickToday, openDeployments, ownTimeRecordsToday: 0, monthHoursToDate: 0, projectedMonthHours: 0 },
        todayDeployments: deployments.map((deployment) => ({
          id: deployment.id,
          date: deployment.date.toISOString(),
          startTime: formatDbTime(deployment.startTime),
          endTime: formatDbTime(deployment.endTime),
          object: { id: deployment.object.id, name: deployment.object.name },
          employee: deployment.employee,
          customer: { name: deployment.object.customer.companyName },
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
