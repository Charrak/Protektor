import { prisma } from '../config/database';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { broadcastToResource } from '../config/websocket';

export interface LockInfo {
  id: string;
  resourceType: string;
  resourceId: string;
  lockedBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: { name: string; slug: string };
  };
  acquiredAt: Date;
  heartbeatAt: Date;
  expiresAt: Date;
  status: string;
}

export class LockingService {
  /**
   * Sperre anfordern
   */
  async acquireLock(
    resourceType: string,
    resourceId: string,
    userId: string,
    sessionId: string
  ): Promise<{ status: 'acquired' | 'refreshed'; lock: LockInfo }> {
    return await prisma.$transaction(async (tx: any) => {
      // Aktive Sperre für diese Ressource suchen
      const existingLock = await tx.lock.findFirst({
        where: {
          resourceType,
          resourceId,
          status: 'active',
          heartbeatAt: { gte: new Date(Date.now() - config.lockTimeoutMs) },
        },
        include: {
          lockedBy: {
            include: { role: true },
          },
        },
      });

      if (existingLock) {
        // Eigene Sperre?
        if (existingLock.lockedBy.id === userId) {
          const updated = await tx.lock.update({
            where: { id: existingLock.id },
            data: {
              heartbeatAt: new Date(),
              expiresAt: new Date(Date.now() + config.lockTimeoutMs),
            },
            include: { lockedBy: { include: { role: true } } },
          });
          return { status: 'refreshed' as const, lock: updated as LockInfo };
        }

        // Fremde Sperre – Konflikt
        const error = new Error('LOCK_CONFLICT') as any;
        error.conflictLock = {
          lockedBy: {
            name: `${existingLock.lockedBy.firstName} ${existingLock.lockedBy.lastName}`,
            role: existingLock.lockedBy.role.name,
          },
          acquiredAt: existingLock.acquiredAt,
          expiresAt: existingLock.expiresAt,
        };
        error.statusCode = 409;
        throw error;
      }

      // Abgelaufene Sperren aufräumen
      await tx.lock.updateMany({
        where: {
          resourceType,
          resourceId,
          status: 'active',
          heartbeatAt: { lt: new Date(Date.now() - config.lockTimeoutMs) },
        },
        data: { status: 'expired', releasedAt: new Date() },
      });

      // Neue Sperre erstellen
      const lock = await tx.lock.create({
        data: {
          resourceType,
          resourceId,
          lockedById: userId,
          sessionId,
          heartbeatAt: new Date(),
          expiresAt: new Date(Date.now() + config.lockTimeoutMs),
          status: 'active',
        },
        include: { lockedBy: { include: { role: true } } },
      });

      // WebSocket-Benachrichtigung
      broadcastToResource('lock:acquired', {
        lockId: lock.id,
        resourceType: lock.resourceType,
        resourceId: lock.resourceId,
        user: {
          name: `${lock.lockedBy.firstName} ${lock.lockedBy.lastName}`,
          role: lock.lockedBy.role.name,
        },
        acquiredAt: lock.acquiredAt,
        expiresAt: lock.expiresAt,
      }, resourceType, resourceId);

      return { status: 'acquired' as const, lock: lock as LockInfo };
    });
  }

  /**
   * Heartbeat senden
   */
  async heartbeat(lockId: string, userId: string): Promise<LockInfo> {
    const lock = await prisma.lock.findUnique({ where: { id: lockId } });

    if (!lock) {
      throw Object.assign(new Error('Sperre nicht gefunden'), { statusCode: 404 });
    }

    if (lock.lockedById !== userId) {
      throw Object.assign(new Error('Sperre gehört einem anderen Benutzer'), { statusCode: 403 });
    }

    if (lock.status !== 'active') {
      throw Object.assign(new Error('Sperre ist nicht mehr aktiv'), { statusCode: 409 });
    }

    const updated = await prisma.lock.update({
      where: { id: lockId },
      data: {
        heartbeatAt: new Date(),
        expiresAt: new Date(Date.now() + config.lockTimeoutMs),
      },
      include: { lockedBy: { include: { role: true } } },
    });

    return updated as LockInfo;
  }

  /**
   * Sperre freigeben
   */
  async releaseLock(lockId: string, userId: string): Promise<void> {
    const lock = await prisma.lock.findUnique({ where: { id: lockId } });

    if (!lock) return; // Idempotent

    if (lock.lockedById !== userId && userId !== 'system') {
      throw Object.assign(new Error('Sperre gehört einem anderen Benutzer'), { statusCode: 403 });
    }

    await prisma.lock.update({
      where: { id: lockId },
      data: {
        status: 'released',
        releasedAt: new Date(),
      },
    });

    // WebSocket-Benachrichtigung
    broadcastToResource('lock:released', {
      lockId: lock.id,
      resourceType: lock.resourceType,
      resourceId: lock.resourceId,
    }, lock.resourceType, lock.resourceId);
  }

  /**
   * Aktive Sperren für eine Ressource abrufen
   */
  async getLockForResource(resourceType: string, resourceId: string): Promise<LockInfo | null> {
    const lock = await prisma.lock.findFirst({
      where: {
        resourceType,
        resourceId,
        status: 'active',
        heartbeatAt: { gte: new Date(Date.now() - config.lockTimeoutMs) },
      },
      include: { lockedBy: { include: { role: true } } },
    });
    return lock as LockInfo | null;
  }

  /**
   * Prüfen ob eine Ressource gesperrt ist (für Middleware)
   */
  async isLocked(resourceType: string, resourceId: string, userId: string): Promise<{ locked: boolean; lock?: LockInfo }> {
    const lock = await this.getLockForResource(resourceType, resourceId);

    if (!lock) return { locked: false };

    // Eigene Sperre?
    if (lock.lockedBy.id === userId) return { locked: false };

    return { locked: true, lock };
  }

  /**
   * Alle abgelaufenen Sperren aufräumen
   */
  async cleanupExpiredLocks(): Promise<number> {
    const result = await prisma.lock.updateMany({
      where: {
        status: 'active',
        heartbeatAt: { lt: new Date(Date.now() - config.lockTimeoutMs) },
      },
      data: {
        status: 'expired',
        releasedAt: new Date(),
      },
    });

    if (result.count > 0) {
      logger.info(`${result.count} abgelaufene Sperren bereinigt`);
    }

    return result.count;
  }
}

export const lockingService = new LockingService();

// Cleanup-Job starten
let cleanupInterval: NodeJS.Timeout | null = null;

export function startLockCleanupJob(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(async () => {
    try {
      await lockingService.cleanupExpiredLocks();
    } catch (err) {
      logger.error('Lock-Cleanup-Fehler:', err);
    }
  }, config.lockCleanupIntervalMs);

  logger.info(`Lock-Cleanup-Job gestartet (alle ${config.lockCleanupIntervalMs / 1000}s)`);
}

export function stopLockCleanupJob(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
