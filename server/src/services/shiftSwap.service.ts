import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError, NotFoundError, ForbiddenError, BadRequestError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';

export type ShiftSwapStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

export class ShiftSwapService {
  /**
   * Erstellt eine neue Schichtwechsel-Anfrage
   */
  async createShiftSwap(params: {
    deploymentId: string;
    requesterId: string;
    reason: string;
    notes?: string;
  }) {
    try {
      // Hole den Einsatz
      const deployment = await prisma.deployment.findUnique({
        where: { id: params.deploymentId },
        include: {
          employee: true,
          object: true,
        },
      });

      if (!deployment) {
        throw new NotFoundError('Einsatz nicht gefunden');
      }

      // Prüfe ob der requester der zugewiesene Mitarbeiter ist
      if (deployment.employeeId !== params.requesterId) {
        throw new ForbiddenError('Sie können nur für Ihre eigenen Einsätze einen Schichtwechsel beantragen');
      }

      // Prüfe ob der Einsatz in der Zukunft liegt
      if (new Date(deployment.date) < new Date()) {
        throw new BadRequestError('Schichtwechsel kann nur für zukünftige Einsätze beantragt werden');
      }

      // Erstelle die ShiftSwap-Anfrage
      const shiftSwap = await prisma.replacementRequest.create({
        data: {
          deploymentId: params.deploymentId,
          originalEmployeeId: params.requesterId,
          requestedById: params.requesterId,
          reason: params.reason,
          notes: params.notes,
          status: 'pending',
        },
        include: {
          deployment: {
            include: {
              object: true,
              employee: true,
            },
          },
          originalEmployee: true,
        },
      });

      // Benachrichtige den Disponenten/Teamleiter
      const dispatchers = await prisma.user.findMany({
        where: {
          tenantId: deployment.tenantId,
          role: {
            slug: { in: ['dispatcher', 'teamleader'] },
          },
        },
      });

      for (const dispatcher of dispatchers) {
        await notificationService.notifyShiftSwapRequest(dispatcher.id, shiftSwap.id, {
          requesterName: `${deployment.employee.firstName} ${deployment.employee.lastName}`,
          date: deployment.date,
          objectName: deployment.object.name,
        });
      }

      logger.info(`Schichtwechsel-Anfrage erstellt: ${shiftSwap.id}`);
      return shiftSwap;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Fehler beim Erstellen der Schichtwechsel-Anfrage:', error);
      throw error;
    }
  }

