import { prisma } from '../config/database';
import { logger } from '../config/logger';

export class LicenseService {
  /**
   * Prüft den Lizenzstatus eines Mandanten
   */
  async checkLicense(tenantId: string): Promise<{
    valid: boolean;
    status: string;
    message?: string;
    restrictions?: string[];
  }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return { valid: false, status: 'NOT_FOUND', message: 'Mandant nicht gefunden' };
    }

    // Offline-Kulanzzeit prüfen
    if (tenant.offlineSince) {
      const offlineMinutes = (Date.now() - tenant.offlineSince.getTime()) / (1000 * 60);
      if (offlineMinutes > tenant.offlineGraceMinutes) {
        return {
          valid: false,
          status: 'OFFLINE_LIMIT_EXCEEDED',
          message: 'Offline-Kulanzzeit überschritten',
        };
      }
    }

    // Lizenzstatus prüfen
    switch (tenant.licenseStatus) {
      case 'TEST':
      case 'ACTIVE': {
        // Prüfen ob Subscription noch gültig
        const subscription = tenant.subscriptions[0];
        if (subscription && subscription.currentPeriodEnd > new Date()) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { lastLicenseCheck: new Date() },
          });
          return { valid: true, status: tenant.licenseStatus };
        }
        return {
          valid: false,
          status: 'EXPIRED',
          message: 'Abonnement abgelaufen',
          restrictions: ['Keine neuen Einsätze', 'Keine neuen Mitarbeiter'],
        };
      }

      case 'PAYMENT_PENDING':
      case 'GRACE_PERIOD':
        return {
          valid: true,
          status: tenant.licenseStatus,
          message: 'Zahlung ausstehend - Kulanzfrist aktiv',
        };

      case 'RESTRICTED':
        return {
          valid: true,
          status: 'RESTRICTED',
          message: 'Eingeschränkter Zugriff',
          restrictions: ['Keine neuen Einsätze', 'Keine neuen Mitarbeiter', 'Keine neuen Dienstpläne'],
        };

      case 'SUSPENDED':
      case 'CANCELLED':
        return {
          valid: false,
          status: tenant.licenseStatus,
          message: 'Lizenz suspendiert',
          restrictions: ['Nur Lesezugriff', 'Export möglich'],
        };

      default:
        return { valid: false, status: 'UNKNOWN', message: 'Unbekannter Status' };
    }
  }

  /**
   * Automatische Lizenzprüfung für alle Mandanten
   */
  async runLicenseCheckJob() {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
    });

    let updated = 0;
    let suspended = 0;

    for (const tenant of tenants) {
      const result = await this.checkLicense(tenant.id);

      // Zahlungsfrist prüfen
      if (tenant.licenseStatus === 'PAYMENT_PENDING') {
        const gracePeriodEnd = new Date(tenant.updatedAt);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + tenant.paymentGraceDays);

        if (new Date() > gracePeriodEnd) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { licenseStatus: 'GRACE_PERIOD' },
          });
          updated++;
        }
      }

      // Grace Period abgelaufen → RESTRICTED
      if (tenant.licenseStatus === 'GRACE_PERIOD') {
        const gracePeriodEnd = new Date(tenant.updatedAt);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + tenant.paymentGraceDays * 2);

        if (new Date() > gracePeriodEnd) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { licenseStatus: 'RESTRICTED' },
          });
          updated++;
        }
      }

      // Restricted zu lange → SUSPENDED
      if (tenant.licenseStatus === 'RESTRICTED') {
        const restrictedSince = new Date(tenant.updatedAt);
        restrictedSince.setDate(restrictedSince.getDate() + 30);

        if (new Date() > restrictedSince) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { licenseStatus: 'SUSPENDED' },
          });
          suspended++;
        }
      }
    }

    logger.info(`Lizenzprüfung abgeschlossen: ${updated} aktualisiert, ${suspended} suspendiert`);
  }

  /**
   * Lizenz nach erfolgreicher Zahlung reaktivieren
   */
  async reactivateLicense(tenantId: string): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        licenseStatus: 'ACTIVE',
        lastLicenseCheck: new Date(),
        offlineSince: null,
      },
    });

    logger.info(`Lizenz reaktiviert: Tenant ${tenantId}`);
  }
}

export const licenseService = new LicenseService();
