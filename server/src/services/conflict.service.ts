import { prisma } from '../config/database';

export type ConflictType = 
  | 'double_booking'
  | 'insufficient_rest'
  | 'max_hours_day'
  | 'max_hours_week'
  | 'missing_qualification'
  | 'absence_conflict'
  | 'understaffing';

export interface Conflict {
  type: ConflictType;
  severity: 'error' | 'warning';
  title: string;
  message: string;
  deploymentId?: string;
  employeeId?: string;
  objectId?: string;
  date: string;
  details?: any;
}

export class ConflictService {
  /**
   * Prüft alle Einsätze in einem Zeitraum auf Konflikte
   */
  async checkConflicts(
    startDate: Date,
    endDate: Date,
    tenantId: string
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Lade alle Einsätze im Zeitraum
    const deployments = await prisma.deployment.findMany({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ['cancelled', 'declined'],
        },
      },
      include: {
        employee: {
          include: {
            qualifications: {
              include: {
                qualification: true,
              },
            },
          },
        },
        object: {
          include: {
            requiredQualifications: true,
          },
        },
      },
    });

    // Lade Abwesenheiten im Zeitraum
    const availabilities = await prisma.employeeAvailability.findMany({
      where: {
        tenantId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        status: 'approved',
      },
    });

    // 1. Doppelbelegungen prüfen
    const doubleBookings = this.checkDoubleBookings(deployments);
    conflicts.push(...doubleBookings);

    // 2. Ruhezeit-Verstöße prüfen
    const restViolations = this.checkInsufficientRest(deployments);
    conflicts.push(...restViolations);

    // 3. Max Arbeitszeit pro Tag prüfen
    const maxDayViolations = this.checkMaxHoursPerDay(deployments);
    conflicts.push(...maxDayViolations);

    // 4. Max Arbeitszeit pro Woche prüfen
    const maxWeekViolations = this.checkMaxHoursPerWeek(deployments);
    conflicts.push(...maxWeekViolations);

    // 5. Fehlende Qualifikationen prüfen
    const missingQualifications = this.checkMissingQualifications(deployments);
    conflicts.push(...missingQualifications);

    // 6. Abwesenheitskonflikte prüfen
    const absenceConflicts = this.checkAbsenceConflicts(deployments, availabilities);
    conflicts.push(...absenceConflicts);

    // 7. Unterbesetzung prüfen (optional: benötigt Objekt-spezifische Mindestbesetzung)
    // Wird später implementiert, wenn Objekt-Konfiguration für Mindestbesetzung vorhanden

    return conflicts;
  }

  /**
   * Prüft auf Doppelbelegungen (Mitarbeiter in mehreren Einsätzen gleichzeitig)
   */
  private checkDoubleBookings(deployments: any[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const employeeMap = new Map<string, any[]>();

    // Gruppiere Einsätze nach Mitarbeiter
    deployments.forEach(dep => {
      if (!dep.employeeId) return;
      if (!employeeMap.has(dep.employeeId)) {
        employeeMap.set(dep.employeeId, []);
      }
      employeeMap.get(dep.employeeId)!.push(dep);
    });

    // Prüfe jedes Mitarbeiter-Datum auf Überlappungen
    employeeMap.forEach((employeeDeps, employeeId) => {
      // Gruppiere nach Datum
      const dateMap = new Map<string, any[]>();
      employeeDeps.forEach(dep => {
        const date = dep.date.toISOString().split('T')[0];
        if (!dateMap.has(date)) {
          dateMap.set(date, []);
        }
        dateMap.get(date)!.push(dep);
      });

      // Prüfe Überlappungen pro Tag
      dateMap.forEach((dayDeps, date) => {
        for (let i = 0; i < dayDeps.length; i++) {
          for (let j = i + 1; j < dayDeps.length; j++) {
            const dep1 = dayDeps[i];
            const dep2 = dayDeps[j];

            if (this.timesOverlap(dep1, dep2)) {
              const employeeName = `${dep1.employee.firstName} ${dep1.employee.lastName}`;
              conflicts.push({
                type: 'double_booking',
                severity: 'error',
                title: 'Doppelbelegung',
                message: `${employeeName} ist am ${this.formatDate(dep1.date)} gleichzeitig in zwei Einsätzen eingeplant`,
                deploymentId: dep2.id,
                employeeId,
                objectId: dep2.objectId,
                date,
                details: {
                  deployment1: {
                    id: dep1.id,
                    time: `${dep1.startTime}-${dep1.endTime}`,
                    object: dep1.object.name,
                  },
                  deployment2: {
                    id: dep2.id,
                    time: `${dep2.startTime}-${dep2.endTime}`,
                    object: dep2.object.name,
                  },
                },
              });
            }
          }
        }
      });
    });

    return conflicts;
  }

  /**
   * Prüft auf unzureichende Ruhezeit (< 11 Stunden)
   */
  private checkInsufficientRest(deployments: any[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const MIN_REST_HOURS = 11;

    const employeeMap = new Map<string, any[]>();
    deployments.forEach(dep => {
      if (!dep.employeeId) return;
      if (!employeeMap.has(dep.employeeId)) {
        employeeMap.set(dep.employeeId, []);
      }
      employeeMap.get(dep.employeeId)!.push(dep);
    });

    employeeMap.forEach((employeeDeps, employeeId) => {
      // Sortiere nach Datum und Startzeit
      employeeDeps.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.startTime.localeCompare(b.startTime);
      });

      // Prüfe Ruhezeit zwischen aufeinanderfolgenden Einsätzen
      for (let i = 0; i < employeeDeps.length - 1; i++) {
        const dep1 = employeeDeps[i];
        const dep2 = employeeDeps[i + 1];

        const endTime1 = this.getTimeInMinutes(dep1.endTime);
        const startTime2 = this.getTimeInMinutes(dep2.startTime);

        // Berechne Stunden zwischen Ende und Start
        const date1 = new Date(dep1.date).getTime();
        const date2 = new Date(dep2.date).getTime();
        const dayDiff = (date2 - date1) / (1000 * 60 * 60 * 24);

        let restMinutes: number;
        if (dayDiff === 0) {
          // Gleicher Tag
          restMinutes = startTime2 - endTime1;
        } else if (dayDiff === 1) {
          // Nächster Tag
          restMinutes = (24 * 60 - endTime1) + startTime2;
        } else {
          // Mehr als ein Tag Abstand - keine Prüfung nötig
          continue;
        }

        const restHours = restMinutes / 60;

        if (restHours < MIN_REST_HOURS) {
          const employeeName = `${dep1.employee.firstName} ${dep1.employee.lastName}`;
          conflicts.push({
            type: 'insufficient_rest',
            severity: 'error',
            title: 'Unzureichende Ruhezeit',
            message: `${employeeName} hat nur ${restHours.toFixed(1)}h Ruhezeit zwischen Einsätzen (Minimum: ${MIN_REST_HOURS}h)`,
            deploymentId: dep2.id,
            employeeId,
            objectId: dep2.objectId,
            date: dep2.date.toISOString().split('T')[0],
            details: {
              restHours: restHours.toFixed(1),
              requiredHours: MIN_REST_HOURS,
            },
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Prüft maximale Arbeitszeit pro Tag (10 Stunden)
   */
  private checkMaxHoursPerDay(deployments: any[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const MAX_HOURS_PER_DAY = 10;

    const employeeDateMap = new Map<string, any[]>();
    deployments.forEach(dep => {
      if (!dep.employeeId) return;
      const date = dep.date.toISOString().split('T')[0];
      const key = `${dep.employeeId}_${date}`;
      if (!employeeDateMap.has(key)) {
        employeeDateMap.set(key, []);
      }
      employeeDateMap.get(key)!.push(dep);
    });

    employeeDateMap.forEach((dayDeps, key) => {
      const [employeeId, date] = key.split('_');
      let totalMinutes = 0;

      dayDeps.forEach(dep => {
        const startMinutes = this.getTimeInMinutes(dep.startTime);
        const endMinutes = this.getTimeInMinutes(dep.endTime);
        const duration = endMinutes - startMinutes;
        totalMinutes += duration - (dep.breakMinutes || 0);
      });

      const totalHours = totalMinutes / 60;

      if (totalHours > MAX_HOURS_PER_DAY) {
        const employeeName = `${dayDeps[0].employee.firstName} ${dayDeps[0].employee.lastName}`;
        conflicts.push({
          type: 'max_hours_day',
          severity: 'warning',
          title: 'Maximale Tagesarbeitszeit überschritten',
          message: `${employeeName} ist am ${this.formatDate(new Date(date))} für ${totalHours.toFixed(1)}h eingeplant (Maximum: ${MAX_HOURS_PER_DAY}h)`,
          employeeId,
          date,
          details: {
            totalHours: totalHours.toFixed(1),
            maxHours: MAX_HOURS_PER_DAY,
          },
        });
      }
    });

    return conflicts;
  }

  /**
   * Prüft maximale Arbeitszeit pro Woche (48 Stunden)
   */
  private checkMaxHoursPerWeek(deployments: any[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const MAX_HOURS_PER_WEEK = 48;

    const employeeWeekMap = new Map<string, any[]>();
    deployments.forEach(dep => {
      if (!dep.employeeId) return;
      const weekStart = this.getWeekStart(dep.date);
      const key = `${dep.employeeId}_${weekStart.toISOString().split('T')[0]}`;
      if (!employeeWeekMap.has(key)) {
        employeeWeekMap.set(key, []);
      }
      employeeWeekMap.get(key)!.push(dep);
    });

    employeeWeekMap.forEach((weekDeps, key) => {
      const [employeeId, weekStartDate] = key.split('_');
      let totalMinutes = 0;

      weekDeps.forEach(dep => {
        const startMinutes = this.getTimeInMinutes(dep.startTime);
        const endMinutes = this.getTimeInMinutes(dep.endTime);
        const duration = endMinutes - startMinutes;
        totalMinutes += duration - (dep.breakMinutes || 0);
      });

      const totalHours = totalMinutes / 60;

      if (totalHours > MAX_HOURS_PER_WEEK) {
        const employeeName = `${weekDeps[0].employee.firstName} ${weekDeps[0].employee.lastName}`;
        conflicts.push({
          type: 'max_hours_week',
          severity: 'warning',
          title: 'Maximale Wochenarbeitszeit überschritten',
          message: `${employeeName} ist in KW ${this.getWeekNumber(new Date(weekStartDate))} für ${totalHours.toFixed(1)}h eingeplant (Maximum: ${MAX_HOURS_PER_WEEK}h)`,
          employeeId,
          date: weekStartDate,
          details: {
            totalHours: totalHours.toFixed(1),
            maxHours: MAX_HOURS_PER_WEEK,
            weekNumber: this.getWeekNumber(new Date(weekStartDate)),
          },
        });
      }
    });

    return conflicts;
  }

  /**
   * Prüft fehlende Qualifikationen
   */
  private checkMissingQualifications(deployments: any[]): Conflict[] {
    const conflicts: Conflict[] = [];

    deployments.forEach(dep => {
      if (!dep.employeeId || !dep.object.requiredQualifications?.length) return;

      const employeeQualifications = new Set(
        dep.employee.qualifications?.map((eq: any) => eq.qualificationId) || []
      );

      dep.object.requiredQualifications.forEach((required: any) => {
        if (!employeeQualifications.has(required.qualificationId)) {
          const employeeName = `${dep.employee.firstName} ${dep.employee.lastName}`;
          conflicts.push({
            type: 'missing_qualification',
            severity: 'error',
            title: 'Fehlende Qualifikation',
            message: `${employeeName} fehlt die Qualifikation "${required.qualification.name}" für ${dep.object.name}`,
            deploymentId: dep.id,
            employeeId: dep.employeeId,
            objectId: dep.objectId,
            date: dep.date.toISOString().split('T')[0],
            details: {
              requiredQualification: required.qualification.name,
            },
          });
        }
      });
    });

    return conflicts;
  }

  /**
   * Prüft Konflikte mit Abwesenheiten (Urlaub, Krank, etc.)
   */
  private checkAbsenceConflicts(deployments: any[], availabilities: any[]): Conflict[] {
    const conflicts: Conflict[] = [];

    deployments.forEach(dep => {
      if (!dep.employeeId) return;

      const depDate = new Date(dep.date);
      const conflictingAbsence = availabilities.find(avail => {
        if (avail.employeeId !== dep.employeeId) return false;
        const availStart = new Date(avail.startDate);
        const availEnd = new Date(avail.endDate);
        return depDate >= availStart && depDate <= availEnd;
      });

      if (conflictingAbsence) {
        const employeeName = `${dep.employee.firstName} ${dep.employee.lastName}`;
        const absenceType = this.getAbsenceTypeLabel(conflictingAbsence.type);
        conflicts.push({
          type: 'absence_conflict',
          severity: 'error',
          title: 'Konflikt mit Abwesenheit',
          message: `${employeeName} ist am ${this.formatDate(dep.date)} als ${absenceType} eingetragen`,
          deploymentId: dep.id,
          employeeId: dep.employeeId,
          objectId: dep.objectId,
          date: dep.date.toISOString().split('T')[0],
          details: {
            absenceType,
            absenceId: conflictingAbsence.id,
          },
        });
      }
    });

    return conflicts;
  }

  /**
   * Hilfsfunktion: Prüft ob zwei Einsätze zeitlich überlappen
   */
  private timesOverlap(dep1: any, dep2: any): boolean {
    const start1 = this.getTimeInMinutes(dep1.startTime);
    const end1 = this.getTimeInMinutes(dep1.endTime);
    const start2 = this.getTimeInMinutes(dep2.startTime);
    const end2 = this.getTimeInMinutes(dep2.endTime);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Hilfsfunktion: Konvertiert Zeit-String zu Minuten seit Mitternacht
   */
  private getTimeInMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Hilfsfunktion: Gibt Wochenstart (Montag) zurück
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Hilfsfunktion: Gibt Kalenderwoche zurück
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Hilfsfunktion: Formatiert Datum lesbar
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Hilfsfunktion: Gibt Label für Abwesenheitstyp zurück
   */
  private getAbsenceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      vacation: 'Urlaub',
      sick: 'Krank',
      training: 'Schulung',
      personal: 'Persönlich',
      other: 'Abwesend',
    };
    return labels[type] || type;
  }
}

export const conflictService = new ConflictService();
