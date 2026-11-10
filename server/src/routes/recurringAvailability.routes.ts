import { Router } from 'express';
import { recurringAvailabilityService } from '../services/recurringAvailability.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// Liste für Mitarbeiter
router.get('/employee/:employeeId', authenticate, requirePermission('employees:view'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const availabilities = await recurringAvailabilityService.listByEmployee(req.user.tenantId, req.params.employeeId);
    res.json(availabilities);
  } catch (error) {
    next(error);
  }
});

// Liste für Wochentag
router.get('/day/:dayOfWeek', authenticate, requirePermission('scheduling:view'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const dayOfWeek = parseInt(req.params.dayOfWeek);
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      res.status(400).json({ error: 'Wochentag muss zwischen 1 und 7 sein' });
      return;
    }
    const availabilities = await recurringAvailabilityService.listByDay(req.user.tenantId, dayOfWeek);
    res.json(availabilities);
  } catch (error) {
    next(error);
  }
});

// Erstellen
router.post('/', authenticate, requirePermission('scheduling:create'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const result = await recurringAvailabilityService.create(req.user.tenantId, req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Genehmigen/Ablehnen
router.put('/:id/approve', authenticate, requirePermission('scheduling:edit'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const { approved } = req.body;
    const result = await recurringAvailabilityService.approve(req.user.tenantId, req.params.id, approved, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Aktualisieren
router.put('/:id', authenticate, requirePermission('scheduling:edit'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const result = await recurringAvailabilityService.update(req.user.tenantId, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Löschen
router.delete('/:id', authenticate, requirePermission('scheduling:delete'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    await recurringAvailabilityService.delete(req.user.tenantId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Verfügbarkeit prüfen
router.get('/check/:employeeId', authenticate, requirePermission('scheduling:view'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const { date, startTime, endTime } = req.query;
    if (!date || !startTime || !endTime) {
      res.status(400).json({ error: 'date, startTime und endTime erforderlich' });
      return;
    }
    const result = await recurringAvailabilityService.isAvailable(
      req.user.tenantId,
      req.params.employeeId,
      new Date(date as string),
      new Date(startTime as string),
      new Date(endTime as string)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
