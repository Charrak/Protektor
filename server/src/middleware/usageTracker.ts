import { Request, Response, NextFunction } from 'express';
import { usageTrackingService } from '../services/usageTracking.service';
import { logger } from '../config/logger';

/**
 * Middleware zum automatischen Tracken von API-Aufrufen
 */
export function trackApiUsage(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const tenantId = (req as any).tenantId;

  // Nach dem Response senden
  res.on('finish', () => {
    if (!tenantId) return;

    const duration = Date.now() - startTime;
    const path = req.path;
    const method = req.method;

    // Resource aus Path extrahieren
    const resource = extractResource(path);
    const action = extractAction(method);

    // Usage tracken (async, blockiert nicht)
    usageTrackingService
      .trackUsage({
        tenantId,
        resource: 'api-calls',
        action: action,
        count: 1,
        metadata: {
          path,
          method,
          duration,
          status: res.statusCode,
        },
      })
      .catch((err) => {
        logger.error('Usage-Tracking-Fehler:', err);
      });
  });

  next();
}

/**
 * Middleware zum Tracken von Create-Operationen (für Limit-Checks)
 */
export function trackCreateOperation(resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return next();
    }

    // Vor der Operation: Limit prüfen
    try {
      const limitCheck = await usageTrackingService.checkResourceLimit(tenantId, resource);

      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: 'Ressourcen-Limit erreicht',
          message: limitCheck.message,
          current: limitCheck.current,
          limit: limitCheck.limit,
        });
      }
    } catch (error) {
      logger.error('Limit-Check-Fehler:', error);
      // Bei Fehler trotzdem weitermachen (fail-open)
    }

    // Nach erfolgreicher Operation: Usage tracken
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        usageTrackingService
          .trackUsage({
            tenantId,
            resource,
            action: 'create',
            count: 1,
          })
          .catch((err) => {
            logger.error('Usage-Tracking-Fehler:', err);
          });
      }
    });

    next();
  };
}

/**
 * Hilfsfunktion: Resource aus Path extrahieren
 */
function extractResource(path: string): string {
  // z.B. /api/employees → employees
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return parts[1]; // Nach /api/
  }
  return 'unknown';
}

/**
 * Hilfsfunktion: Action aus HTTP-Methode ableiten
 */
function extractAction(method: string): string {
  const methodMap: Record<string, string> = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };
  return methodMap[method] || 'unknown';
}
