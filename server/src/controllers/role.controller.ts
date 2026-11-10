import { Request, Response, NextFunction } from 'express';
import { roleService } from '../services/role.service';

export class RoleController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await roleService.list(req.user!.tenantId);
      res.json(roles);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const role = await roleService.getById(id, req.user!.tenantId);
      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, slug, description } = req.body;
      if (!name || !slug) {
        res.status(400).json({ error: 'Name und Slug sind erforderlich' });
        return;
      }
      const role = await roleService.create({ name, slug, description }, req.user!.tenantId);
      res.status(201).json(role);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { name, description } = req.body;
      const role = await roleService.update(id, req.user!.tenantId, { name, description });
      res.json(role);
    } catch (error) {
      next(error);
    }
  }

  async setPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { permissionIds } = req.body;
      if (!Array.isArray(permissionIds)) {
        res.status(400).json({ error: 'permissionIds muss ein Array sein' });
        return;
      }
      await roleService.setPermissions(id, req.user!.tenantId, permissionIds);
      res.json({ message: 'Berechtigungen aktualisiert' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await roleService.delete(id, req.user!.tenantId);
      res.json({ message: 'Rolle gelöscht' });
    } catch (error) {
      next(error);
    }
  }

  async listPermissions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permissions = await roleService.listAllPermissions();
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  }
}

export const roleController = new RoleController();
