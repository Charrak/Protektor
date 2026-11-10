import { Request, Response, NextFunction } from 'express';
import { employeeService } from '../services/employee.service';

export class EmployeeController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, employmentType, page, limit } = req.query;
      const result = await employeeService.list({
        tenantId: req.user?.tenantId,
        search: search as string,
        status: status as any,
        employmentType: employmentType as any,
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
      const employee = await employeeService.getById(id);
      res.json(employee);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const { personnelNumber, firstName, lastName } = req.body;

      if (!personnelNumber || !firstName || !lastName) {
        res.status(400).json({ error: 'Personalnummer, Vorname und Nachname sind erforderlich' });
        return;
      }

      const employee = await employeeService.create(req.body, req.user.id, req.user.tenantId);
      
      // Trigger webhook event
      const { triggerWebhookEvent, WebhookEvents } = await import('../services/webhookExecution.service');
      triggerWebhookEvent(req.user.tenantId, WebhookEvents.EMPLOYEE_CREATED, {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        personnelNumber: employee.personnelNumber,
      }).catch(err => console.error('Webhook trigger failed:', err));
      
      res.status(201).json(employee);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      const employee = await employeeService.update(id, req.body, req.user.id);
      res.json(employee);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const id = req.params.id as string;
      await employeeService.delete(id, req.user.id);
      res.json({ message: 'Mitarbeiter deaktiviert' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Qualifikationen ───

  async addQualification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const employeeId = req.params.id as string;
      const { qualificationId, obtainedDate, expiryDate, certificateNumber, notes } = req.body;

      if (!qualificationId || !obtainedDate) {
        res.status(400).json({ error: 'Qualifikation und Erstellungsdatum sind erforderlich' });
        return;
      }

      const eq = await employeeService.addQualification(employeeId, qualificationId, {
        obtainedDate,
        expiryDate,
        certificateNumber,
        notes,
      }, req.user.id);

      res.status(201).json(eq);
    } catch (error) {
      next(error);
    }
  }

  async updateQualification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const employeeId = req.params.id as string;
      const qualificationId = req.params.qid as string;
      const { expiryDate, certificateNumber, isVerified, notes } = req.body;

      const eq = await employeeService.updateQualification(employeeId, qualificationId, {
        expiryDate,
        certificateNumber,
        isVerified,
        notes,
      }, req.user.id);

      res.json(eq);
    } catch (error) {
      next(error);
    }
  }

  async removeQualification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const employeeId = req.params.id as string;
      const qualificationId = req.params.qid as string;

      await employeeService.removeQualification(employeeId, qualificationId, req.user.id);
      res.json({ message: 'Qualifikation entfernt' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Verfügbarkeiten ───

  async addAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const employeeId = req.params.id as string;
      const { type, startDate, endDate, reason } = req.body;

      if (!type || !startDate || !endDate) {
        res.status(400).json({ error: 'Typ, Start- und Enddatum sind erforderlich' });
        return;
      }

      const availability = await employeeService.addAvailability(employeeId, {
        type,
        startDate,
        endDate,
        reason,
      }, req.user.id);

      res.status(201).json(availability);
    } catch (error) {
      next(error);
    }
  }

  async approveAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const availabilityId = req.params.aid as string;
      const { approved } = req.body;

      const availability = await employeeService.approveAvailability(availabilityId, approved, req.user.id);
      res.json(availability);
    } catch (error) {
      next(error);
    }
  }
}

export const employeeController = new EmployeeController();
