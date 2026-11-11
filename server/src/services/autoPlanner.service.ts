import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { recurringAvailabilityService } from './recurringAvailability.service';
import { employeeRestrictionService } from './employeeRestriction.service';

export interface Candidate {
  employeeId: string;
  employeeName: string;
  personnelNumber: string;
  score: number;
  reasons: string[];        // Warum dieser MA geeignet ist
  conflicts: string[];      // Harte Konflikte (disqualifizierend)
  warnings: string[];       // Weiche Warnungen (nicht disqualifizierend)
  disqualified: boolean;
  disqualificationReason?: string;
}

export interface PlanningRequest {
  tenantId: string;
  objectId: string;
  date: Date;
  startTime: string;
  endTime: string;
  requiredCount: number;
  requiredQualificationIds?: string[];
  notes?: string;
  planningGroupId?: string; // Optional: Beschränke auf Mitarbeiter aus dieser Gruppe
}

export interface PlanningResult {
  request: PlanningRequest;
  candidates: Candidate[];
  selectedCount: number;
  unselectedReasons: { employeeId: string; name: string; reason: string }[];
}

export class AutoPlannerService {
  /**
   * Hauptmethode: Findet geeignete Kandidaten für einen Einsatz
   * mit vollständiger Constraint-Prüfung
   */
  async findCandidates(request: PlanningRequest): Promise<Candidate[]> {
    const { tenantId, objectId, date, startTime, endTime } = request;
    const start = new Date(`${date.toISOString().split('T')[0]}T${startTime}`);
    const end = new Date(`${date.toISOString().split('T')[0]}T${endTime}`);
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // 1=Mo, 7=So
    const startHour = start.getHours();
    const endHour = end.getHours();
    const shiftMinutes = (end.getTime() - start.getTime()) / 1000 / 60;

    // ═══════════════════════════════════════════════════
    // 1. LADE ALLE DATEN
    // ═══════════════════════════════════════════════════

    // Objekt-Anforderungen
    const object = await prisma.sMSObject.findFirst({
      where: { id: objectId, tenantId },
      include: { requirements: { include: { qualification: true } } },
    });
    if (!object) return [];

    const requiredQualIds = request.requiredQualificationIds ||
      object.requirements.filter((r: any) => r.isMandatory).map((r: any) => r.qualificationId);

    // Alle aktiven Mitarbeiter ODER nur Mitarbeiter aus Planungsgruppe
    let employees;
    if (request.planningGroupId) {
      const planningGroup = await prisma.planningGroup.findFirst({
        where: { id: request.planningGroupId, tenantId },
        include: {
          employees: {
            include: {
              employee: {
                include: {
                  qualifications: {
                    include: { qualification: true },
                    where: { OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] },
                  },
                },
              },
            },
          },
        },
      });
      
      if (!planningGroup) return [];
      employees = planningGroup.employees.map(pgEmp => pgEmp.employee);
    } else {
      employees = await prisma.employee.findMany({
        where: { tenantId, status: 'active', deletedAt: null },
        include: {
          qualifications: {
            include: { qualification: true },
            where: { OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] },
          },
        },
      });
    }

    // Bestehende Einsätze am selben Tag
    const existingDeployments = await prisma.deployment.findMany({
      where: { tenantId, date, status: { not: 'cancelled' } },
    });

    // Bestehende Zeitnachweise am selben Tag (für Arbeitszeit-Check)
    const existingTimeRecords = await prisma.timeRecord.findMany({
      where: { tenantId, date, status: { in: ['approved', 'locked'] } },
    });

    // ═══════════════════════════════════════════════════
    // 2. PRÜFE JEDEN MITARBEITER
    // ═══════════════════════════════════════════════════

    const candidates: Candidate[] = [];

    for (const emp of employees) {
      const reasons: string[] = [];
      const conflicts: string[] = [];
      const warnings: string[] = [];
      let score = 0;
      let disqualified = false;
      let disqualificationReason = '';

      // ─── HARD CONSTRAINTS ───

      // HC1: Qualifikationsprüfung
      const empQualIds = emp.qualifications.map((q: any) => q.qualificationId);
      const missingQuals = requiredQualIds.filter((q: string) => !empQualIds.includes(q));
      if (missingQuals.length > 0) {
        disqualified = true;
        disqualificationReason = 'Fehlende Qualifikationen';
        candidates.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          personnelNumber: emp.personnelNumber,
          score: 0,
          reasons: [],
          conflicts: [`Qualifikation fehlt: ${missingQuals.length} benötigt`],
          warnings: [],
          disqualified: true,
          disqualificationReason,
        });
        continue;
      }
      score += 40;
      reasons.push('✓ Alle Qualifikationen vorhanden');

      // HC2: Einsatzrestriktionen prüfen
      const restrictionCheck = await employeeRestrictionService.checkRestrictions(
        tenantId, emp.id, date, start, end, objectId
      );
      if (!restrictionCheck.allowed) {
        disqualified = true;
        candidates.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          personnelNumber: emp.personnelNumber,
          score: 0,
          reasons: [],
          conflicts: restrictionCheck.violations.map(v => v.message),
          warnings: [],
          disqualified: true,
          disqualificationReason: restrictionCheck.violations[0]?.message || 'Restriktion',
        });
        continue;
      }
      score += 15;
      reasons.push('✓ Keine Restriktionsverstöße');

      // HC3: Wiederkehrende Verfügbarkeit prüfen
      const availabilityCheck = await recurringAvailabilityService.isAvailable(
        tenantId, emp.id, date, start, end
      );
      if (!availabilityCheck.available) {
        disqualified = true;
        candidates.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          personnelNumber: emp.personnelNumber,
          score: 0,
          reasons: [],
          conflicts: [availabilityCheck.reason],
          warnings: [],
          disqualified: true,
          disqualificationReason: availabilityCheck.reason,
        });
        continue;
      }
      score += 20;
      reasons.push('✓ Verfügbar am gewünschten Tag');

      // HC4: Keine Zeitüberschneidungen
      const empDeployments = existingDeployments.filter((d: any) => d.employeeId === emp.id);
      const hasOverlap = empDeployments.some((d: any) => {
        const dStart = new Date(`${date.toISOString().split('T')[0]}T${d.startTime.toISOString().split('T')[1]}`);
        const dEnd = new Date(`${date.toISOString().split('T')[0]}T${d.endTime.toISOString().split('T')[1]}`);
        return start < dEnd && end > dStart;
      });
      if (hasOverlap) {
        disqualified = true;
        candidates.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          personnelNumber: emp.personnelNumber,
          score: 0,
          reasons: [],
          conflicts: ['Zeitüberschneidung mit bestehendem Einsatz'],
          warnings: [],
          disqualified: true,
          disqualificationReason: 'Bereits zur gleichen Zeit eingeplant',
        });
        continue;
      }
      score += 15;
      reasons.push('✓ Keine Zeitüberschneidungen');

      // HC5: Max Tagesstunden (ArbZG §3)
      const existingHours = empDeployments.reduce((sum: number, d: any) => {
        const dStart = new Date(`${date.toISOString().split('T')[0]}T${d.startTime.toISOString().split('T')[1]}`);
        const dEnd = new Date(`${date.toISOString().split('T')[0]}T${d.endTime.toISOString().split('T')[1]}`);
        return sum + (dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60);
      }, 0);
      const newShiftHours = shiftMinutes / 60;
      const totalHoursToday = existingHours + newShiftHours;
      if (totalHoursToday > Number(emp.maxDailyHours)) {
        disqualified = true;
        candidates.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          personnelNumber: emp.personnelNumber,
          score: 0,
          reasons: [],
          conflicts: [`Maximale Tagesstunden überschritten (${emp.maxDailyHours}h, bereits ${existingHours.toFixed(1)}h geplant)`],
          warnings: [],
          disqualified: true,
          disqualificationReason: `Tagesarbeitszeit würde ${emp.maxDailyHours}h überschreiten`,
        });
        continue;
      }
      score += 10;
      reasons.push('✓ Tagesarbeitszeit eingehalten');

      // HC6: Ruhezeit (ArbZG §5 - 11 Stunden)
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const yesterdayDeployments = existingDeployments.filter((d: any) =>
        d.employeeId === emp.id && d.date.getTime() === yesterday.getTime()
      );
      if (yesterdayDeployments.length > 0) {
        const lastEnd = yesterdayDeployments.reduce((latest: Date, d: any) => {
          const dEnd = new Date(`${yesterday.toISOString().split('T')[0]}T${d.endTime.toISOString().split('T')[1]}`);
          return dEnd > latest ? dEnd : latest;
        }, new Date(0));

        const restHours = (start.getTime() - lastEnd.getTime()) / (1000 * 60 * 60);
        if (restHours < Number(emp.minRestHours)) {
          disqualified = true;
          candidates.push({
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            personnelNumber: emp.personnelNumber,
            score: 0,
            reasons: [],
            conflicts: [`Ruhezeit unterschritten (${restHours.toFixed(1)}h statt min. ${emp.minRestHours}h)`],
            warnings: [],
            disqualified: true,
            disqualificationReason: `Ruhezeit von ${emp.minRestHours}h nicht eingehalten`,
          });
          continue;
        }
        reasons.push(`✓ Ruhezeit eingehalten (${restHours.toFixed(1)}h)`);
      }

      // HC7: Bewachungserlaubnis gültig?
      if (emp.bewachungserlaubnisExpiry && new Date(emp.bewachungserlaubnisExpiry) < date) {
        disqualified = true;
        candidates.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          personnelNumber: emp.personnelNumber,
          score: 0,
          reasons: [],
          conflicts: ['Bewachungserlaubnis abgelaufen'],
          warnings: [],
          disqualified: true,
          disqualificationReason: 'Bewachungserlaubnis abgelaufen (§34a GewO)',
        });
        continue;
      }

      // HC8: Nachtschicht-Alter prüfen
      if (startHour >= 20 || endHour <= 6) {
        if (emp.nightShiftMinAge) {
          const birthDate = emp.dateOfBirth;
          if (birthDate) {
            const age = (date.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            if (age < emp.nightShiftMinAge) {
              disqualified = true;
              candidates.push({
                employeeId: emp.id,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                personnelNumber: emp.personnelNumber,
                score: 0,
                reasons: [],
                conflicts: [`Zu jung für Nachtschicht (min. ${emp.nightShiftMinAge} Jahre)`],
                warnings: [],
                disqualified: true,
                disqualificationReason: 'Altersbeschränkung für Nachtschicht',
              });
              continue;
            }
          }
        }
      }

      // ─── SOFT CONSTRAINTS (Scoring) ───

      // SC1: Bevorzugte Region
      if (emp.preferredRegion && object.city) {
        if (emp.preferredRegion.toLowerCase().includes(object.city.toLowerCase())) {
          score += 10;
          reasons.push(`✓ Bevorzugte Region (${object.city})`);
        } else {
          warnings.push(`Bevorzugte Region: ${emp.preferredRegion}, Objekt in: ${object.city}`);
        }
      }

      // SC2: Kontinuität - War MA schon oft an diesem Objekt?
      const previousDeploymentsAtObject = await prisma.deployment.count({
        where: { employeeId: emp.id, objectId, status: { not: 'cancelled' } },
      });
      if (previousDeploymentsAtObject > 5) {
        score += 15;
        reasons.push(`✓ Erfahrung am Objekt (${previousDeploymentsAtObject}x eingeplant)`);
      } else if (previousDeploymentsAtObject === 0) {
        warnings.push('Keine Erfahrung an diesem Objekt');
      }

      // SC3: Fairness - Wie viele Einsätze hatte der MA diese Woche?
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weeklyDeployments = await prisma.deployment.count({
        where: {
          employeeId: emp.id,
          date: { gte: weekStart, lte: weekEnd },
          status: { not: 'cancelled' },
        },
      });
      if (weeklyDeployments < 3) {
        score += 10;
        reasons.push(`✓ Geringe Wochenbelastung (${weeklyDeployments} Einsätze)`);
      } else if (weeklyDeployments > 5) {
        warnings.push(`Hohe Wochenbelastung (${weeklyDeployments} Einsätze)`);
        score -= 5;
      }

      // SC4: Mitarbeiterpräferenz (wenn vorhanden)
      // TODO: Aus recurringAvailability-Notizen extrahieren

      // SC5: Sicherheitsstufe passend?
      if (emp.sicherheitsstufe >= 3 && startHour >= 20) {
        score += 5;
        reasons.push('✓ Erfahrene Kraft für Nachtschicht');
      }

      candidates.push({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        personnelNumber: emp.personnelNumber,
        score,
        reasons,
        conflicts: [],
        warnings,
        disqualified: false,
      });
    }

    // Sortiere: Beste zuerst
    candidates.sort((a, b) => b.score - a.score);

    return candidates;
  }

  /**
   * Generiert einen vollständigen Plan für mehrere Schichten
   */
  async generatePlan(tenantId: string, deployments: { objectId: string; date: Date; startTime: string; endTime: string; requiredCount: number }[]) {
    const results: PlanningResult[] = [];

    for (const dep of deployments) {
      const candidates = await this.findCandidates({
        tenantId,
        ...dep,
      });

      const qualified = candidates.filter(c => !c.disqualified);
      const unqualified = candidates.filter(c => c.disqualified);

      results.push({
        request: { tenantId, ...dep },
        candidates: qualified,
        selectedCount: dep.requiredCount,
        unselectedReasons: unqualified.map(c => ({
          employeeId: c.employeeId,
          name: c.employeeName,
          reason: c.disqualificationReason || c.conflicts.join(', '),
        })),
      });
    }

    return results;
  }

  /**
   * Plant eine gesamte Planungsgruppe
   * @param mode 'gemeinsam' = Alle Objekte werden gemeinsam optimiert, 'getrennt' = Jedes Objekt einzeln
   */
  async planPlanningGroup(
    tenantId: string,
    planningGroupId: string,
    dates: Date[],
    startTime: string,
    endTime: string,
    employeesPerObjectPerDay: number,
    mode: 'gemeinsam' | 'getrennt' = 'getrennt'
  ) {
    // Lade Planungsgruppe mit allen Objekten und Mitarbeitern
    const planningGroup = await prisma.planningGroup.findFirst({
      where: { id: planningGroupId, tenantId },
      include: {
        objects: {
          include: {
            object: {
              include: {
                customer: true,
                requirements: {
                  include: { qualification: true }
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
                  include: { qualification: true }
                }
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!planningGroup) {
      throw new Error('Planungsgruppe nicht gefunden');
    }

    const objects = planningGroup.objects.map(po => po.object);
    const allEmployees = planningGroup.employees.map(pe => pe.employee);

    if (objects.length === 0) {
      return { success: false, error: 'Planungsgruppe enthält keine Objekte' };
    }

    if (allEmployees.length === 0) {
      return { success: false, error: 'Planungsgruppe enthält keine Mitarbeiter' };
    }

    const results: any[] = [];
    const createdDeployments: any[] = [];

    if (mode === 'getrennt') {
      // GETRENNT: Jedes Objekt wird einzeln geplant
      for (const object of objects) {
        for (const date of dates) {
          const candidates = await this.findCandidates({
            tenantId,
            objectId: object.id,
            date,
            startTime,
            endTime,
            requiredCount: employeesPerObjectPerDay,
            planningGroupId
          });

          const selected = candidates
            .filter(c => !c.disqualified)
            .slice(0, employeesPerObjectPerDay);

          // Erstelle Deployments
          for (const candidate of selected) {
            try {
              const deployment = await prisma.deployment.create({
                data: {
                  tenantId,
                  objectId: object.id,
                  employeeId: candidate.employeeId,
                  date,
                  startTime: new Date(`1970-01-01T${startTime}:00Z`),
                  endTime: new Date(`1970-01-01T${endTime}:00Z`),
                  breakMinutes: 0,
                  status: 'planned',
                  isNightShift: parseInt(startTime) >= 22 || parseInt(endTime) <= 6,
                  isSunday: date.getDay() === 0,
                  isHoliday: false,
                  plannedById: 'system',
                  version: 1
                },
                include: {
                  employee: { select: { id: true, firstName: true, lastName: true } },
                  object: { select: { id: true, name: true } }
                }
              });
              createdDeployments.push(deployment);
            } catch (error) {
              logger.error(`Fehler beim Erstellen des Einsatzes: ${error}`);
            }
          }

          results.push({
            date,
            object: { id: object.id, name: object.name },
            candidates: selected.length,
            deployments: selected.map(c => c.employeeId)
          });
        }
      }
    } else {
      // GEMEINSAM: Alle Objekte werden gemeinsam optimiert
      // Mitarbeiter können zwischen Objekten wechseln
      for (const date of dates) {
        const dateAssignments: any[] = [];

        // Für jedes Objekt Kandidaten finden
        for (const object of objects) {
          const candidates = await this.findCandidates({
            tenantId,
            objectId: object.id,
            date,
            startTime,
            endTime,
            requiredCount: employeesPerObjectPerDay,
            planningGroupId
          });

          const qualified = candidates.filter(c => !c.disqualified);
          dateAssignments.push({
            object,
            candidates: qualified,
            selected: [] as string[]
          });
        }

        // Optimierte Zuweisung: Verhindere doppelte Zuweisungen
        const usedEmployees = new Set<string>();

        for (const assignment of dateAssignments) {
          let count = 0;
          for (const candidate of assignment.candidates) {
            if (count >= employeesPerObjectPerDay) break;
            if (!usedEmployees.has(candidate.employeeId)) {
              assignment.selected.push(candidate.employeeId);
              usedEmployees.add(candidate.employeeId);
              count++;
            }
          }

          // Erstelle Deployments für dieses Objekt
          for (const employeeId of assignment.selected) {
            try {
              const deployment = await prisma.deployment.create({
                data: {
                  tenantId,
                  objectId: assignment.object.id,
                  employeeId,
                  date,
                  startTime: new Date(`1970-01-01T${startTime}:00Z`),
                  endTime: new Date(`1970-01-01T${endTime}:00Z`),
                  breakMinutes: 0,
                  status: 'planned',
                  isNightShift: parseInt(startTime) >= 22 || parseInt(endTime) <= 6,
                  isSunday: date.getDay() === 0,
                  isHoliday: false,
                  plannedById: 'system',
                  version: 1
                },
                include: {
                  employee: { select: { id: true, firstName: true, lastName: true } },
                  object: { select: { id: true, name: true } }
                }
              });
              createdDeployments.push(deployment);
            } catch (error) {
              logger.error(`Fehler beim Erstellen des Einsatzes: ${error}`);
            }
          }

          results.push({
            date,
            object: { id: assignment.object.id, name: assignment.object.name },
            candidates: assignment.candidates.length,
            deployments: assignment.selected
          });
        }
      }
    }

    return {
      success: true,
      planningGroup: { id: planningGroup.id, name: planningGroup.name },
      mode,
      totalObjects: objects.length,
      totalDays: dates.length,
      totalDeployments: createdDeployments.length,
      results,
      createdDeployments
    };
  }

  /**
   * Validiert einen manuell erstellten Einsatz gegen alle Constraints
   */
  async validateDeployment(tenantId: string, employeeId: string, objectId: string, date: Date, startTime: string, endTime: string) {
    const start = new Date(`${date.toISOString().split('T')[0]}T${startTime}`);
    const end = new Date(`${date.toISOString().split('T')[0]}T${endTime}`);

    const violations: { type: 'hard' | 'soft'; message: string }[] = [];

    // Restriktionen
    const restrictionCheck = await employeeRestrictionService.checkRestrictions(
      tenantId, employeeId, date, start, end, objectId
    );
    if (!restrictionCheck.allowed) {
      for (const v of restrictionCheck.violations) {
        violations.push({ type: 'hard', message: v.message });
      }
    }

    // Verfügbarkeit
    const availabilityCheck = await recurringAvailabilityService.isAvailable(
      tenantId, employeeId, date, start, end
    );
    if (!availabilityCheck.available) {
      violations.push({ type: 'hard', message: availabilityCheck.reason });
    }

    // Bewachungserlaubnis
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
    if (emp?.bewachungserlaubnisExpiry && new Date(emp.bewachungserlaubnisExpiry) < date) {
      violations.push({ type: 'hard', message: 'Bewachungserlaubnis abgelaufen' });
    }

    return {
      valid: violations.filter(v => v.type === 'hard').length === 0,
      violations,
    };
  }
}

export const autoPlannerService = new AutoPlannerService();
