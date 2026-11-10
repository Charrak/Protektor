import { Router } from 'express';
import { employeeRestrictionService } from '../services/employeeRestriction.service';
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
    const restrictions = await employeeRestrictionService.listByEmployee(req.user.tenantId, req.params.employeeId);
    res.json(restrictions);
  } catch (error) {
    next(error);
  }
});

// Erstellen
router.post('/', authenticate, requirePermission('employees:edit'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const result = await employeeRestrictionService.create(req.user.tenantId, req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Aktualisieren
router.put('/:id', authenticate, requirePermission('employees:edit'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const result = await employeeRestrictionService.update(req.user.tenantId, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Löschen
router.delete('/:id', authenticate, requirePermission('employees:edit'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    await employeeRestrictionService.delete(req.user.tenantId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Restriktionen prüfen (für Auto-Planung)
router.post('/check', authenticate, requirePermission('scheduling:view'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const { employeeId, date, startTime, endTime, objectId } = req.body;
    if (!employeeId || !date || !startTime || !endTime) {
      res.status(400).json({ error: 'employeeId, date, startTime und endTime erforderlich' });
      return;
    }
    const result = await employeeRestrictionService.checkRestrictions(
      req.user.tenantId,
      employeeId,
      new Date(date),
      new Date(startTime),
      new Date(endTime),
      objectId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Alle Restriktionen für Planung
router.post('/planning', authenticate, requirePermission('scheduling:auto_plan'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const { employeeIds } = req.body;
    if (!employeeIds || !Array.isArray(employeeIds)) {
      res.status(400).json({ error: 'employeeIds Array erforderlich' });
      return;
    }
    const result = await employeeRestrictionService.getAllForPlanning(req.user.tenantId, employeeIds);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
