import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export function auditLog(action: string, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Nur bei erfolgreichen Antworten loggen
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Asynchron loggen, um Response nicht zu blockieren
        setImmediate(async () => {
          try {
            await prisma.auditLog.create({
              data: {
                userId: req.user!.id,
                userName: `${req.user!.firstName} ${req.user!.lastName}`,
                sessionId: req.user!.sessionId,
                action,
                resourceType,
                resourceId: req.params.id || req.body?.id || '',
                oldValue: req.body?._oldValue || null,
                newValue: req.body || null,
                ipAddress: req.ip || req.socket.remoteAddress || '',
                userAgent: req.headers['user-agent'] || '',
              },
            });
          } catch (err) {
            logger.error('Audit-Log-Fehler:', err);
          }
        });
      }
      return originalJson(body);
    };

    next();
  };
}
