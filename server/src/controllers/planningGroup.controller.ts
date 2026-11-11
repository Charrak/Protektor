import { Request, Response, NextFunction } from 'express';
import { planningGroupService } from '../services/planningGroup.service';

export class PlanningGroupController {
  /**
   * POST /planning-groups
   * Erstellt eine neue Planungsgruppe
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { name, description, color, leadUserId, leadDeputies, objectIds, employeeIds } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Name ist erforderlich' });
        return;
      }

      const group = await planningGroupService.create(
        req.user.tenantId || req.user.id,
        {
          name,
          description,
          color,
          leadUserId,
          leadDeputies: leadDeputies || [],
          objectIds: objectIds || [],
          employeeIds: employeeIds || []
        },
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: group
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /planning-groups
   * Listet alle Planungsgruppen
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      // Prüfe, ob User Admin ist oder alle Planungsgruppen sehen darf
      // Wenn nicht, filtere nach Teamleiter/Vertreter
      const isAdmin = req.user.role?.slug === 'admin' || req.user.role?.slug === 'planning-admin';
      const userId = isAdmin ? undefined : req.user.id;

      const groups = await planningGroupService.list(
        req.user.tenantId || req.user.id,
        userId
      );

      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /planning-groups/:id
   * Holt eine einzelne Planungsgruppe
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const group = await planningGroupService.getById(
        req.user.tenantId || req.user.id,
        id
      );

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /planning-groups/:id
   * Aktualisiert eine Planungsgruppe
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const { name, description, color, leadUserId, leadDeputies, isActive, objectIds, employeeIds } = req.body;

      // Berechtigungsprüfung
      await planningGroupService.checkEditPermission(
        req.user.tenantId || req.user.id,
        id,
        req.user.id,
        req.user.role?.slug
      );

      const group = await planningGroupService.update(
        req.user.tenantId || req.user.id,
        id,
        {
          name,
          description,
          color,
          leadUserId,
          leadDeputies: leadDeputies || [],
          isActive,
          objectIds,
          employeeIds
        }
      );

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /planning-groups/:id
   * Löscht eine Planungsgruppe (soft delete)
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      
      // Berechtigungsprüfung
      await planningGroupService.checkEditPermission(
        req.user.tenantId || req.user.id,
        id,
        req.user.id,
        req.user.role?.slug
      );
      
      await planningGroupService.delete(
        req.user.tenantId || req.user.id,
        id
      );

      res.json({
        success: true,
        message: 'Planungsgruppe wurde gelöscht'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /planning-groups/:id/objects
   * Fügt Objekte zu einer Planungsgruppe hinzu
   */
  async addObjects(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const { objectIds } = req.body;

      if (!objectIds || !Array.isArray(objectIds) || objectIds.length === 0) {
        res.status(400).json({ error: 'objectIds Array ist erforderlich' });
        return;
      }

      // Berechtigungsprüfung
      await planningGroupService.checkEditPermission(
        req.user.tenantId || req.user.id,
        id,
        req.user.id,
        req.user.role?.slug
      );

      const group = await planningGroupService.addObjects(
        req.user.tenantId || req.user.id,
        id,
        objectIds
      );

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /planning-groups/:id/employees
   * Fügt Mitarbeiter zu einer Planungsgruppe hinzu
   */
  async addEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const { employeeIds } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        res.status(400).json({ error: 'employeeIds Array ist erforderlich' });
        return;
      }

      // Berechtigungsprüfung
      await planningGroupService.checkEditPermission(
        req.user.tenantId || req.user.id,
        id,
        req.user.id,
        req.user.role?.slug
      );

      const group = await planningGroupService.addEmployees(
        req.user.tenantId || req.user.id,
        id,
        employeeIds
      );

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /planning-groups/:id/objects
   * Entfernt Objekte aus einer Planungsgruppe
   */
  async removeObjects(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const { objectIds } = req.body;

      if (!objectIds || !Array.isArray(objectIds) || objectIds.length === 0) {
        res.status(400).json({ error: 'objectIds Array ist erforderlich' });
        return;
      }

      // Berechtigungsprüfung
      await planningGroupService.checkEditPermission(
        req.user.tenantId || req.user.id,
        id,
        req.user.id,
        req.user.role?.slug
      );

      const group = await planningGroupService.removeObjects(
        req.user.tenantId || req.user.id,
        id,
        objectIds
      );

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /planning-groups/:id/employees
   * Entfernt Mitarbeiter aus einer Planungsgruppe
   */
  async removeEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
      }

      const { id } = req.params;
      const { employeeIds } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        res.status(400).json({ error: 'employeeIds Array ist erforderlich' });
        return;
      }

      // Berechtigungsprüfung
      await planningGroupService.checkEditPermission(
        req.user.tenantId || req.user.id,
        id,
        req.user.id,
        req.user.role?.slug
      );

      const group = await planningGroupService.removeEmployees(
        req.user.tenantId || req.user.id,
        id,
        employeeIds
      );

      res.json({
        success: true,
        data: group
      });
    } catch (error) {
      next(error);
    }
  }
}

export const planningGroupController = new PlanningGroupController();
