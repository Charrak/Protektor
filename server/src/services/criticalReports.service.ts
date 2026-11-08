import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { developerSettingsService } from './developerSettings.service';
import { subDays, startOfDay, endOfDay } from 'date-fns';

/**
 * Critical Reports Service
 * Generiert kritische Berichte mit Lösungsvorschlägen
 */

export interface CriticalReport {
  id: string;
  type: 'payment' | 'license' | 'security' | 'performance' | 'revenue' | 'churn';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: string;
  affectedCount: number;
  suggestions: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
  }>;
  metrics?: any;
  createdAt: Date;
  resolvedAt?: Date;
}

export class CriticalReportsService {
  /**
   * Generiert alle kritischen Berichte
   */
  async generateAllReports(): Promise<CriticalReport[]> {
    const reports: CriticalReport[] = [];

    // Parallel alle Berichte generieren
    const [
      paymentReports,
      licenseReports,
      securityReports,
      revenueReports,
      churnReports,
    ] = await Promise.all([
      this.generatePaymentReports(),
      this.generateLicenseReports(),
      this.generateSecurityReports(),
      this.generateRevenueReports(),
      this.generateChurnReports(),
    ]);

    reports.push(...paymentReports, ...licenseReports, ...securityReports, ...revenueReports, ...churnReports);

    // Nach Severity sortieren
    return reports.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Zahlungsprobleme
   */
  private async generatePaymentReports(): Promise<CriticalReport[]> {
    const reports: CriticalReport[] = [];
    
    // Überfällige Zahlungen
    const overduePayments = await prisma.payment.count({
      where: {
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
    });

    if (overduePayments > 0) {
      reports.push({
        id: 'payment-overdue',
        type: 'payment',
        severity: overduePayments > 10 ? 'critical' : 'warning',
        title: `${overduePayments} überfällige Zahlungen`,
        description: `${overduePayments} Zahlungen sind überfällig und benötigen Aufmerksamkeit.`,
        impact: `Potenzieller Umsatzverlust: €${overduePayments * 99}`,
        affectedCount: overduePayments,
        suggestions: [
          {
            title: 'Automatische Mahnungen aktivieren',
            description: 'Richten Sie automatische Zahlungserinnerungen ein (nach 3, 7, 14 Tagen)',
            priority: 'high',
            effort: 'low',
          },
          {
            title: 'SEPA-Lastschrift einführen',
            description: 'Wechseln Sie zu SEPA-Lastschrift für automatischere Zahlungen',
            priority: 'high',
            effort: 'medium',
          },
          {
            title: 'Betroffene Kunden kontaktieren',
            description: 'Senden Sie persönliche Erinnerungsmails an alle betroffenen Kunden',
            priority: 'high',
            effort: 'medium',
          },
        ],
        createdAt: new Date(),
      });
    }

    // Gescheiterte Zahlungen
    const failedPayments = await prisma.payment.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: startOfDay(subDays(new Date(), 7)) },
      },
    });

    if (failedPayments > 0) {
      reports.push({
        id: 'payment-failed',
        type: 'payment',
        severity: 'critical',
        title: `${failedPayments} gescheiterte Zahlungen (letzte 7 Tage)`,
        description: `${failedPayments} Zahlungsversuche sind in den letzten 7 Tagen fehlgeschlagen.`,
        impact: 'Sofortige Handlung erforderlich - Kunden könnten abwandern',
        affectedCount: failedPayments,
        suggestions: [
          {
            title: 'Zahlungsmethoden prüfen',
            description: 'Überprüfen Sie Stripe-Konfiguration und Webhooks',
            priority: 'high',
            effort: 'low',
          },
          {
            title: 'Alternative Zahlungsmethoden anbieten',
            description: 'Fügen Sie PayPal, Überweisung oder andere Methoden hinzu',
            priority: 'medium',
            effort: 'medium',
          },
        ],
        createdAt: new Date(),
      });
    }

    return reports;
  }

  /**
   * Lizenzprobleme
   */
  private async generateLicenseReports(): Promise<CriticalReport[]> {
    const reports: CriticalReport[] = [];
    
    // Test-Tenants die bald ablaufen
    const expiringTrials = await prisma.tenant.count({
      where: {
        licenseStatus: 'TEST',
        createdAt: {
          gte: startOfDay(subDays(new Date(), 25)),
          lte: startOfDay(subDays(new Date(), 30)),
        },
      },
    });

    if (expiringTrials > 0) {
      reports.push({
        id: 'license-trial-expiring',
        type: 'license',
        severity: 'warning',
        title: `${expiringTrials} Testphasen enden bald`,
        description: `${expiringTrials} Test Tenants enden in den nächsten 5 Tagen.`,
        impact: 'Potenzielle Neukunden könnten verloren gehen',
        affectedCount: expiringTrials,
        suggestions: [
          {
            title: 'Automatische Erinnerungs-E-Mails senden',
            description: 'Senden Sie Erinnerungen 3 Tage vor Ablauf',
            priority: 'high',
            effort: 'low',
          },
          {
            title: 'Rabatt für schnelle Konvertierung anbieten',
            description: 'Bieten Sie 20% Rabatt für Jahresabo bei sofortiger Konvertierung',
            priority: 'medium',
            effort: 'low',
          },
          {
            title: 'Persönliche Follow-up Calls',
            description: 'Rufen Sie hochwertige Leads persönlich an',
            priority: 'high',
            effort: 'high',
          },
        ],
        createdAt: new Date(),
      });
    }

    // Suspended Tenants
    const suspended = await prisma.tenant.count({
      where: { licenseStatus: 'SUSPENDED' },
    });

    if (suspended > 0) {
      reports.push({
        id: 'license-suspended',
        type: 'license',
        severity: 'critical',
        title: `${suspended} gesperrte Tenants`,
        description: `${suspended} Tenants sind aktuell gesperrt und können das System nicht nutzen.`,
        impact: 'Umsatzverlust und unzufriedene Kunden',
        affectedCount: suspended,
        suggestions: [
          {
            title: 'Kunden kontaktieren',
            description: 'Senden Sie persönliche E-Mails mit Angebot zur Reaktivierung',
            priority: 'high',
            effort: 'medium',
          },
          {
            title: 'Ratenzahlungsplan anbieten',
            description: 'Bieten Sie flexible Zahlungsoptionen für säumige Zahler',
            priority: 'medium',
            effort: 'medium',
          },
        ],
        createdAt: new Date(),
      });
    }

    return reports;
  }

  /**
   * Sicherheitsprobleme
   */
  private async generateSecurityReports(): Promise<CriticalReport[]> {
    const reports: CriticalReport[] = [];
    
    // Fehlgeschlagene Login-Versuche
    const failedLogins = await prisma.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        createdAt: { gte: startOfDay(subDays(new Date(), 1)) },
      },
    });

    if (failedLogins > 50) {
      reports.push({
        id: 'security-failed-logins',
        type: 'security',
        severity: 'warning',
        title: `${failedLogins} fehlgeschlagene Login-Versuche (24h)`,
        description: 'Ungewöhnlich viele fehlgeschlagene Login-Versuche in den letzten 24 Stunden.',
        impact: 'Mögliche Brute-Force-Angriffe',
        affectedCount: failedLogins,
        suggestions: [
          {
            title: 'Rate Limiting verschärfen',
            description: 'Reduzieren Sie maximale Login-Versuche auf 3 pro 15 Minuten',
            priority: 'high',
            effort: 'low',
          },
          {
            title: '2FA für alle Benutzer aktivieren',
            description: 'Verpflichten Sie Zwei-Faktor-Authentifizierung',
            priority: 'high',
            effort: 'medium',
          },
        ],
        createdAt: new Date(),
      });
    }

    return reports;
  }

  /**
   * Umsatzberichte
   */
  private async generateRevenueReports(): Promise<CriticalReport[]> {
    const reports: CriticalReport[] = [];
    
    // MRR Vergleich zum Vormonat
    const currentMonth = await prisma.subscription.aggregate({
      where: {
        status: 'ACTIVE',
      },
      _sum: {
        monthlyRevenue: true,
      },
    });

    const lastMonth = subDays(new Date(), 30);
    const lastMonthRevenue = await prisma.subscription.aggregate({
      where: {
        status: 'ACTIVE',
        createdAt: { lt: lastMonth },
      },
      _sum: {
        monthlyRevenue: true,
      },
    });

    const currentMRR = Number(currentMonth._sum.monthlyRevenue || 0);
    const lastMRR = Number(lastMonthRevenue._sum.monthlyRevenue || 0);
    const change = lastMRR > 0 ? ((currentMRR - lastMRR) / lastMRR) * 100 : 0;

    if (change < -10) {
      reports.push({
        id: 'revenue-decline',
        type: 'revenue',
        severity: 'critical',
        title: `Umsatzrückgang: ${change.toFixed(1)}%`,
        description: `Der MRR ist von €${lastMRR.toFixed(2)} auf €${currentMRR.toFixed(2)} gesunken.`,
        impact: `Monatlicher Verlust: €${(lastMRR - currentMRR).toFixed(2)}`,
        affectedCount: 0,
        suggestions: [
          {
            title: 'Churn-Analyse durchführen',
            description: 'Analysieren Sie welche Kunden abgewandert sind und warum',
            priority: 'high',
            effort: 'medium',
          },
          {
            title: 'Win-back Kampagne starten',
            description: 'Bieten Sie ehemaligen Kunden spezielle Rabatte an',
            priority: 'high',
            effort: 'medium',
          },
          {
            title: 'Upselling bei bestehenden Kunden',
            description: 'Bieten Sie Premium-Features und Add-ons an',
            priority: 'medium',
            effort: 'low',
          },
        ],
        metrics: {
          currentMRR,
          lastMRR,
          change,
        },
        createdAt: new Date(),
      });
    }

    return reports;
  }

  /**
   * Churn-Analyse
   */
  private async generateChurnReports(): Promise<CriticalReport[]> {
    const reports: CriticalReport[] = [];
    
    // Kündigungen der letzten 30 Tage
    const cancellations = await prisma.subscription.count({
      where: {
        status: 'CANCELED',
        canceledAt: { gte: startOfDay(subDays(new Date(), 30)) },
      },
    });

    const totalActive = await prisma.subscription.count({
      where: { status: 'ACTIVE' },
    });

    const churnRate = totalActive > 0 ? (cancellations / totalActive) * 100 : 0;

    if (churnRate > 5) {
      reports.push({
        id: 'churn-high',
        type: 'churn',
        severity: 'critical',
        title: `Hohe Churn-Rate: ${churnRate.toFixed(1)}%`,
        description: `${cancellations} Kunden haben in den letzten 30 Tagen gekündigt.`,
        impact: 'Signifikanter Umsatzverlust und Kundenverlust',
        affectedCount: cancellations,
        suggestions: [
          {
            title: 'Exit-Interviews durchführen',
            description: 'Befragen Sie gekündigte Kunden nach den Gründen',
            priority: 'high',
            effort: 'medium',
          },
          {
            title: 'Customer Success Programm starten',
            description: 'Implementieren Sie proaktive Kundenbetreuung',
            priority: 'high',
            effort: 'high',
          },
          {
            title: 'Produkt-Feedback einholen',
            description: 'Umfrage bei aktiven Kunden zu Verbesserungspotenzial',
            priority: 'medium',
            effort: 'medium',
          },
        ],
        metrics: {
          churnRate,
          cancellations,
          totalActive,
        },
        createdAt: new Date(),
      });
    }

    return reports;
  }

  /**
   * Umsatzstatistiken
   */
  async getRevenueStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Aktueller MRR
    const currentMRR = await prisma.subscription.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { monthlyRevenue: true },
    });

    // ARR
    const mrr = Number(currentMRR._sum.monthlyRevenue || 0);
    const arr = mrr * 12;

    // Neue Subscriptions diesen Monat
    const newSubscriptions = await prisma.subscription.count({
      where: {
        createdAt: { gte: startOfMonth },
        status: 'ACTIVE',
      },
    });

    // Gekündigte Subscriptions diesen Monat
    const canceledSubscriptions = await prisma.subscription.count({
      where: {
        canceledAt: { gte: startOfMonth },
        status: 'CANCELED',
      },
    });

    // Zahlungen diesen Monat
    const payments = await prisma.payment.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: 'COMPLETED',
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      mrr,
      arr,
      newSubscriptions,
      canceledSubscriptions,
      totalPayments: Number(payments._sum.amount || 0),
      paymentCount: payments._count,
      netNewMRR: (newSubscriptions - canceledSubscriptions) * 99, // Vereinfacht
    };
  }
}

export const criticalReportsService = new CriticalReportsService();
