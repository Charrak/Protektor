import { Request, Response, NextFunction } from 'express';
import { employeeTimePreferenceService } from '../services/employeeTimePreference.service';

export class EmployeeTimePreferenceController {
  /**
   * POST /employees/:employeeId/time-preferences
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { employeeId } = req.params;
      const tenantId = req.user.tenantId || req.user.id;

      const preference = await employeeTimePreferenceService.create(
        tenantId,
        employeeId,
        req.body
      );

      res.status(201).json({ success: true, data: preference });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /employees/:employeeId/time-preferences
   */
  async listByEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { employeeId } = req.params;
      const tenantId = req.user.tenantId || req.user.id;

      const preferences = await employeeTimePreferenceService.listByEmployee(
        tenantId,
        employeeId
      );

      res.json({ success: true, data: preferences });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /time-preferences/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const tenantId = req.user.tenantId || req.user.id;

      const preference = await employeeTimePreferenceService.update(
        tenantId,
        id,
        req.body
      );

      res.json({ success: true, data: preference });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /time-preferences/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const tenantId = req.user.tenantId || req.user.id;

      await employeeTimePreferenceService.delete(tenantId, id);

      res.json({ success: true, message: 'Zeitpräferenz gelöscht' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /employees/:employeeId/time-requests
   */
  async createTimeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { employeeId } = req.params;
      const tenantId = req.user.tenantId || req.user.id;

      const request = await employeeTimePreferenceService.createTimeRequest(
        tenantId,
        employeeId,
        req.body
      );

      res.status(201).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /employees/:employeeId/time-requests
   */
  async listTimeRequestsByEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { employeeId } = req.params;
      const tenantId = req.user.tenantId || req.user.id;

      const requests = await employeeTimePreferenceService.listTimeRequestsByEmployee(
        tenantId,
        employeeId
      );

      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /time-requests/:id/approve
   */
  async approveTimeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const tenantId = req.user.tenantId || req.user.id;
      const { approved, rejectionReason } = req.body;

      const request = await employeeTimePreferenceService.approveTimeRequest(
        tenantId,
        id,
        req.user.id,
        approved,
        rejectionReason
      );

      res.json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }
}

export const employeeTimePreferenceController = new EmployeeTimePreferenceController();
