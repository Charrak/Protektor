import { prisma } from '../config/database';
import { autoPlannerService, Candidate } from './autoPlanner.service';
import { logger } from '../config/logger';

export interface ReplacementCandidate extends Candidate {
  originalEmployeeName: string;
  suitabilityScore: number;
}

export interface ReplacementRequest {
  deploymentId: string;
  tenantId: string;
  reason: string;
}

export interface ReplacementResult {
  success: boolean;
  originalDeployment: any;
  originalEmployee: any;
  candidates: ReplacementCandidate[];
  recommendedCandidate?: ReplacementCandidate;
  error?: string;
}

export class ReplacementService {
  /**
   * Findet Ersatz für einen ausgefallenen Mitarbeiter
   * Berücksichtigt: Qualifikationen, Verfügbarkeit, keine Zeitkonflikte, ähnliche Skills
   */
  async findReplacement(request: ReplacementRequest): Promise<ReplacementResult> {
    try {
      // 1. Original-Einsatz laden
      const originalDeployment = await prisma.deployment.findUnique({
        where: { id: request.deploymentId },
        include: {
          employee: { include: { qualifications: true } },
          object: {
            include: {
              requirements: {
                include: { qualification: true }
              }
            }
          }
        }
      });

      if (!originalDeployment) {
        return {
          success: false,
          originalDeployment: null,
          originalEmployee: null,
          candidates: [],
          error: 'Einsatz nicht gefunden'
        };
      }

      // 2. Alle Kandidaten für diesen Einsatz finden
      const candidates = await autoPlannerService.findCandidates({
        tenantId: request.tenantId,
        objectId: originalDeployment.objectId,
        date: originalDeployment.date,
        startTime: originalDeployment.startTime.toISOString().substr(11, 5),
        endTime: originalDeployment.endTime.toISOString().substr(11, 5),
        requiredCount: 1,
        requiredQualificationIds: originalDeployment.object.requirements
          .filter(r => r.isMandatory)
          .map(r => r.qualificationId)
      });

      // 3. Originalen Mitarbeiter ausschließen
      const eligibleCandidates = candidates.filter(
        c => c.employeeId !== originalDeployment.employeeId && !c.disqualified
      );

      // 4. Eignungswertung berechnen
      const replacementCandidates: ReplacementCandidate[] = eligibleCandidates.map(candidate => {
        let suitabilityScore = candidate.score;

        // Bonus für ähnliche Qualifikationen
        const originalQuals = originalDeployment.employee.qualifications?.map(q => q.qualificationId) || [];
        const candidateQuals = candidate.qualifications?.map(q => q.qualificationId) || [];
        const matchingQuals = originalQuals.filter(q => candidateQuals.includes(q)).length;
        suitabilityScore += matchingQuals * 5;

        // Bonus für Erfahrung am gleichen Objekt
        if (candidate.reasons.some(r => r.includes('Erfahrung am Objekt'))) {
          suitabilityScore += 10;
        }

        // Bonus für gleiche Schichtpräferenz
        if (candidate.reasons.some(r => r.includes('bevorzugt Schicht'))) {
          suitabilityScore += 5;
        }

        return {
          ...candidate,
          originalEmployeeName: `${originalDeployment.employee.firstName} ${originalDeployment.employee.lastName}`,
          suitabilityScore
        };
      });

      // 5. Nach Eignung sortieren
      replacementCandidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

      // 6. Besten Kandidaten empfehlen
      const recommendedCandidate = replacementCandidates[0];

      logger.info(`Ersatzsuche für Einsatz ${request.deploymentId}: ${replacementCandidates.length} Kandidaten gefunden`);

      return {
        success: true,
        originalDeployment,
        originalEmployee: originalDeployment.employee,
        candidates: replacementCandidates,
        recommendedCandidate
      };

    } catch (error) {
      logger.error('Fehler bei Ersatzsuche:', error);
      return {
        success: false,
        originalDeployment: null,
        originalEmployee: null,
        candidates: [],
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  /**
   * Führt den Ersatz durch: Storniert alten Einsatz, erstellt neuen mit Ersatzkraft
   */
  async executeReplacement(
    deploymentId: string,
    replacementEmployeeId: string,
    reason: string,
    userId: string
  ): Promise<{ success: boolean; newDeploymentId?: string; error?: string }> {
    try {
      // 1. Original-Einsatz laden
      const originalDeployment = await prisma.deployment.findUnique({
        where: { id: deploymentId },
        include: {
          employee: { include: { qualifications: true } },
        }
      });

      if (!originalDeployment) {
        return { success: false, error: 'Einsatz nicht gefunden' };
      }

      // 2. Neuen Einsatz mit Ersatzkraft erstellen
      const newDeployment = await prisma.deployment.create({
        data: {
          tenantId: originalDeployment.tenantId,
          objectId: originalDeployment.objectId,
          employeeId: replacementEmployeeId,
          date: originalDeployment.date,
          startTime: originalDeployment.startTime,
          endTime: originalDeployment.endTime,
          breakMinutes: originalDeployment.breakMinutes,
          isNightShift: originalDeployment.isNightShift,
          isSunday: originalDeployment.isSunday,
          isHoliday: originalDeployment.isHoliday,
          status: 'confirmed',
          notes: `Ersatz für ${originalDeployment.employee.firstName} ${originalDeployment.employee.lastName}. Grund: ${reason}`,
          plannedById: userId,
          confirmedById: userId,
          confirmedAt: new Date()
        }
      });

      // 3. Originalen Einsatz stornieren
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'cancelled',
          cancelledById: userId,
          cancelledAt: new Date(),
          cancellationReason: `Ausfall - Ersatz durch Mitarbeiter ${replacementEmployeeId}. Grund: ${reason}`
        }
      });

      logger.info(`Ersatz durchgeführt: Einsatz ${deploymentId} ersetzt durch ${newDeployment.id}`);

      return {
        success: true,
        newDeploymentId: newDeployment.id
      };

    } catch (error) {
      logger.error('Fehler bei Ersatzdurchführung:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }
}

export const replacementService = new ReplacementService();
