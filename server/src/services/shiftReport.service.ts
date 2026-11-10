import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { z } from 'zod';

// Validierung für Schichtbericht erstellen
const shiftReportCreateSchema = z.object({
  customerId: z.string().uuid(),
  objectId: z.string().uuid(),
  deploymentId: z.string().uuid().optional(),
  
  reportDate: z.string().datetime(),
  shiftStart: z.string().datetime(),
  shiftEnd: z.string().datetime(),
  personnelCount: z.number().int().min(1).default(1),
  
  generalNotes: z.string().optional(),
  
  incidents: z.array(z.object({
    time: z.string(),
    type: z.string(),
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  })).optional(),
  
  specialTasks: z.array(z.object({
    task: z.string(),
    completed: z.boolean(),
    notes: z.string().optional(),
  })).optional(),
  
  handoverNotes: z.string().optional(),
  
  patrolChecks: z.array(z.object({
    location: z.string(),
    time: z.string(),
    status: z.enum(['OK', 'ISSUE', 'ALERT']),
    notes: z.string().optional(),
  })).optional(),
  
  attachmentUrls: z.array(z.string()).optional(),
  
  reportedById: z.string().uuid(),
});

const shiftReportUpdateSchema = shiftReportCreateSchema.partial();

export class ShiftReportService {
  /**
   * Liste aller Schichtberichte für einen Kunden
   */
  async listByCustomer(tenantId: string, customerId: string, filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    status?: string;
    objectId?: string;
  }) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError('Kunde');

    const where: any = { customerId, tenantId };

    if (filters?.dateFrom || filters?.dateTo) {
      where.reportDate = {};
      if (filters.dateFrom) where.reportDate.gte = filters.dateFrom;
      if (filters.dateTo) where.reportDate.lte = filters.dateTo;
    }

    if (filters?.status) where.status = filters.status;
    if (filters?.objectId) where.objectId = filters.objectId;

    const reports = await prisma.shiftReport.findMany({
      where,
      include: {
        customer: { select: { companyName: true, customerNumber: true } },
        object: { select: { name: true, objectNumber: true } },
      },
      orderBy: [{ reportDate: 'desc' }, { shiftStart: 'asc' }],
    });

    return reports;
  }

  /**
   * Liste aller Schichtberichte für ein Objekt
   */
  async listByObject(tenantId: string, objectId: string, limit: number = 50) {
    const reports = await prisma.shiftReport.findMany({
      where: { objectId, tenantId },
      include: {
        customer: { select: { companyName: true, customerNumber: true } },
        object: { select: { name: true, objectNumber: true } },
      },
      orderBy: [{ reportDate: 'desc' }, { shiftStart: 'asc' }],
      take: limit,
    });

    return reports;
  }

  /**
   * Einzelnen Schichtbericht abrufen
   */
  async getById(tenantId: string, reportId: string) {
    const report = await prisma.shiftReport.findFirst({
      where: { id: reportId, tenantId },
      include: {
        customer: { select: { companyName: true, customerNumber: true } },
        object: { select: { name: true, objectNumber: true } },
      },
    });

    if (!report) throw new NotFoundError('Schichtbericht');
    return report;
  }

  /**
   * Schichtbericht erstellen
   */
  async create(tenantId: string, input: any, userId: string) {
    // Validierung
    const validation = shiftReportCreateSchema.safeParse(input);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }

    const data = validation.data;

    // Kunde prüfen
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError('Kunde');

    // Objekt prüfen
    const object = await prisma.sMSObject.findFirst({
      where: { id: data.objectId, tenantId, customerId: data.customerId },
    });
    if (!object) throw new NotFoundError('Objekt');

    const report = await prisma.shiftReport.create({
      data: {
        tenantId,
        customerId: data.customerId,
        objectId: data.objectId,
        deploymentId: data.deploymentId,
        reportDate: new Date(data.reportDate),
        shiftStart: new Date(data.shiftStart),
        shiftEnd: new Date(data.shiftEnd),
        personnelCount: data.personnelCount,
        generalNotes: data.generalNotes,
        incidents: data.incidents || undefined,
        specialTasks: data.specialTasks || undefined,
        handoverNotes: data.handoverNotes,
        patrolChecks: data.patrolChecks || undefined,
        attachmentUrls: data.attachmentUrls || undefined,
        reportedById: data.reportedById,
        status: 'draft',
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'create', 'shiftReport', report.id, null, data);

    logger.info(`Schichtbericht erstellt für Kunde ${customer.companyName}, Objekt ${object.name}`);
    return report;
  }

  /**
   * Schichtbericht aktualisieren
   */
  async update(tenantId: string, reportId: string, input: any, userId: string) {
    const existing = await prisma.shiftReport.findFirst({
      where: { id: reportId, tenantId },
    });

    if (!existing) throw new NotFoundError('Schichtbericht');

    // Validierung
    const validation = shiftReportUpdateSchema.safeParse(input);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    }

    const data = validation.data;
    const oldData = { ...existing };

    const report = await prisma.shiftReport.update({
      where: { id: reportId },
      data: {
        ...(data.customerId !== undefined && { customerId: data.customerId }),
        ...(data.objectId !== undefined && { objectId: data.objectId }),
        ...(data.deploymentId !== undefined && { deploymentId: data.deploymentId }),
        ...(data.reportDate !== undefined && { reportDate: new Date(data.reportDate) }),
        ...(data.shiftStart !== undefined && { shiftStart: new Date(data.shiftStart) }),
        ...(data.shiftEnd !== undefined && { shiftEnd: new Date(data.shiftEnd) }),
        ...(data.personnelCount !== undefined && { personnelCount: data.personnelCount }),
        ...(data.generalNotes !== undefined && { generalNotes: data.generalNotes }),
        ...(data.incidents !== undefined && { incidents: data.incidents }),
        ...(data.specialTasks !== undefined && { specialTasks: data.specialTasks }),
        ...(data.handoverNotes !== undefined && { handoverNotes: data.handoverNotes }),
        ...(data.patrolChecks !== undefined && { patrolChecks: data.patrolChecks }),
        ...(data.attachmentUrls !== undefined && { attachmentUrls: data.attachmentUrls }),
        ...(data.reportedById !== undefined && { reportedById: data.reportedById }),
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'update', 'shiftReport', reportId, oldData, data);

    logger.info(`Schichtbericht aktualisiert: ${reportId}`);
    return report;
  }

  /**
   * Schichtbericht einreichen (draft -> submitted)
   */
  async submit(tenantId: string, reportId: string, userId: string) {
    const report = await prisma.shiftReport.findFirst({
      where: { id: reportId, tenantId, status: 'draft' },
    });

    if (!report) throw new ValidationError('Schichtbericht nicht gefunden oder bereits eingereicht');

    const updated = await prisma.shiftReport.update({
      where: { id: reportId },
      data: {
        status: 'submitted',
        confirmedAt: new Date(),
        confirmedBy: userId,
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'submit', 'shiftReport', reportId, null, null);

    logger.info(`Schichtbericht eingereicht: ${reportId}`);
    return updated;
  }

  /**
   * Schichtbericht genehmigen (submitted -> approved)
   */
  async approve(tenantId: string, reportId: string, userId: string) {
    const report = await prisma.shiftReport.findFirst({
      where: { id: reportId, tenantId, status: 'submitted' },
    });

    if (!report) throw new ValidationError('Schichtbericht nicht gefunden oder nicht eingereicht');

    const updated = await prisma.shiftReport.update({
      where: { id: reportId },
      data: {
        status: 'approved',
        confirmedAt: new Date(),
        confirmedBy: userId,
      },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'approve', 'shiftReport', reportId, null, null);

    logger.info(`Schichtbericht genehmigt: ${reportId}`);
    return updated;
  }

  /**
   * Schichtbericht archivieren (approved -> archived)
   */
  async archive(tenantId: string, reportId: string, userId: string) {
    const report = await prisma.shiftReport.findFirst({
      where: { id: reportId, tenantId, status: 'approved' },
    });

    if (!report) throw new ValidationError('Schichtbericht nicht gefunden oder nicht genehmigt');

    const updated = await prisma.shiftReport.update({
      where: { id: reportId },
      data: { status: 'archived' },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'archive', 'shiftReport', reportId, null, null);

    logger.info(`Schichtbericht archiviert: ${reportId}`);
    return updated;
  }

  /**
   * Schichtbericht löschen
   */
  async delete(tenantId: string, reportId: string, userId: string) {
    const report = await prisma.shiftReport.findFirst({
      where: { id: reportId, tenantId },
    });

    if (!report) throw new NotFoundError('Schichtbericht');

    await prisma.shiftReport.delete({
      where: { id: reportId },
    });

    // Audit-Log
    await this.logAudit(tenantId, userId, 'delete', 'shiftReport', reportId, report, null);

    logger.info(`Schichtbericht gelöscht: ${reportId}`);
  }

  /**
   * Statistiken für Schichtberichte
   */
  async getStatistics(tenantId: string, customerId?: string, dateFrom?: Date, dateTo?: Date) {
    const where: any = { tenantId };

    if (customerId) where.customerId = customerId;
    if (dateFrom || dateTo) {
      where.reportDate = {};
      if (dateFrom) where.reportDate.gte = dateFrom;
      if (dateTo) where.reportDate.lte = dateTo;
    }

    const [total, byStatus, incidents] = await Promise.all([
      prisma.shiftReport.count({ where }),
      prisma.shiftReport.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.shiftReport.findMany({
        where,
        select: { incidents: true },
      }),
    ]);

    // Zähle Vorkommnisse nach Schweregrad
    const incidentCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const report of incidents) {
      if (report.incidents) {
        for (const incident of report.incidents as any[]) {
          if (incident.severity) {
            incidentCounts[incident.severity as keyof typeof incidentCounts]++;
          }
        }
      }
    }

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      incidents: incidentCounts,
    };
  }

  /**
   * Audit-Log erstellen
   */
  private async logAudit(
    tenantId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValue: any,
    newValue: any
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          oldValue: oldValue || undefined,
          newValue: newValue || undefined,
        },
      });
    } catch (error) {
      logger.error('Fehler beim Erstellen des Audit-Logs:', error);
    }
  }
}

export const shiftReportService = new ShiftReportService();
