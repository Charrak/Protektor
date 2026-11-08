import { Request, Response, NextFunction } from 'express';
import { lockingService } from '../services/locking.service';

export class LockingController {
  async acquireLock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { resourceType, resourceId, sessionId } = req.body;

      if (!resourceType || !resourceId || !sessionId) {
        res.status(400).json({ error: 'resourceType, resourceId und sessionId erforderlich' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const result = await lockingService.acquireLock(
        resourceType,
        resourceId,
        req.user.id,
        sessionId
      );

      res.json({
        lockId: result.lock.id,
        status: result.status,
        expiresAt: result.lock.expiresAt,
      });
    } catch (error: any) {
      if (error.message === 'LOCK_CONFLICT') {
        res.status(409).json({
          error: 'LOCK_CONFLICT',
          lock: error.conflictLock,
        });
        return;
      }
      next(error);
    }
  }

  async heartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      const lock = await lockingService.heartbeat(id, req.user.id);

      res.json({
        lockId: lock.id,
        expiresAt: lock.expiresAt,
      });
    } catch (error) {
      next(error);
    }
  }

  async releaseLock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      await lockingService.releaseLock(req.params.id as string, req.user.id);
      res.json({ message: 'Sperre freigegeben' });
    } catch (error) {
      next(error);
    }
  }

  async getActiveLocks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = req.params.type as string;
      const id = req.params.id as string;
      const lock = await lockingService.getLockForResource(type, id);
      res.json(lock);
    } catch (error) {
      next(error);
    }
  }
}

export const lockingController = new LockingController();
