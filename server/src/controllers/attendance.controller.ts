import { Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';

export class AttendanceController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId, date, startDate, endDate, status, page, limit } = req.query;
      const result = await attendanceService.list({
        employeeId: employeeId as string,
        date: date as string,
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async clockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId, deploymentId } = req.body;
      if (!employeeId) {
        res.status(400).json({ error: 'employeeId erforderlich' });
        return;
      }
      const record = await attendanceService.clockIn(employeeId, deploymentId);
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  }

  async clockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const record = await attendanceService.clockOut(id);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }
      const id = req.params.id as string;
      const record = await attendanceService.approve(id, req.user.id);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async correct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }
      const id = req.params.id as string;
      const record = await attendanceService.correct(id, req.body, req.user.id);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }
}

export const attendanceController = new AttendanceController();
