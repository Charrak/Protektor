import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface Candidate {
  employeeId: string;
  employeeName: string;
  score: number;
  reasons: string[];
  conflicts: string[];
}

export class AutoPlannerService {
  /**
   * Findet geeignete Kandidaten für einen Einsatz
   */
  async findCandidates(params: {
    objectId: string;
    date: string;
    startTime: string;
    endTime: string;
    requiredCount: number;
  }): Promise<Candidate[]> {
    const { objectId, date, startTime, endTime, requiredCount } = params;

    // Objekt-Anforderungen laden
    const object = await prisma.sMSObject.findUnique({
      where: { id: objectId },
      include: { requirements: { include: { qualification: true } } },
    });

    if (!object) return [];

    const requiredQualIds = object.requirements
      .filter((r: any) => r.isMandatory)
      .map((r: any) => r.qualificationId);

    // Alle aktiven Mitarbeiter laden
    const employees = await prisma.employee.findMany({
      where: { status: 'active', deletedAt: null },
      include: {
        qualifications: {
          where: {
            OR: [
              { expiryDate: null },
              { expiryDate: { gte: new Date() } },
            ],
          },
        },
        availabilities: {
          where: {
            startDate: { lte: new Date(date) },
            endDate: { gte: new Date(date) },
            status: 'approved',
          },
        },
      },
    });

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    // Bestehende Einsätze am selben Tag laden
    const existingDeployments = await prisma.deployment.findMany({
      where: {
        date: new Date(date),
        status: { not: 'cancelled' },
      },
    });

    const candidates: Candidate[] = [];

    for (const employee of employees) {
      const reasons: string[] = [];
      const conflicts: string[] = [];
      let score = 0;

      // 1. Qualifikationsprüfung
      const employeeQualIds = employee.qualifications.map((q: any) => q.qualificationId);
      const missingQuals = requiredQualIds.filter((q: string) => !employeeQualIds.includes(q));

      if (missingQuals.length > 0) {
        conflicts.push(`Fehlende Qualifikationen: ${missingQuals.length}`);
        continue; // Disqualifiziert
      }

      score += 40; // Qualifikationen erfüllt
      reasons.push('Alle erforderlichen Qualifikationen vorhanden');

      // 2. Verfügbarkeitsprüfung
      if (employee.availabilities.length > 0) {
        conflicts.push('Mitarbeiter ist abwesend');
        continue;
      }

      score += 20;
      reasons.push('Verfügbar am gewählten Tag');

      // 3. Konfliktprüfung (bereits geplante Einsätze)
      const employeeDeployments = existingDeployments.filter((d: any) => d.employeeId === employee.id);
      const hasConflict = employeeDeployments.some((d: any) => {
        const dStart = new Date(`1970-01-01T${d.startTime}`);
        const dEnd = new Date(`1970-01-01T${d.endTime}`);
        return (start < dEnd && end > dStart);
      });

      if (hasConflict) {
        conflicts.push('Zeitkonflikt mit bestehendem Einsatz');
        continue;
      }

      score += 20;
      reasons.push('Keine Zeitkonflikte');

      // 4. Arbeitszeitgrenzen prüfen
      const totalHoursToday = employeeDeployments.reduce((sum: number, d: any) => {
        const dStart = new Date(`1970-01-01T${d.startTime}`);
        const dEnd = new Date(`1970-01-01T${d.endTime}`);
        const hours = (dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);

      const newHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (totalHoursToday + newHours > Number(employee.maxHoursPerDay)) {
        conflicts.push(`Maximale Tagesstunden überschritten (${employee.maxHoursPerDay}h)`);
        continue;
      }

      score += 10;
      reasons.push('Arbeitszeitgrenzen eingehalten');

      // 5. Bevorzugte Region (optional)
      if (employee.preferredRegion && object.city) {
        if (employee.preferredRegion.toLowerCase().includes(object.city.toLowerCase())) {
          score += 10;
          reasons.push('In bevorzugter Region');
        }
      }

      candidates.push({
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        score,
        reasons,
        conflicts,
      });
    }

    // Nach Score sortieren
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, requiredCount * 2); // Mehr Kandidaten als benötigt
  }
}

export const autoPlannerService = new AutoPlannerService();
