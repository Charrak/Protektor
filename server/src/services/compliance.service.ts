import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Compliance-Service für deutsche Sicherheitsfirmen
 * 
 * Deckt ab:
 * - DSGVO: Datenminimierung, Löschkonzept, Auskunftsrecht
 * - ArbZG: Höchstarbeitszeit, Ruhezeiten, Pausen, Nachtarbeit
 * - Aufbewahrungsfristen (GoBD: 10 Jahre für Buchungsbelege)
 * - Branchenspezifisch: §34a GewO, Bewachungserlaubnis
 */

export interface ComplianceViolation {
  type: 'arbzg' | 'dsgvo' | 'branchenspezifisch';
  severity: 'critical' | 'warning' | 'info';
  employeeId?: string;
  employeeName?: string;
  message: string;
  details?: any;
}

export interface DeletionRequest {
  employeeId: string;
  reason: 'terminated' | 'dsgvo_request' | 'data_minimization';
  retainPeriod?: number; // Monate
}

export class ComplianceService {
  /**
   * ArbZG-Compliance-Check für alle Mitarbeiter
   */
  async checkArbZGCompliance(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const now = new Date();
    const from = dateFrom || new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = dateTo || now;

    const employees = await prisma.employee.findMany({
      where: { tenantId, status: 'active', deletedAt: null },
      include: {
        deployments: {
          where: { date: { gte: from, lte: to }, status: { not: 'cancelled' } },
        },
        timeRecords: {
          where: { date: { gte: from, lte: to }, status: { in: ['approved', 'locked'] } },
        },
      },
    });

    for (const emp of employees) {
      // §3 ArbZG: Max 10h/Tag
      const dailyHours = this.calculateDailyHours(emp.deployments, emp.timeRecords);
      for (const [date, hours] of Object.entries(dailyHours)) {
        if (hours > Number(emp.maxDailyHours)) {
          violations.push({
            type: 'arbzg',
            severity: 'critical',
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            message: `§3 ArbZG: Max Tagesarbeitszeit überschritten`,
            details: { date, hours, maxAllowed: emp.maxDailyHours },
          });
        }
      }

      // §4 ArbZG: Pausen (6-9h: 30min, >9h: 45min)
      const breakViolations = this.checkBreakCompliance(emp.timeRecords);
      for (const violation of breakViolations) {
        violations.push({
          type: 'arbzg',
          severity: 'warning',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          message: `§4 ArbZG: Pausenregelung nicht eingehalten`,
          details: violation,
        });
      }

      // §5 ArbZG: Ruhezeit (11h)
      const restViolations = this.checkRestTimeCompliance(emp.deployments);
      for (const violation of restViolations) {
        violations.push({
          type: 'arbzg',
          severity: 'critical',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          message: `§5 ArbZG: Ruhezeit unterschritten`,
          details: violation,
        });
      }

      // §6 ArbZG: Sonntagsarbeit
      const sundayWork = this.checkSundayWork(emp.deployments);
      if (sundayWork > 0 && emp.noSundayShift) {
        violations.push({
          type: 'arbzg',
          severity: 'warning',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          message: `§6 ArbZG: Sonntagsarbeit trotz Restriktion`,
          details: { sundayCount: sundayWork },
        });
      }

      // § Nachtarbeit (§2 ArbZG)
      const nightWork = this.checkNightWork(emp.deployments);
      if (nightWork > 0 && emp.noNightShift) {
        violations.push({
          type: 'arbzg',
          severity: 'critical',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          message: `§2 ArbZG: Nachtschicht trotz Restriktion`,
          details: { nightShifts: nightWork },
        });
      }
    }

    return violations;
  }

