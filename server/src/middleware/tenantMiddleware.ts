import { Request, Response, NextFunction } from 'express';
import { licenseService } from '../services/license.service';
import { prisma } from '../config/database';

/**
 * Middleware die sicherstellt, dass der Benutzer zu einem aktiven Mandanten gehört
 * und der Lizenzstatus geprüft wird.
 */
export async function tenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Auth-Routen benötigen keinen Tenant-Check (Login, Refresh, etc.)
    if (req.path.startsWith('/auth')) {
      next();
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Nicht angemeldet' });
      return;
    }

    // Tenant laden
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });

    if (!tenant) {
      res.status(403).json({ error: 'TENANT_NOT_FOUND', message: 'Mandant nicht gefunden' });
      return;
    }

    if (!tenant.isActive) {
      res.status(403).json({ error: 'TENANT_INACTIVE', message: 'Mandant ist deaktiviert' });
      return;
    }

    // Lizenz prüfen
    const license = await licenseService.checkLicense(tenant.id);

    // Tenant-Info an Request anhängen
    (req as any).tenantId = tenant.id;
    (req as any).tenant = tenant;
    (req as any).license = license;

    // Bei schreibenden Operationen: Lizenz-Beschränkungen prüfen
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!license.valid && license.status !== 'GRACE_PERIOD' && license.status !== 'RESTRICTED') {
        res.status(403).json({
          error: 'LICENSE_RESTRICTED',
          message: license.message || 'Lizenz eingeschränkt',
          restrictions: license.restrictions,
        });
        return;
      }

      // Spezifische Einschränkungen prüfen
      if (license.status === 'RESTRICTED') {
        const restrictedPaths = [
          '/employees',
          '/customers',
          '/objects',
          '/deployments',
        ];

        const isRestricted = restrictedPaths.some(path => req.path.startsWith(path));
        if (isRestricted && req.method === 'POST') {
          res.status(403).json({
            error: 'LICENSE_RESTRICTED',
            message: 'Erstellen neuer Daten ist bei eingeschränkter Lizenz nicht möglich',
            restrictions: license.restrictions,
          });
          return;
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware die automatisch tenantId zu Prisma-Queries hinzufügt
 */
export function withTenant<T extends { where?: any }>(query: T, tenantId: string): T {
  if (!query.where) {
    query.where = {};
  }
  query.where.tenantId = tenantId;
  return query;
}
