import { Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service';

export class CustomerController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, page, limit } = req.query;
      const result = await customerService.list({
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
      const customer = await customerService.getById(id);
      res.json(customer);
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

      const { customerNumber, companyName } = req.body;

      if (!customerNumber || !companyName) {
        res.status(400).json({ error: 'Kundennummer und Firmenname sind erforderlich' });
        return;
      }

      const customer = await customerService.create(req.body, req.user.id);
      res.status(201).json(customer);
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
      const customer = await customerService.update(id, req.body, req.user.id);
      res.json(customer);
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
      await customerService.delete(id, req.user.id);
      res.json({ message: 'Kunde deaktiviert' });
    } catch (error) {
      next(error);
    }
  }

  async addContactPerson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const customerId = req.params.id as string;
      const { firstName, lastName } = req.body;

      if (!firstName || !lastName) {
        res.status(400).json({ error: 'Vorname und Nachname sind erforderlich' });
        return;
      }

      const contact = await customerService.addContactPerson(customerId, req.body, req.user.id);
      res.status(201).json(contact);
    } catch (error) {
      next(error);
    }
  }

  async updateContactPerson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const customerId = req.params.id as string;
      const contactId = req.params.cid as string;
      const contact = await customerService.updateContactPerson(customerId, contactId, req.body, req.user.id);
      res.json(contact);
    } catch (error) {
      next(error);
    }
  }

  async deleteContactPerson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const customerId = req.params.id as string;
      const contactId = req.params.cid as string;
      await customerService.deleteContactPerson(customerId, contactId, req.user.id);
      res.json({ message: 'Ansprechpartner entfernt' });
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