  /**
   * §34a GewO Compliance-Check (Bewachungserlaubnis)
   */
  async checkSecurityLicenseCompliance(tenantId: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const now = new Date();

    const employees = await prisma.employee.findMany({
      where: { tenantId, status: 'active', deletedAt: null },
    });

    for (const emp of employees) {
      // Bewachungserlaubnis abgelaufen?
      if (emp.bewachungserlaubnisExpiry && new Date(emp.bewachungserlaubnisExpiry) < now) {
        violations.push({
          type: 'branchenspezifisch',
          severity: 'critical',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          message: `§34a GewO: Bewachungserlaubnis abgelaufen`,
          details: { expiryDate: emp.bewachungserlaubnisExpiry },
        });
      }

      // Bewachungserlaubnis läuft bald ab (90 Tage)?
      if (emp.bewachungserlaubnisExpiry) {
        const daysUntilExpiry = (new Date(emp.bewachungserlaubnisExpiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntilExpiry <= 90 && daysUntilExpiry > 0) {
          violations.push({
            type: 'branchenspezifisch',
            severity: 'warning',
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            message: `§34a GewO: Bewachungserlaubnis läuft bald ab`,
            details: { expiryDate: emp.bewachungserlaubnisExpiry, daysUntilExpiry: Math.round(daysUntilExpiry) },
          });
        }
      }

      // Führungszeugnis älter als 1 Jahr?
      if (emp.fuehrungszeugnisDatum) {
        const daysSince = (now.getTime() - new Date(emp.fuehrungszeugnisDatum).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 365) {
          violations.push({
            type: 'branchenspezifisch',
            severity: 'warning',
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            message: `Führungszeugnis älter als 1 Jahr`,
            details: { lastCheck: emp.fuehrungszeugnisDatum, daysSince: Math.round(daysSince) },
          });
        }
      }

      // Erste Hilfe abgelaufen?
      if (emp.ersteHilfeCertified && emp.ersteHilfeExpiry && new Date(emp.ersteHilfeExpiry) < now) {
        violations.push({
          type: 'branchenspezifisch',
          severity: 'critical',
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          message: `Erste-Hilfe-Zertifikat abgelaufen`,
          details: { expiryDate: emp.ersteHilfeExpiry },
        });
      }
    }

    return violations;
  }

  /**
   * DSGVO: Auskunftsantrag (Art. 15 DSGVO)
   */
  async generateDataExport(tenantId: string, employeeId: string): Promise<any> {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      include: {
        qualifications: { include: { qualification: true } },
        documents: true,
        availabilities: true,
        deployments: true,
        timeRecords: true,
      },
    });

    if (!employee) throw new Error('Mitarbeiter nicht gefunden');

