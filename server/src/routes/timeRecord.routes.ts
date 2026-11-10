import { Router } from 'express';
import { timeRecordService } from '../services/timeRecord.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// Liste für Mitarbeiter
router.get('/employee/:employeeId', authenticate, requirePermission('attendance:view'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const { dateFrom, dateTo, status, objectId } = req.query;
    const filters = {
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      status: status as string,
      objectId: objectId as string,
    };
    const records = await timeRecordService.listByEmployee(req.user.tenantId, req.params.employeeId, filters);
    res.json(records);
  } catch (error) {
    next(error);
  }
});

// Clock-In
router.post('/clock-in', authenticate, requirePermission('attendance:create'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const input = {
      ...req.body,
      clockIn: new Date(req.body.clockIn),
      clockOut: req.body.clockOut ? new Date(req.body.clockOut) : undefined,
    };
    const record = await timeRecordService.clockIn(req.user.tenantId, input, req.user.id);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

// Clock-Out
router.post('/:id/clock-out', authenticate, requirePermission('attendance:create'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const input = {
      ...req.body,
      clockOut: new Date(req.body.clockOut),
    };
    const record = await timeRecordService.clockOut(req.user.tenantId, req.params.id, input, req.user.id);
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// Start Break
router.post('/:id/break/start', authenticate, requirePermission('attendance:create'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const break_ = await timeRecordService.startBreak(req.user.tenantId, req.params.id, req.body, req.user.id);
    res.status(201).json(break_);
  } catch (error) {
    next(error);
  }
});

// End Break
router.post('/break/:breakId/end', authenticate, requirePermission('attendance:create'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const input = {
      ...req.body,
      breakEnd: req.body.breakEnd ? new Date(req.body.breakEnd) : undefined,
    };
    const break_ = await timeRecordService.endBreak(req.user.tenantId, req.params.breakId, input, req.user.id);
    res.json(break_);
  } catch (error) {
    next(error);
  }
});

// Approve
router.post('/:id/approve', authenticate, requirePermission('attendance:approve'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const record = await timeRecordService.approve(req.user.tenantId, req.params.id, req.user.id, req.body);
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// Reject
router.post('/:id/reject', authenticate, requirePermission('attendance:approve'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const record = await timeRecordService.reject(req.user.tenantId, req.params.id, req.user.id, req.body);
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// Lock
router.post('/:id/lock', authenticate, requirePermission('attendance:approve'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const record = await timeRecordService.lock(req.user.tenantId, req.params.id, req.user.id, req.body);
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// Correct
router.post('/:id/correct', authenticate, requirePermission('attendance:edit'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const result = await timeRecordService.correct(req.user.tenantId, req.params.id, req.user.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Export für Lohnabrechnung
router.post('/export/payroll', authenticate, requirePermission('billing:payroll'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const { dateFrom, dateTo } = req.body;
    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: 'dateFrom und dateTo erforderlich' });
      return;
    }
    const records = await timeRecordService.exportForPayroll(
      req.user.tenantId,
      new Date(dateFrom),
      new Date(dateTo)
    );
    res.json(records);
  } catch (error) {
    next(error);
  }
});

// Export für Kundenabrechnung
router.post('/export/customer', authenticate, requirePermission('billing:invoices'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const { customerId, dateFrom, dateTo } = req.body;
    if (!customerId || !dateFrom || !dateTo) {
      res.status(400).json({ error: 'customerId, dateFrom und dateTo erforderlich' });
      return;
    }
    const records = await timeRecordService.exportForCustomer(
      req.user.tenantId,
      customerId,
      new Date(dateFrom),
      new Date(dateTo)
    );
    res.json(records);
  } catch (error) {
    next(error);
  }
});

export default router;
