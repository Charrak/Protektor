import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../services/tenant.service';

export class TenantController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, page, limit } = req.query;
      const result = await tenantService.list({
        search: search as string,
        status: status as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const tenant = await tenantService.getById(id);
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformAdmin) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const { companyName, contactEmail } = req.body;

      if (!companyName || !contactEmail) {
        res.status(400).json({ error: 'Firmenname und Kontakt-E-Mail sind erforderlich' });
        return;
      }

      const tenant = await tenantService.create(req.body, req.platformAdmin.id);
      res.status(201).json(tenant);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformAdmin) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      const tenant = await tenantService.update(id, req.body, req.platformAdmin.id);
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }

  async updateLicenseStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformAdmin) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ error: 'Status erforderlich' });
        return;
      }

      const tenant = await tenantService.updateLicenseStatus(id, status, req.platformAdmin.id);
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await tenantService.getDashboard();
      res.json(dashboard);
    } catch (error) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();
