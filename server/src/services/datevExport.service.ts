import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { format } from 'date-fns';

const prisma = new PrismaClient();

/**
 * DATEV Export Service
 * Erstellt DATEV-kompatible Exporte für Lohnabrechnung und Buchhaltung
 */

export interface DatevEmployeeExport {
  // Stammdaten
  personalNumber: string;
  anreden: number; // 0=keine, 1=Herr, 2=Frau
  nachname: string;
  vorname: string;
  geburtsdatum: string; // TTMMJJJJ
  eintrittsdatum: string; // TTMMJJJJ
  austrittsdatum?: string;
  
  // Adresse
  strasse: string;
  plz: string;
  ort: string;
  
  // Steuer-IDs
  steuerIdNr?: string; // Steuer-ID
  sozialversicherungsnr?: string;
  
  // Bankverbindung
  iban?: string;
  bic?: string;
  
  // Beschäftigungsart
  beschaeftigungsart: number; // 1=Vollzeit, 2=Teilzeit, 3=Geringfügig, 4=Minijob, 5=Werkstudent
  stundenloehne?: number;
  monatsgehalt?: number;
  
  // Steuerklasse
  steuerklasse?: number; // 1-6
  freibetrag?: number;
  kinderfreibetraege?: number;
  
  // Sozialversicherung
  kvGruppe?: number; // Krankenversicherung
  pvGruppe?: number; // Pflegeversicherung
  rvGruppe?: number; // Rentenversicherung
  avGruppe?: number; // Arbeitslosenversicherung
}

export interface DatevTimeExport {
  personalNumber: string;
  datum: string; // TTMMJJJJ
  stunden: number;
  stundensatz?: number;
  betrag?: number;
  lohnart: number; // DATEV Lohnart
  bemerkung?: string;
}

export interface DatevAbschlagsExport {
  personalNumber: string;
  datum: string;
  betrag: number;
  lohnart: number;
  bezeichnung: string;
}

export class DatevExportService {
  /**
   * Exportiert Mitarbeiter-Stammdaten für DATEV
   */
  async exportEmployeeMasterData(tenantId: string, period: { month: number; year: number }) {
    const employees = await prisma.employee.findMany({
      where: {
        tenantId,
        status: 'active',
      },
    });

    const datevEmployees: DatevEmployeeExport[] = employees.map((emp: any) => {
      // Beschäftigungsart bestimmen
      let beschaeftigungsart = 1; // Vollzeit
      if (emp.employmentType === 'PART_TIME') beschaeftigungsart = 2;
      if (emp.employmentType === 'MINIJOB') beschaeftigungsart = 4;
      if (emp.employmentType === 'WORKING_STUDENT') beschaeftigungsart = 5;

      return {
        personalNumber: emp.personnelNumber,
        anreden: emp.gender === 'MALE' ? 1 : emp.gender === 'FEMALE' ? 2 : 0,
        nachname: emp.lastName,
        vorname: emp.firstName,
        geburtsdatum: emp.dateOfBirth ? format(new Date(emp.dateOfBirth), 'ddMMyyyy') : '',
        eintrittsdatum: format(new Date(emp.hireDate), 'ddMMyyyy'),
        austrittsdatum: emp.terminationDate ? format(new Date(emp.terminationDate), 'ddMMyyyy') : undefined,
        
        strasse: (emp.address as any)?.street || '',
        plz: (emp.address as any)?.zipCode || '',
        ort: (emp.address as any)?.city || '',
        
        steuerIdNr: emp.taxId || undefined,
        sozialversicherungsnr: (emp.socialInsurance as any)?.number || undefined,
        
        iban: (emp.bankDetails as any)?.iban || undefined,
        bic: (emp.bankDetails as any)?.bic || undefined,
        
        beschaeftigungsart,
        stundenloehne: emp.hourlyRateBase || undefined,
        monatsgehalt: emp.monthlySalary || undefined,
        
        steuerklasse: (emp.taxClass as any) || undefined,
        freibetrag: (emp.taxAllowances as any)?.amount || undefined,
        kinderfreibetraege: (emp.taxAllowances as any)?.children || 0,
        
        kvGruppe: (emp.socialInsurance as any)?.healthInsurance || undefined,
        pvGruppe: (emp.socialInsurance as any)?.careInsurance || undefined,
        rvGruppe: (emp.socialInsurance as any)?.pensionInsurance || undefined,
        avGruppe: (emp.socialInsurance as any)?.unemploymentInsurance || undefined,
      };
    });

    return datevEmployees;
  }

  /**
   * Exportiert Zeiterfassung für DATEV Lohnabrechnung
   */
  async exportTimeDataForDatev(tenantId: string, period: { month: number; year: number }) {
    const startDate = new Date(period.year, period.month - 1, 1);
    const endDate = new Date(period.year, period.month, 0);

    const timeEntries = await prisma.timeRecord.findMany({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'approved',
      },
      include: {
        employee: true,
      },
    });

