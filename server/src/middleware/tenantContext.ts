import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Tenant-Context Middleware
 * Extrahiert den Mandanten aus dem License-Key oder JWT und fügt ihn dem Request hinzu
 */
export async function tenantContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // License-Key aus Header
    const licenseKey = req.headers['x-license-key'] as string;

    if (!licenseKey) {
      res.status(401).json({ error: 'Lizenzschlüssel erforderlich (X-License-Key Header)' });
      return;
    }

    // Tenant finden
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { tenantId: licenseKey },
          { licenseKey },
        ],
        isActive: true,
      },
    });

    if (!tenant) {
      res.status(404).json({ error: 'Mandant nicht gefunden oder inaktiv' });
      return;
    }

    // Lizenzstatus prüfen
    const restrictedStatuses = ['SUSPENDED', 'CANCELLED'];
    if (restrictedStatuses.includes(tenant.licenseStatus)) {
      res.status(403).json({
        error: 'Zugriff verweigert',
        message: `Lizenzstatus: ${tenant.licenseStatus}`,
        restrictions: ['Nur Lesezugriff', 'Export möglich'],
      });
      return;
    }

    // Offline-Status aktualisieren
    if (tenant.offlineSince) {
      // Tenant ist wieder online
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          offlineSince: null,
          lastLicenseCheck: new Date(),
        },
      });
    } else {
      // Last License Check aktualisieren
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { lastLicenseCheck: new Date() },
      });
    }

    // Tenant-Context an Request anhängen
    (req as any).tenantId = tenant.id;
    (req as any).tenant = {
      id: tenant.id,
      tenantId: tenant.tenantId,
      licenseStatus: tenant.licenseStatus,
      employeeLimit: tenant.employeeLimit,
      featureFlags: tenant.featureFlags,
    };

    next();
  } catch (error) {
    logger.error('Tenant-Context-Fehler:', error);
    next(error);
  }
}

/**
 * Prüft ob der Mandant bestimmte Aktionen durchführen darf
 */
export function requireLicenseFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenant = (req as any).tenant;

    if (!tenant) {
      res.status(401).json({ error: 'Kein Tenant-Context vorhanden' });
      return;
    }

    // Feature-Flags prüfen
    const featureFlags = tenant.featureFlags || {};

    // Standard-Features (immer verfügbar)
    const defaultFeatures = ['scheduling', 'timeTracking', 'billing'];

    if (!defaultFeatures.includes(feature) && !featureFlags[feature]) {
      res.status(403).json({
        error: 'Feature nicht verfügbar',
        message: `Das Feature "${feature}" ist in Ihrem Abonnement nicht enthalten`,
      });
      return;
    }

    next();
  };
}

/**
 * Prüft ob der Mandant das Mitarbeiter-Limit nicht überschritten hat
 */
export async function checkEmployeeLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenant = (req as any).tenant;

    if (!tenant) {
      res.status(401).json({ error: 'Kein Tenant-Context vorhanden' });
      return;
    }

    // Mitarbeiter-Anzahl zählen
    const employeeCount = await prisma.employee.count({
      where: { tenantId: tenant.id },
    });

    if (tenant.employeeLimit && employeeCount >= tenant.employeeLimit) {
      res.status(403).json({
        error: 'Mitarbeiter-Limit erreicht',
        message: `Sie haben das Limit von ${tenant.employeeLimit} Mitarbeitern erreicht. Bitte upgraden Sie Ihr Abonnement.`,
        currentCount: employeeCount,
        limit: tenant.employeeLimit,
      });
      return;
    }

    (req as any).employeeCount = employeeCount;
    next();
  } catch (error) {
    logger.error('Employee-Limit-Check-Fehler:', error);
    next(error);
  }
}

/**
 * Prüft ob Schreibaktionen erlaubt sind (basierend auf Lizenzstatus)
 */
export function requireWriteAccess(req: Request, res: Response, next: NextFunction): void {
  const tenant = (req as any).tenant;

  if (!tenant) {
    res.status(401).json({ error: 'Kein Tenant-Context vorhanden' });
    return;
  }

  // Status, die Schreibzugriff erlauben
  const writeAllowedStatuses = ['TEST', 'ACTIVE', 'PAYMENT_PENDING', 'GRACE_PERIOD'];

  if (!writeAllowedStatuses.includes(tenant.licenseStatus)) {
    res.status(403).json({
      error: 'Schreibzugriff verweigert',
      message: `Lizenzstatus "${tenant.licenseStatus}" erlaubt keine Änderungen`,
      restrictions: [
        'Keine neuen Einsätze',
        'Keine neuen Mitarbeiter',
        'Keine neuen Dienstpläne',
        'Nur Lesezugriff und Export',
      ],
    });
    return;
  }

  next();
}