  /**
   * Holt alle Schichtwechsel-Anfragen
   */
  async getShiftSwaps(params: {
    tenantId: string;
    status?: ShiftSwapStatus;
    employeeId?: string;
    limit?: number;
  }) {
    try {
      const where: any = {
        deployment: {
          tenantId: params.tenantId,
        },
      };

      if (params.status) {
        where.status = params.status;
      }

      if (params.employeeId) {
        where.OR = [
          { originalEmployeeId: params.employeeId },
          { replacementEmployeeId: params.employeeId },
        ];
      }

      const shiftSwaps = await prisma.replacementRequest.findMany({
        where,
        include: {
          deployment: {
            include: {
              object: true,
              employee: true,
            },
          },
          originalEmployee: true,
          replacementEmployee: true,
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
      });

      return shiftSwaps;
    } catch (error) {
      logger.error('Fehler beim Laden der Schichtwechsel-Anfragen:', error);
      throw error;
    }
  }

  /**
   * Holt eine einzelne Schichtwechsel-Anfrage
   */
  async getShiftSwapById(shiftSwapId: string) {
    try {
      const shiftSwap = await prisma.replacementRequest.findUnique({
        where: { id: shiftSwapId },
        include: {
          deployment: {
            include: {
              object: true,
              employee: true,
            },
          },
          originalEmployee: true,
          replacementEmployee: true,
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!shiftSwap) {
        throw new NotFoundError('Schichtwechsel-Anfrage nicht gefunden');
      }

      return shiftSwap;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Fehler beim Laden der Schichtwechsel-Anfrage:', error);
      throw error;
    }
  }

  /**
   * Genehmigt eine Schichtwechsel-Anfrage und weist einen Ersatz-Mitarbeiter zu
   */
  async approveShiftSwap(params: {
    shiftSwapId: string;
    approverId: string;
    replacementEmployeeId: string;
  }) {
    try {
      const shiftSwap = await this.getShiftSwapById(params.shiftSwapId);

      // Prüfe ob die Anfrage noch pending ist
      if (shiftSwap.status !== 'pending') {
        throw new BadRequestError('Diese Anfrage wurde bereits bearbeitet');
      }

      // Hole den Ersatz-Mitarbeiter
      const replacementEmployee = await prisma.employee.findUnique({
        where: { id: params.replacementEmployeeId },
      });

      if (!replacementEmployee) {
        throw new NotFoundError('Ersatz-Mitarbeiter nicht gefunden');
      }

      // Erstelle einen neuen Einsatz für den Ersatz-Mitarbeiter
      const replacementDeployment = await prisma.deployment.create({
        data: {
          tenantId: shiftSwap.deployment.tenantId,
          objectId: shiftSwap.deployment.objectId,
          employeeId: params.replacementEmployeeId,
          date: shiftSwap.deployment.date,
          startTime: shiftSwap.deployment.startTime,
          endTime: shiftSwap.deployment.endTime,
          breakMinutes: shiftSwap.deployment.breakMinutes,
          status: 'released',
          plannedById: params.approverId,
          isNightShift: shiftSwap.deployment.isNightShift,
          isSunday: shiftSwap.deployment.isSunday,
          isHoliday: shiftSwap.deployment.isHoliday,
          version: 1,
        },
      });

      // Storniere den ursprünglichen Einsatz
      await prisma.deployment.update({
        where: { id: shiftSwap.deploymentId },
        data: {
          status: 'cancelled',
          cancelledById: params.approverId,
          cancelledAt: new Date(),
          cancellationReason: `Schichtwechsel genehmigt - Ersatz: ${replacementEmployee.firstName} ${replacementEmployee.lastName}`,
        },
      });

      // Aktualisiere die ShiftSwap-Anfrage
      const updatedShiftSwap = await prisma.replacementRequest.update({
        where: { id: params.shiftSwapId },
        data: {
          status: 'approved',
          resolvedById: params.approverId,
          replacementEmployeeId: params.replacementEmployeeId,
          replacementDeploymentId: replacementDeployment.id,
        },
      });

      // Benachrichtige den ursprünglichen Mitarbeiter
      await notificationService.createNotification({
        userId: shiftSwap.originalEmployeeId,
        type: 'shift_swap_approved',
        title: 'Schichtwechsel genehmigt',
        message: `Ihr Schichtwechsel für den ${shiftSwap.deployment.date.toLocaleDateString('de-DE')} wurde genehmigt. ${replacementEmployee.firstName} ${replacementEmployee.lastName} übernimmt die Schicht.`,
        resourceType: 'deployment',
        resourceId: replacementDeployment.id,
      });

      // Benachrichtige den Ersatz-Mitarbeiter
      await notificationService.createNotification({
        userId: params.replacementEmployeeId,
        type: 'deployment_assigned',
        title: 'Neuer Einsatz zugewiesen (Schichtwechsel)',
        message: `Sie wurden als Ersatz für den ${shiftSwap.deployment.date.toLocaleDateString('de-DE')} bei ${shiftSwap.deployment.object.name} eingeplant.`,
        resourceType: 'deployment',
        resourceId: replacementDeployment.id,
      });

      logger.info(`Schichtwechsel genehmigt: ${shiftSwap.id}`);
      return updatedShiftSwap;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Fehler beim Genehmigen der Schichtwechsel-Anfrage:', error);
      throw error;
    }
  }

  /**
   * Lehnt eine Schichtwechsel-Anfrage ab
   */
  async declineShiftSwap(params: {
    shiftSwapId: string;
    approverId: string;
    reason?: string;
  }) {
    try {
      const shiftSwap = await this.getShiftSwapById(params.shiftSwapId);

      if (shiftSwap.status !== 'pending') {
        throw new BadRequestError('Diese Anfrage wurde bereits bearbeitet');
      }

      const updatedShiftSwap = await prisma.replacementRequest.update({
        where: { id: params.shiftSwapId },
        data: {
          status: 'declined',
          resolvedById: params.approverId,
          notes: params.reason || shiftSwap.notes,
        },
      });

      // Benachrichtige den ursprünglichen Mitarbeiter
      await notificationService.createNotification({
        userId: shiftSwap.originalEmployeeId,
        type: 'shift_swap_declined',
        title: 'Schichtwechsel abgelehnt',
        message: `Ihr Schichtwechsel für den ${shiftSwap.deployment.date.toLocaleDateString('de-DE')} wurde abgelehnt.${params.reason ? ` Grund: ${params.reason}` : ''}`,
        resourceType: 'deployment',
        resourceId: shiftSwap.deploymentId,
      });

      logger.info(`Schichtwechsel abgelehnt: ${shiftSwap.id}`);
      return updatedShiftSwap;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Fehler beim Ablehnen der Schichtwechsel-Anfrage:', error);
      throw error;
    }
  }

  /**
   * Storniert eine Schichtwechsel-Anfrage (durch den requester)
   */
  async cancelShiftSwap(params: {
    shiftSwapId: string;
    requesterId: string;
  }) {
    try {
      const shiftSwap = await this.getShiftSwapById(params.shiftSwapId);

      // Prüfe ob der requester der Ersteller ist
      if (shiftSwap.originalEmployeeId !== params.requesterId) {
        throw new ForbiddenError('Sie können nur Ihre eigenen Anfragen stornieren');
      }

      if (shiftSwap.status !== 'pending') {
        throw new BadRequestError('Diese Anfrage wurde bereits bearbeitet und kann nicht mehr storniert werden');
      }

      const updatedShiftSwap = await prisma.replacementRequest.update({
        where: { id: params.shiftSwapId },
        data: {
          status: 'cancelled',
        },
      });

      logger.info(`Schichtwechsel storniert: ${shiftSwap.id}`);
      return updatedShiftSwap;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Fehler beim Stornieren der Schichtwechsel-Anfrage:', error);
      throw error;
    }
  }

  /**
   * Findet potenzielle Ersatz-Mitarbeiter für einen Einsatz
   */
  async findReplacementCandidates(params: {
    deploymentId: string;
    tenantId: string;
  }) {
    try {
      const deployment = await prisma.deployment.findUnique({
        where: { id: params.deploymentId },
        include: {
          object: {
            include: {
              requirements: true,
            },
          },
        },
      });

      if (!deployment) {
        throw new NotFoundError('Einsatz nicht gefunden');
      }

      // Hole alle aktiven Mitarbeiter
      const allEmployees = await prisma.employee.findMany({
        where: {
          tenantId: params.tenantId,
          status: 'active',
          deletedAt: null,
        },
        include: {
          qualifications: true,
        },
      });

      // Filtere Mitarbeiter, die am Datum bereits einen Einsatz haben
      const existingDeployments = await prisma.deployment.findMany({
        where: {
          tenantId: params.tenantId,
          date: deployment.date,
          status: { not: 'cancelled' },
          employeeId: { not: deployment.employeeId },
        },
      });

      const busyEmployeeIds = new Set(existingDeployments.map(d => d.employeeId));

      // Filtere verfügbare Mitarbeiter
      const candidates = allEmployees
        .filter(emp => !busyEmployeeIds.has(emp.id))
        .map(emp => ({
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          personnelNumber: emp.personnelNumber,
          qualifications: emp.qualifications.length,
        }));

      return candidates;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Fehler beim Finden von Ersatz-Mitarbeitern:', error);
      throw error;
    }
  }
}

export const shiftSwapService = new ShiftSwapService();
