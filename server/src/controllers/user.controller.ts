import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';

export class UserController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, roleId, isActive, page, limit } = req.query;
      const result = await userService.list({
        search: search as string,
        roleId: roleId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
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
      const user = await userService.getById(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password, firstName, lastName, roleId } = req.body;

      if (!username || !email || !password || !firstName || !lastName || !roleId) {
        res.status(400).json({ error: 'Alle Felder sind erforderlich' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
        return;
      }

      const user = await userService.create({ username, email, password, firstName, lastName, roleId });
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { email, firstName, lastName, roleId, isActive } = req.body;
      const user = await userService.update(id, { email, firstName, lastName, roleId, isActive });
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { newPassword } = req.body;
      if (!newPassword) {
        res.status(400).json({ error: 'Neues Passwort erforderlich' });
        return;
      }
      await userService.resetPassword(id, newPassword);
      res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      // Verhindern, dass der eigene Account deaktiviert wird
      if (id === req.user?.id) {
        res.status(400).json({ error: 'Eigener Account kann nicht deaktiviert werden' });
        return;
      }
      await userService.delete(id);
      res.json({ message: 'Benutzer deaktiviert' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