    const datevTimeEntries: DatevTimeExport[] = timeEntries.map((entry: any) => {
      // Stundenart bestimmen (DATEV Lohnarten)
      let lohnart = 1; // Normaler Lohn
      if (entry.type === 'OVERTIME') lohnart = 2; // Überstunden
      if (entry.type === 'HOLIDAY') lohnart = 3; // Urlaub
      if (entry.type === 'SICK') lohnart = 4; // Krankheit
      if (entry.type === 'NIGHT') lohnart = 5; // Nachtzuschlag
      if (entry.type === 'WEEKEND') lohnart = 6; // Wochenendzuschlag
      if (entry.type === 'HOLIDAY_WORK') lohnart = 7; // Feiertagszuschlag

      const stunden = entry.hours;
      const stundensatz = entry.employee.hourlyRateBase || 0;
      const betrag = stunden * stundensatz;

      return {
        personalNumber: entry.employee.personnelNumber,
        datum: format(entry.date, 'ddMMyyyy'),
        stunden,
        stundensatz,
        betrag,
        lohnart,
        bemerkung: entry.notes || undefined,
      };
    });

    return datevTimeEntries;
  }

  /**
   * Exportiert Abschläge und Zuschläge für DATEV
   */
  async exportAllowancesForDatev(tenantId: string, period: { month: number; year: number }) {
    const startDate = new Date(period.year, period.month - 1, 1);
    const endDate = new Date(period.year, period.month, 0);

    const allowances = await prisma.allowance.findMany({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: true,
      },
    });

    const datevAllowances: DatevAbschlagsExport[] = allowances.map((allowance: any) => {
      // DATEV Lohnart für Zuschlag bestimmen
      let lohnart = 100; // Standard Zuschlag
      if (allowance.type === 'NIGHT_SHIFT') lohnart = 101;
      if (allowance.type === 'WEEKEND') lohnart = 102;
      if (allowance.type === 'HOLIDAY') lohnart = 103;
      if (allowance.type === 'DANGER') lohnart = 104;
      if (allowance.type === 'DIRT') lohnart = 105;

      return {
        personalNumber: allowance.employee.personnelNumber,
        datum: format(allowance.date, 'ddMMyyyy'),
        betrag: allowance.amount,
        lohnart,
        bezeichnung: allowance.description || allowance.type,
      };
    });

    return datevAllowances;
  }

  /**
   * Generiert DATEV CSV-Export für Mitarbeiter-Stammdaten
   * Format: DATEV Standard Export
   */
  generateDatevEmployeeCSV(employees: DatevEmployeeExport[]): string {
    const header = [
      'Personalnummer',
      'Anrede',
      'Nachname',
      'Vorname',
      'Geburtsdatum',
      'Eintrittsdatum',
      'Austrittsdatum',
      'Straße',
      'PLZ',
      'Ort',
      'Steuer-ID',
      'Sozialversicherungsnr',
      'IBAN',
      'BIC',
      'Beschäftigungsart',
      'Stundenlohn',
      'Monatsgehalt',
      'Steuerklasse',
      'Freibetrag',
      'Kinderfreibeträge',
      'KV-Gruppe',
      'PV-Gruppe',
      'RV-Gruppe',
      'AV-Gruppe',
    ].join(';');

    const rows = employees.map(emp => [
      emp.personalNumber,
      emp.anreden,
      emp.nachname,
      emp.vorname,
      emp.geburtsdatum,
      emp.eintrittsdatum,
      emp.austrittsdatum || '',
      emp.strasse,
      emp.plz,
      emp.ort,
      emp.steuerIdNr || '',
      emp.sozialversicherungsnr || '',
      emp.iban || '',
      emp.bic || '',
      emp.beschaeftigungsart,
      emp.stundenloehne || '',
      emp.monatsgehalt || '',
      emp.steuerklasse || '',
      emp.freibetrag || '',
      emp.kinderfreibetraege || 0,
      emp.kvGruppe || '',
      emp.pvGruppe || '',
      emp.rvGruppe || '',
      emp.avGruppe || '',
    ].join(';'));

    return [header, ...rows].join('\n');
  }

  /**
   * Generiert DATEV CSV-Export für Zeiterfassung/Lohnabrechnung
   */
  generateDatevTimeCSV(timeEntries: DatevTimeExport[]): string {
    const header = [
      'Personalnummer',
      'Datum',
      'Stunden',
      'Stundensatz',
      'Betrag',
      'Lohnart',
      'Bemerkung',
    ].join(';');

    const rows = timeEntries.map(entry => [
      entry.personalNumber,
      entry.datum,
      entry.stunden.toFixed(2),
      entry.stundensatz?.toFixed(2) || '',
      entry.betrag?.toFixed(2) || '',
      entry.lohnart,
      entry.bemerkung || '',
    ].join(';'));

    return [header, ...rows].join('\n');
  }

  /**
   * Generiert DATEV CSV-Export für Zuschläge
   */
  generateDatevAllowancesCSV(allowances: DatevAbschlagsExport[]): string {
    const header = [
      'Personalnummer',
      'Datum',
      'Betrag',
      'Lohnart',
      'Bezeichnung',
    ].join(';');

    const rows = allowances.map(allowance => [
      allowance.personalNumber,
      allowance.datum,
      allowance.betrag.toFixed(2),
      allowance.lohnart,
      allowance.bezeichnung,
    ].join(';'));

    return [header, ...rows].join('\n');
  }

  /**
   * Generiert kompletten DATEV-Export für einen Abrechnungszeitraum
   */
  async generateFullDatevExport(tenantId: string, period: { month: number; year: number }) {
    logger.info(`Generiere DATEV-Export für ${period.month}/${period.year}`);

    // Alle Daten exportieren
    const [employees, timeEntries, allowances] = await Promise.all([
      this.exportEmployeeMasterData(tenantId, period),
      this.exportTimeDataForDatev(tenantId, period),
      this.exportAllowancesForDatev(tenantId, period),
    ]);

    // CSV-Dateien generieren
    const employeeCSV = this.generateDatevEmployeeCSV(employees);
    const timeCSV = this.generateDatevTimeCSV(timeEntries);
    const allowancesCSV = this.generateDatevAllowancesCSV(allowances);

    // Zusammenfassung
    const summary = {
      period: `${period.month.toString().padStart(2, '0')}/${period.year}`,
      employeeCount: employees.length,
      timeEntryCount: timeEntries.length,
      allowanceCount: allowances.length,
      totalHours: timeEntries.reduce((sum, e) => sum + e.stunden, 0),
      totalAmount: timeEntries.reduce((sum, e) => sum + (e.betrag || 0), 0),
      totalAllowances: allowances.reduce((sum, a) => sum + a.betrag, 0),
    };

    logger.info(`DATEV-Export abgeschlossen: ${summary.employeeCount} Mitarbeiter, ${summary.totalHours} Stunden`);

    return {
      summary,
      files: {
        employeeMasterData: {
          filename: `DATEV_Stammdaten_${period.year}${period.month.toString().padStart(2, '0')}.csv`,
          content: employeeCSV,
          recordCount: employees.length,
        },
        timeData: {
          filename: `DATEV_Zeiterfassung_${period.year}${period.month.toString().padStart(2, '0')}.csv`,
          content: timeCSV,
          recordCount: timeEntries.length,
        },
        allowances: {
          filename: `DATEV_Zuschlaege_${period.year}${period.month.toString().padStart(2, '0')}.csv`,
          content: allowancesCSV,
          recordCount: allowances.length,
        },
      },
    };
  }

  /**
   * Validiert Mitarbeiter-Daten für DATEV-Export
   * Prüft ob alle erforderlichen Felder vorhanden sind
   */
  async validateEmployeeData(tenantId: string): Promise<{
    valid: boolean;
    errors: Array<{ employeeId: string; field: string; message: string }>;
  }> {
    const employees = await prisma.employee.findMany({
      where: { tenantId, status: 'active' },
    });

    const errors: Array<{ employeeId: string; field: string; message: string }> = [];

    for (const emp of employees) {
      // Pflichtfelder prüfen
      if (!emp.personnelNumber) {
        errors.push({ employeeId: emp.id, field: 'personnelNumber', message: 'Personalnummer erforderlich' });
      }
      if (!emp.taxId) {
        errors.push({ employeeId: emp.id, field: 'taxId', message: 'Steuer-ID erforderlich für DATEV' });
      }
      if (!emp.hourlyRateBase && !emp.monthlySalary) {
        errors.push({ employeeId: emp.id, field: 'hourlyRate/monthlySalary', message: 'Stundenlohn oder Monatsgehalt erforderlich' });
      }
      if (!emp.dateOfBirth) {
        errors.push({ employeeId: emp.id, field: 'dateOfBirth', message: 'Geburtsdatum erforderlich' });
      }
      if (!emp.hireDate) {
        errors.push({ employeeId: emp.id, field: 'hireDate', message: 'Eintrittsdatum erforderlich' });
      }

      // Bankverbindung prüfen (optional aber empfohlen)
      if (!(emp.bankDetails as any)?.iban) {
        errors.push({ employeeId: emp.id, field: 'bankDetails.iban', message: 'IBAN empfohlen für DATEV' });
      }

      // Sozialversicherungsnummer prüfen (pflicht für SV-pflichtige)
      if (emp.employmentType !== 'MINIJOB' && !(emp.socialInsurance as any)?.number) {
        errors.push({ employeeId: emp.id, field: 'socialInsurance.number', message: 'Sozialversicherungsnummer erforderlich' });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const datevExportService = new DatevExportService();
