import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * PDF Export Service
 * Generiert PDFs für Berichte, Rechnungen, etc.
 */

export class PdfExportService {
  /**
   * Generiert HTML für einen Bericht (wird dann zu PDF konvertiert)
   */
  generateReportHtml(title: string, data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #2563eb; color: white; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .summary { background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
    .metric-label { font-size: 14px; color: #666; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
    .critical { color: #dc2626; font-weight: bold; }
    .warning { color: #f59e0b; font-weight: bold; }
    .success { color: #10b981; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Erstellt am: ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
  ${data}
  <div class="footer">
    <p>SMS - Security Management System | Generiert am ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generiert HTML für Tenant-Bericht
   */
  generateTenantReport(tenant: any, stats: any): string {
    const content = `
      <div class="summary">
        <h2>Tenant-Informationen</h2>
        <table>
          <tr><th>Firma</th><td>${tenant.companyName}</td></tr>
          <tr><th>Tenant-ID</th><td>${tenant.tenantId}</td></tr>
          <tr><th>Lizenz-Status</th><td class="${tenant.licenseStatus === 'ACTIVE' ? 'success' : 'critical'}">${tenant.licenseStatus}</td></tr>
          <tr><th>Mitarbeiter-Limit</th><td>${tenant.employeeLimit || 'Unbegrenzt'}</td></tr>
          <tr><th>Erstellt am</th><td>${new Date(tenant.createdAt).toLocaleDateString('de-DE')}</td></tr>
        </table>
      </div>

      <h2>Statistiken</h2>
      <div>
        <div class="metric">
          <div class="metric-value">${stats.employees || 0}</div>
          <div class="metric-label">Mitarbeiter</div>
        </div>
        <div class="metric">
          <div class="metric-value">${stats.customers || 0}</div>
          <div class="metric-label">Kunden</div>
        </div>
        <div class="metric">
          <div class="metric-value">${stats.objects || 0}</div>
          <div class="metric-label">Objekte</div>
        </div>
        <div class="metric">
          <div class="metric-value">€${(stats.revenue || 0).toFixed(2)}</div>
          <div class="metric-label">Umsatz (Monat)</div>
        </div>
      </div>

      <h2>Aktivität</h2>
      <table>
        <tr><th>Metrik</th><th>Wert</th></tr>
        <tr><td>Letzte Aktivität</td><td>${stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString('de-DE') : 'Keine'}</td></tr>
        <tr><td>Logins (30 Tage)</td><td>${stats.loginCount || 0}</td></tr>
        <tr><td>Erstellte Einsätze (30 Tage)</td><td>${stats.deploymentCount || 0}</td></tr>
      </table>
    `;

    return this.generateReportHtml(`Tenant-Bericht: ${tenant.companyName}`, content);
  }

  /**
   * Generiert HTML für Umsatzbericht
   */
  generateRevenueReport(stats: any): string {
    const content = `
      <div class="summary">
        <h2>Umsatzübersicht</h2>
        <div>
          <div class="metric">
            <div class="metric-value">€${(stats.mrr || 0).toFixed(2)}</div>
            <div class="metric-label">MRR</div>
          </div>
          <div class="metric">
            <div class="metric-value">€${(stats.arr || 0).toFixed(2)}</div>
            <div class="metric-label">ARR</div>
          </div>
          <div class="metric">
            <div class="metric-value">${stats.totalTenants || 0}</div>
            <div class="metric-label">Aktive Tenants</div>
          </div>
        </div>
      </div>

      <h2>Detaillierte Statistiken</h2>
      <table>
        <tr><th>Kategorie</th><th>Wert</th></tr>
        <tr><td>Neue Subscriptions (Monat)</td><td>${stats.newSubscriptions || 0}</td></tr>
        <tr><td>Gekündigte Subscriptions (Monat)</td><td class="critical">${stats.canceledSubscriptions || 0}</td></tr>
        <tr><td>Gesamtzahlungen (Monat)</td><td>€${(stats.totalPayments || 0).toFixed(2)}</td></tr>
        <tr><td>Anzahl Zahlungen</td><td>${stats.paymentCount || 0}</td></tr>
        <tr><td>Net New MRR</td><td class="${stats.netNewMRR >= 0 ? 'success' : 'critical'}">€${(stats.netNewMRR || 0).toFixed(2)}</td></tr>
      </table>
    `;

    return this.generateReportHtml('Umsatzbericht', content);
  }

  /**
   * Generiert HTML für kritische Berichte
   */
  generateCriticalReportsReport(reports: any[]): string {
    const reportRows = reports.map(report => `
      <tr>
        <td class="${report.severity === 'critical' ? 'critical' : report.severity === 'warning' ? 'warning' : ''}">${report.severity.toUpperCase()}</td>
        <td>${report.title}</td>
        <td>${report.type}</td>
        <td>${report.affectedCount}</td>
        <td>${report.suggestions.length} Vorschläge</td>
      </tr>
    `).join('');

    const content = `
      <div class="summary">
        <h2>Zusammenfassung</h2>
        <div>
          <div class="metric">
            <div class="metric-value">${reports.length}</div>
            <div class="metric-label">Gesamt</div>
          </div>
          <div class="metric">
            <div class="metric-value critical">${reports.filter(r => r.severity === 'critical').length}</div>
            <div class="metric-label">Kritisch</div>
          </div>
          <div class="metric">
            <div class="metric-value warning">${reports.filter(r => r.severity === 'warning').length}</div>
            <div class="metric-label">Warnungen</div>
          </div>
        </div>
      </div>

      <h2>Kritische Berichte</h2>
      <table>
        <tr>
          <th>Schweregrad</th>
          <th>Titel</th>
          <th>Typ</th>
          <th>Betroffen</th>
          <th>Lösungen</th>
        </tr>
        ${reportRows}
      </table>

      <h2>Empfohlene Maßnahmen</h2>
      ${reports.flatMap(r => r.suggestions).map(s => `
        <div style="margin: 10px 0; padding: 10px; background: #f8fafc; border-left: 3px solid #2563eb;">
          <strong>${s.title}</strong> (${s.priority})<br>
          ${s.description}
        </div>
      `).join('')}
    `;

    return this.generateReportHtml('Kritische Berichte & Lösungen', content);
  }

  /**
   * Gibt HTML als "PDF" zurück (Frontend kann es drucken)
   */
  async exportAsHtml(type: string, data: any): Promise<{ filename: string; html: string }> {
    let html = '';
    let filename = '';

    switch (type) {
      case 'tenant-report':
        html = this.generateTenantReport(data.tenant, data.stats);
        filename = `tenant-report-${data.tenant.tenantId}.html`;
        break;
      case 'revenue-report':
        html = this.generateRevenueReport(data);
        filename = `revenue-report-${new Date().toISOString().split('T')[0]}.html`;
        break;
      case 'critical-reports':
        html = this.generateCriticalReportsReport(data);
        filename = `critical-reports-${new Date().toISOString().split('T')[0]}.html`;
        break;
      default:
        throw new Error(`Unbekannter Export-Typ: ${type}`);
    }

    return { filename, html };
  }
}

export const pdfExportService = new PdfExportService();

/**
 * PDF Export Controller
 */
export class PdfExportController {
  /**
   * POST /api/platform/export/pdf
   */
  async exportPdf(req: Request, res: Response) {
    try {
      const { type, data } = req.body;

      if (!type) {
        return res.status(400).json({ error: 'Export-Typ erforderlich' });
      }

      // Daten generieren falls nicht übergeben
      let exportData = data;
      if (!exportData) {
        const { criticalReportsService } = await import('../services/criticalReports.service');
        
        switch (type) {
          case 'revenue-report':
            exportData = await criticalReportsService.getRevenueStats();
            break;
          case 'critical-reports':
            exportData = await criticalReportsService.generateAllReports();
            break;
          default:
            return res.status(400).json({ error: 'Daten erforderlich für diesen Typ' });
        }
      }

      const { filename, html } = await pdfExportService.exportAsHtml(type, exportData);

      res.json({
        success: true,
        data: { filename, html },
      });
    } catch (error) {
      logger.error('PDF Export Error:', error);
      res.status(500).json({ error: 'PDF-Export fehlgeschlagen' });
    }
  }
}

export const pdfExportController = new PdfExportController();
