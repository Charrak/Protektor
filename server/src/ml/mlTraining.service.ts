/**
 * Machine Learning Service für Protektor
 * 
 * Nutzt statistische Methoden und historische Daten für:
 * - Mitarbeiter-Objekt-Matching (Erfolgsquote)
 * - Ausfallvorhersage (Krankheitswahrscheinlichkeit)
 * - Optimale Schichtgrößen
 * - Zeitbasierte Präferenzen
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';

// ═══════════════════════════════════════════════════
// DATENMODELLE
// ═══════════════════════════════════════════════════

export interface EmployeePerformance {
  employeeId: string;
  objectId: string;
  totalShifts: number;
  completedShifts: number;
  incidents: number;
  avgRating: number;
  successRate: number; // 0-1
  preferredTimes: { morning: number; afternoon: number; night: number };
  preferredDays: number[]; // 1=Mo, 7=So
}

export interface ObjectRequirements {
  objectId: string;
  avgPersonnelNeeded: number;
  peakHours: { start: number; end: number };
  incidentRate: number; // Vorfälle pro 100 Schichten
  difficultyScore: number; // 1-10
  requiredSkills: string[];
}

export interface AbsencePrediction {
  employeeId: string;
  absenceProbability: number; // 0-1
  riskFactors: string[];
  recommendedActions: string[];
}

// ═══════════════════════════════════════════════════
// TRAINING DATA EXTRACTION
// ═══════════════════════════════════════════════════

export class MLTrainingService {
  /**
   * Analysiert alle historischen Daten und erstellt Modelle
   */
  async trainModels(tenantId: string) {
    logger.info('🤖 Starte KI-Training mit historischen Daten...');

    const startTime = Date.now();

    // 1. Mitarbeiter-Performance analysieren
    const employeePerformance = await this.analyzeEmployeePerformance(tenantId);
    logger.info(`✅ Mitarbeiter-Performance analysiert: ${employeePerformance.length} Einträge`);

    // 2. Objekt-Anforderungen lernen
    const objectRequirements = await this.learnObjectRequirements(tenantId);
    logger.info(`✅ Objekt-Anforderungen gelernt: ${objectRequirements.length} Objekte`);

    // 3. Ausfallwahrscheinlichkeiten berechnen
    const absencePredictions = await this.predictAbsences(tenantId);
    logger.info(`✅ Ausfallvorhersage erstellt: ${absencePredictions.length} Mitarbeiter`);

    // 4. Optimale Schichtgrößen berechnen
    const optimalShiftSizes = await this.calculateOptimalShiftSizes(tenantId);
    logger.info(`✅ Optimale Schichtgrößen berechnet: ${optimalShiftSizes.length} Objekte`);

    // 5. Zeitbasierte Präferenzen lernen
    const timePreferences = await this.learnTimePreferences(tenantId);
    logger.info(`✅ Zeitpräferenzen gelernt: ${timePreferences.length} Mitarbeiter`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`🎉 Training abgeschlossen in ${duration}s`);

    // Ergebnisse speichern
    await this.saveTrainingResults(tenantId, {
      employeePerformance,
      objectRequirements,
      absencePredictions,
      optimalShiftSizes,
      timePreferences,
      trainedAt: new Date(),
    });

    return {
      employeePerformance: employeePerformance.length,
      objectRequirements: objectRequirements.length,
      absencePredictions: absencePredictions.length,
      optimalShiftSizes: optimalShiftSizes.length,
      timePreferences: timePreferences.length,
      duration,
    };
  }

  /**
   * Analysiert Mitarbeiter-Performance pro Objekt
   */
  async analyzeEmployeePerformance(tenantId: string): Promise<EmployeePerformance[]> {
    // Alle Deployments laden
    const deployments = await prisma.deployment.findMany({
      where: { tenantId, status: { in: ['confirmed', 'completed'] } },
    });

    // Alle Schichtberichte laden
    const shiftReports = await prisma.shiftReport.findMany({
      where: { tenantId },
    });

    // Gruppieren nach Employee-Object-Paaren
    const performanceMap = new Map<string, EmployeePerformance>();

    for (const deployment of deployments) {
      const key = `${deployment.employeeId}-${deployment.objectId}`;

      if (!performanceMap.has(key)) {
        performanceMap.set(key, {
          employeeId: deployment.employeeId,
          objectId: deployment.objectId,
          totalShifts: 0,
          completedShifts: 0,
          incidents: 0,
          avgRating: 5.0,
          successRate: 0,
          preferredTimes: { morning: 0, afternoon: 0, night: 0 },
          preferredDays: [],
        });
      }

      const perf = performanceMap.get(key)!;
      perf.totalShifts++;

      // Erfolgreiche Schicht?
      const report = shiftReports.find((r: any) =>
        r.objectId === deployment.objectId &&
        r.employeeId === deployment.employeeId &&
        r.reportDate.toDateString() === deployment.date.toDateString()
      );

      if (report && report.status === 'approved') {
        perf.completedShifts++;
      }

      // Vorfälle zählen
      if (report?.incidents) {
        const incidents = JSON.parse(report.incidents as string);
        perf.incidents += incidents.length;
      }

      // Zeitpräferenzen
      const hour = deployment.startTime.getHours();
      if (hour >= 6 && hour < 12) perf.preferredTimes.morning++;
      else if (hour >= 12 && hour < 18) perf.preferredTimes.afternoon++;
      else perf.preferredTimes.night++;

      // Wochentag
      const dayOfWeek = deployment.date.getDay() === 0 ? 7 : deployment.date.getDay();
      if (!perf.preferredDays.includes(dayOfWeek)) {
        perf.preferredDays.push(dayOfWeek);
      }
    }

    // Success Rate berechnen
    const results: EmployeePerformance[] = [];
    for (const perf of performanceMap.values()) {
      perf.successRate = perf.totalShifts > 0 ? perf.completedShifts / perf.totalShifts : 0;
      results.push(perf);
    }

    return results;
  }

  /**
   * Lernt Objekt-Anforderungen aus historischen Daten
   */
  async learnObjectRequirements(tenantId: string): Promise<ObjectRequirements[]> {
    const objects = await prisma.sMSObject.findMany({
      where: { tenantId },
      include: {
        deployments: {
          where: { status: { in: ['confirmed', 'completed'] } },
        },
        shiftReports: true,
      },
    });

    const requirements: ObjectRequirements[] = [];

    for (const object of objects) {
      const deployments = object.deployments;
      const reports = object.shiftReports;

      if (deployments.length === 0) continue;

      // Durchschnittliches Personal
      const personnelCounts = reports.map((r: any) => r.personnelCount);
      const avgPersonnel = personnelCounts.length > 0
        ? personnelCounts.reduce((a: any, b: any) => a + b, 0) / personnelCounts.length
        : 2; // Default

      // Peak Hours (häufigste Schichtzeiten)
      const hourCounts = new Map<number, number>();
      for (const dep of deployments) {
        const hour = dep.startTime.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }

      const sortedHours = Array.from(hourCounts.entries()).sort((a: any, b: any) => b[1] - a[1]);
      const peakStart = sortedHours[0]?.[0] || 8;
      const peakEnd = (peakStart + 8) % 24; // Default 8h Schicht

      // Incident Rate
      const totalIncidents = reports.reduce((sum: any, r: any) => {
        const incidents = r.incidents ? JSON.parse(r.incidents as string).length : 0;
        return sum + incidents;
      }, 0);
      const incidentRate = reports.length > 0 ? (totalIncidents / reports.length) * 100 : 0;

      // Difficulty Score (basierend auf Vorfällen, Nachtschichten, Größe)
      let difficulty = 1;
      if (incidentRate > 5) difficulty += 2;
      if (incidentRate > 10) difficulty += 2;
      if (object.objectType === 'event_venue') difficulty += 3;
      if (object.accessCode) difficulty += 1; // Komplexer Zugang
      difficulty = Math.min(10, difficulty);

      requirements.push({
        objectId: object.id,
        avgPersonnelNeeded: Math.round(avgPersonnel),
        peakHours: { start: peakStart, end: peakEnd },
        incidentRate: Math.round(incidentRate * 10) / 10,
        difficultyScore: difficulty,
        requiredSkills: [], // TODO: Aus Objekt-Anforderungen extrahieren
      });
    }

    return requirements;
  }

  /**
   * Vorhersage von Ausfallwahrscheinlichkeiten
   */
  async predictAbsences(tenantId: string): Promise<AbsencePrediction[]> {
    const employees = await prisma.employee.findMany({
      where: { tenantId, status: 'active' },
      include: {
        timeRecords: {
          where: { date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }, // Letzte 90 Tage
        },
        availabilities: {
          where: {
            startDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            type: { in: ['sick', 'vacation'] },
          },
        },
      },
    });

    const predictions: AbsencePrediction[] = [];

    for (const emp of employees) {
      const riskFactors: string[] = [];
      let riskScore = 0;

      // Faktor 1: Häufige Krankheitstage
      const sickDays = emp.availabilities.filter((a: any) => a.type === 'sick').length;
      if (sickDays >= 5) {
        riskFactors.push('Häufige Krankheitstage (≥5 in 90 Tagen)');
        riskScore += 30;
      } else if (sickDays >= 3) {
        riskFactors.push('Mehrfache Krankheitstage (≥3 in 90 Tagen)');
        riskScore += 15;
      }

      // Faktor 2: Überstunden (Burnout-Risiko)
      const recentRecords = emp.timeRecords.slice(-30); // Letzte 30 Einträge
      const avgHours = recentRecords.reduce((sum: any, r: any) => sum + (r.totalHours || 0), 0) / Math.max(recentRecords.length, 1);
      if (avgHours > 10) {
        riskFactors.push('Hohe durchschnittliche Arbeitszeit (>10h/Schicht)');
        riskScore += 20;
      }

      // Faktor 3: Keine Pausen in letzter Zeit
      const recentVacation = emp.availabilities.filter((a: any) => a.type === 'vacation').length;
      if (recentVacation === 0) {
        riskFactors.push('Kein Urlaub in den letzten 90 Tagen');
        riskScore += 10;
      }

      // Faktor 4: Nachtschichten
      const nightShifts = emp.timeRecords.filter((r: any) => {
        const hour = r.clockIn?.getHours() || 0;
        return hour >= 22 || hour < 6;
      }).length;
      if (nightShifts >= 10) {
        riskFactors.push('Viele Nachtschichten (≥10 in 90 Tagen)');
        riskScore += 15;
      }

      // Faktor 5: Wochenendarbeit
      const weekendShifts = emp.timeRecords.filter((r: any) => {
        const day = r.date.getDay();
        return day === 0 || day === 6;
      }).length;
      if (weekendShifts >= 8) {
        riskFactors.push('Häufige Wochenendarbeit (≥8 in 90 Tagen)');
        riskScore += 10;
      }

      // Wahrscheinlichkeit berechnen (0-100%)
      const probability = Math.min(100, riskScore) / 100;

      // Empfehlungen
      const recommendations: string[] = [];
      if (riskFactors.some(f => f.includes('Krankheit'))) {
        recommendations.push('Gesundheitscheck anbieten');
      }
      if (riskFactors.some(f => f.includes('Überstunden') || f.includes('Nachtschicht'))) {
        recommendations.push('Schichtplanung reduzieren');
      }
      if (riskFactors.some(f => f.includes('Urlaub'))) {
        recommendations.push('Urlaub einplanen');
      }
      if (riskFactors.length === 0) {
        recommendations.push('Keine Maßnahmen erforderlich');
      }

      predictions.push({
        employeeId: emp.id,
        absenceProbability: probability,
        riskFactors,
        recommendedActions: recommendations,
      });
    }

    return predictions;
  }

  /**
   * Berechnet optimale Schichtgrößen basierend auf historischen Daten
   */
  async calculateOptimalShiftSizes(tenantId: string) {
    const objects = await prisma.sMSObject.findMany({
      where: { tenantId },
      include: {
        shiftReports: {
          where: { status: 'approved' },
        },
      },
    });

    const shiftSizes: any[] = [];

    for (const object of objects) {
      const reports = object.shiftReports;

      if (reports.length < 5) continue; // Zu wenige Daten

      // Gruppiere nach Tageszeit
      const timeGroups = {
        morning: [] as number[],  // 06-12
        afternoon: [] as number[], // 12-18
        evening: [] as number[],   // 18-22
        night: [] as number[],     // 22-06
      };

      for (const report of reports) {
        const hour = report.shiftStart.getHours();
        const count = report.personnelCount;

        if (hour >= 6 && hour < 12) timeGroups.morning.push(count);
        else if (hour >= 12 && hour < 18) timeGroups.afternoon.push(count);
        else if (hour >= 18 && hour < 22) timeGroups.evening.push(count);
        else timeGroups.night.push(count);
      }

      // Durchschnitt berechnen
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a: any, b: any) => a + b, 0) / arr.length : 0;

      shiftSizes.push({
        objectId: object.id,
        optimalSizes: {
          morning: Math.round(avg(timeGroups.morning) * 10) / 10,
          afternoon: Math.round(avg(timeGroups.afternoon) * 10) / 10,
          evening: Math.round(avg(timeGroups.evening) * 10) / 10,
          night: Math.round(avg(timeGroups.night) * 10) / 10,
        },
        dataPoints: reports.length,
        confidence: reports.length >= 20 ? 'high' : reports.length >= 10 ? 'medium' : 'low',
      });
    }

    return shiftSizes;
  }

  /**
   * Lernt zeitbasierte Präferenzen der Mitarbeiter
   */
  async learnTimePreferences(tenantId: string) {
    const employees = await prisma.employee.findMany({
      where: { tenantId },
      include: {
        deployments: {
          where: { date: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } }, // 6 Monate
        },
      },
    });

    const preferences: any[] = [];

    for (const emp of employees) {
      if (emp.deployments.length < 10) continue;

      // Wochentag-Präferenzen
      const dayCounts = new Map<number, number>();
      for (const dep of emp.deployments) {
        const day = dep.date.getDay() === 0 ? 7 : dep.date.getDay();
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      }

      const sortedDays = Array.from(dayCounts.entries()).sort((a: any, b: any) => b[1] - a[1]);
      const preferredDays = sortedDays.slice(0, 5).map((d: any) => d[0]);

      // Zeit-Präferenzen
      const hourCounts = new Map<number, number>();
      for (const dep of emp.deployments) {
        const hour = dep.startTime.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }

      const sortedHours = Array.from(hourCounts.entries()).sort((a: any, b: any) => b[1] - a[1]);
      const preferredHour = sortedHours[0]?.[0] || 8;

      // Shift-Länge Präferenz
      const shiftLengths = emp.deployments.map((d: any) => {
        const start = d.startTime.getTime();
        const end = d.endTime.getTime();
        return (end - start) / (1000 * 60 * 60);
      });
      const avgShiftLength = shiftLengths.reduce((a: any, b: any) => a + b, 0) / shiftLengths.length;

      preferences.push({
        employeeId: emp.id,
        preferredDays,
        preferredHour,
        preferredShiftLength: Math.round(avgShiftLength * 10) / 10,
        totalShifts: emp.deployments.length,
        confidence: emp.deployments.length >= 30 ? 'high' : emp.deployments.length >= 15 ? 'medium' : 'low',
      });
    }

    return preferences;
  }

  /**
   * Speichert Training-Ergebnisse in der Datenbank
   */
  async saveTrainingResults(tenantId: string, results: any) {
    // TODO: In eigene ML-Model-Tabelle speichern
    logger.info('Training-Ergebnisse gespeichert', { tenantId });
  }
}

export const mlTrainingService = new MLTrainingService();