    // DSGVO-konformer Export (nur eigene Daten)
    return {
      personalData: {
        name: `${employee.firstName} ${employee.lastName}`,
        personnelNumber: employee.personnelNumber,
        email: employee.email,
        phone: employee.phone,
        address: {
          street: employee.street,
          zipCode: employee.zipCode,
          city: employee.city,
          country: employee.country,
        },
        birthDate: employee.dateOfBirth,
        nationality: employee.nationality,
        maritalStatus: employee.maritalStatus,
        children: employee.children,
        religion: employee.religion,
      },
      employmentData: {
        contractStart: employee.contractStart,
        contractEnd: employee.contractEnd,
        employmentType: employee.employmentType,
        position: employee.position,
        department: employee.department,
        weeklyHours: employee.weeklyHours,
        vacationDays: employee.vacationDays,
      },
      financialData: {
        bankName: employee.bankName,
        iban: employee.iban,
        hourlyRate: employee.hourlyRateBase,
        taxClass: employee.taxClass,
        healthInsurance: employee.healthInsurance,
      },
      qualifications: employee.qualifications.map((q: any) => ({
        name: q.qualification.name,
        obtainedDate: q.obtainedDate,
        expiryDate: q.expiryDate,
      })),
      workHistory: {
        totalDeployments: employee.deployments.length,
        totalTimeRecords: employee.timeRecords.length,
        firstDeployment: employee.deployments[0]?.date,
        lastDeployment: employee.deployments[employee.deployments.length - 1]?.date,
      },
      exportDate: new Date(),
      exportReason: 'DSGVO Art. 15 - Auskunftsantrag',
    };
  }

  /**
   * DSGVO: Löschkonzept (Art. 17 DSGVO)
   */
  async processDeletionRequest(tenantId: string, request: DeletionRequest): Promise<{
    deletedRecords: number;
    retainedRecords: number;
    retentionPeriod: string;
  }> {
    const { employeeId, reason, retainPeriod = 120 } = request; // 10 Jahre = 120 Monate
    const now = new Date();
    const retentionDate = new Date(now);
    retentionDate.setMonth(retentionDate.getMonth() + retainPeriod);

    // Prüfe ob noch aktive Einsätze/Verträge existieren
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: {
        deployments: { where: { date: { gte: now }, status: { not: 'cancelled' } } },
        timeRecords: { where: { date: { gte: now } } },
      },
    });

    if (!employee) throw new Error('Mitarbeiter nicht gefunden');

    if (employee.deployments.length > 0 || employee.timeRecords.length > 0) {
      throw new Error('Mitarbeiter hat noch aktive Einsätze/Zeiterfassungen');
    }

    // Soft-Delete (für Aufbewahrungsfrist)
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        deletedAt: now,
        status: 'terminated',
        notes: `${employee.notes || ''}\n[DSGVO-Löschung: ${now.toISOString()}, Grund: ${reason}, Aufbewahrung bis: ${retentionDate.toISOString()}]`.trim(),
      },
    });

    // Anonymisiere sensible Daten nach Aufbewahrungsfrist
    // TODO: Cron-Job für automatische Anonymisierung

    logger.info(`DSGVO-Löschung: MA ${employeeId}, Grund: ${reason}, Aufbewahrung bis: ${retentionDate}`);

    return {
      deletedRecords: 1,
      retainedRecords: 1, // Soft-deleted für Aufbewahrung
      retentionPeriod: retentionDate.toISOString(),
    };
  }

  /**
   * GoBD: Aufbewahrungsfristen prüfen
   */
  async checkRetentionCompliance(tenantId: string): Promise<{
    invoices: { id: string; date: Date; retentionUntil: Date; status: string }[];
    timeRecords: { id: string; date: Date; retentionUntil: Date; status: string }[];
  }> {
    const now = new Date();
    const tenYearsAgo = new Date(now);
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    // Rechnungen (10 Jahre Aufbewahrung)
    const invoices = await prisma.customerInvoice.findMany({
      where: { tenantId, invoiceDate: { lte: tenYearsAgo } },
      select: { id: true, invoiceDate: true, status: true },
    });

    // Zeitnachweise (10 Jahre Aufbewahrung)
    const timeRecords = await prisma.timeRecord.findMany({
      where: { tenantId, date: { lte: tenYearsAgo }, status: 'locked' },
      select: { id: true, date: true },
    });

    return {
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        date: inv.invoiceDate,
        retentionUntil: new Date(inv.invoiceDate.getFullYear() + 10, 11, 31),
        status: 'can_be_archived',
      })),
      timeRecords: timeRecords.map((tr: any) => ({
        id: tr.id,
        date: tr.date,
        retentionUntil: new Date(tr.date.getFullYear() + 10, 11, 31),
        status: 'can_be_archived',
      })),
    };
  }

  // ═══════════════════════════════════════════════════
  // HELPER-METHODEN
  // ═══════════════════════════════════════════════════

  private calculateDailyHours(deployments: any[], timeRecords: any[]): Record<string, number> {
    const dailyHours: Record<string, number> = {};

    for (const dep of deployments) {
      const date = dep.date.toISOString().split('T')[0];
      const start = new Date(`${date}T${dep.startTime.toISOString().split('T')[1]}`);
      const end = new Date(`${date}T${dep.endTime.toISOString().split('T')[1]}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      dailyHours[date] = (dailyHours[date] || 0) + hours;
    }

    return dailyHours;
  }

  private checkBreakCompliance(timeRecords: any[]): any[] {
    const violations: any[] = [];

    for (const tr of timeRecords) {
      if (!tr.clockOut) continue;

      const start = new Date(tr.clockIn);
      const end = new Date(tr.clockOut);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const breakMinutes = tr.breakDuration || 0;

      // §4 ArbZG: >6h: 30min Pause, >9h: 45min Pause
      if (durationMinutes > 360 && breakMinutes < 30) { // >6h
        violations.push({
          date: tr.date,
          duration: durationMinutes,
          break: breakMinutes,
          required: 30,
        });
      } else if (durationMinutes > 540 && breakMinutes < 45) { // >9h
        violations.push({
          date: tr.date,
          duration: durationMinutes,
          break: breakMinutes,
          required: 45,
        });
      }
    }

    return violations;
  }

  private checkRestTimeCompliance(deployments: any[]): any[] {
    const violations: any[] = [];
    const sorted = [...deployments].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      const prevEnd = new Date(`${prev.date.toISOString().split('T')[0]}T${prev.endTime.toISOString().split('T')[1]}`);
      const currStart = new Date(`${curr.date.toISOString().split('T')[0]}T${curr.startTime.toISOString().split('T')[1]}`);

      const restHours = (currStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60);

      if (restHours < 11) {
        violations.push({
          date: curr.date,
          restHours: restHours.toFixed(1),
          required: 11,
        });
      }
    }

    return violations;
  }

  private checkSundayWork(deployments: any[]): number {
    return deployments.filter(d => d.date.getDay() === 0).length;
  }

  private checkNightWork(deployments: any[]): number {
    return deployments.filter(d => {
      const start = new Date(`${d.date.toISOString().split('T')[0]}T${d.startTime.toISOString().split('T')[1]}`);
      const end = new Date(`${d.date.toISOString().split('T')[0]}T${d.endTime.toISOString().split('T')[1]}`);
      const startHour = start.getHours();
      const endHour = end.getHours();
      return startHour >= 20 || endHour <= 6;
    }).length;
  }
}

export const complianceService = new ComplianceService();
