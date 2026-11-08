import { Request, Response } from 'express';
import { datevExportService } from '../services/datevExport.service';
import { logger } from '../config/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DatevController {
  /**
   * POST /api/v1/datev/export
   * Generiert DATEV-Export für einen Abrechnungszeitraum
   */
  async generateExport(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const { month, year } = req.body;

      if (!month || !year) {
        return res.status(400).json({
          error: 'Monat und Jahr sind erforderlich',
        });
      }

      if (month < 1 || month > 12) {
        return res.status(400).json({
          error: 'Ungültiger Monat',
        });
      }

      if (year < 2020 || year > 2030) {
        return res.status(400).json({
          error: 'Ungültiges Jahr',
        });
      }

      const exportData = await datevExportService.generateFullDatevExport(tenantId, {
        month: parseInt(month),
        year: parseInt(year),
      });

      // Export in Datenbank protokollieren
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: (req as any).user?.userId,
          action: 'DATEV_EXPORT',
          entityType: 'DatevExport',
          changes: exportData.summary,
          ipAddress: req.ip,
        },
      });

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      logger.error('DATEV-Export-Fehler:', error);
      res.status(500).json({
        error: 'DATEV-Export fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    }
  }

  /**
   * GET /api/v1/datev/export/:year/:month/download
   * Lädt DATEV-Export-Dateien herunter
   */
  async downloadExport(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const year = req.params.year as string;
      const month = req.params.month as string;

      const exportData = await datevExportService.generateFullDatevExport(tenantId, {
        month: parseInt(month),
        year: parseInt(year),
      });

      // Alle Dateien als ZIP oder einzeln zurückgeben
      const format = req.query.format as string || 'json';

      if (format === 'csv') {
        // CSV-Format: Erste Datei zurückgeben (Stammdaten)
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.files.employeeMasterData.filename}"`);
        res.send(exportData.files.employeeMasterData.content);
      } else {
        // JSON-Format
        res.json(exportData);
      }
    } catch (error) {
      logger.error('DATEV-Download-Fehler:', error);
      res.status(500).json({
        error: 'DATEV-Download fehlgeschlagen',
      });
    }
  }

  /**
   * GET /api/v1/datev/validate
   * Validiert Mitarbeiter-Daten für DATEV-Export
   */
  async validateData(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;

      const validation = await datevExportService.validateEmployeeData(tenantId);

      res.json({
        success: validation.valid,
        validation,
      });
    } catch (error) {
      logger.error('DATEV-Validation-Fehler:', error);
      res.status(500).json({
        error: 'Validierung fehlgeschlagen',
      });
    }
  }

  /**
   * GET /api/v1/datev/summary/:year/:month
   * Zeigt Zusammenfassung für DATEV-Export
   */
  async getSummary(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const year = req.params.year as string;
      const month = req.params.month as string;

      const [employees, timeEntries, allowances] = await Promise.all([
        datevExportService.exportEmployeeMasterData(tenantId, {
          month: parseInt(month),
          year: parseInt(year),
        }),
        datevExportService.exportTimeDataForDatev(tenantId, {
          month: parseInt(month),
          year: parseInt(year),
        }),
        datevExportService.exportAllowancesForDatev(tenantId, {
          month: parseInt(month),
          year: parseInt(year),
        }),
      ]);

      const summary = {
        period: `${month}/${year}`,
        employeeCount: employees.length,
        timeEntryCount: timeEntries.length,
        allowanceCount: allowances.length,
        totalHours: timeEntries.reduce((sum, e) => sum + e.stunden, 0),
        totalAmount: timeEntries.reduce((sum, e) => sum + (e.betrag || 0), 0),
        totalAllowances: allowances.reduce((sum, a) => sum + a.betrag, 0),
        grandTotal: timeEntries.reduce((sum, e) => sum + (e.betrag || 0), 0) + 
                    allowances.reduce((sum, a) => sum + a.betrag, 0),
      };

      res.json({
        success: true,
        summary,
      });
    } catch (error) {
      logger.error('DATEV-Summary-Fehler:', error);
      res.status(500).json({
        error: 'Zusammenfassung konnte nicht geladen werden',
      });
    }
  }
}

export const datevController = new DatevController();
