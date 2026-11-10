import { Router } from 'express';
import { employeeDocumentService } from '../services/employeeDocument.service';
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
    const documents = await employeeDocumentService.listByEmployee(req.user.tenantId, req.params.employeeId as string);
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

// Gruppiert nach Kategorie
router.get('/employee/:employeeId/grouped', authenticate, requirePermission('employees:view'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const grouped = await employeeDocumentService.getGroupedByCategory(req.user.tenantId, req.params.employeeId as string);
    res.json(grouped);
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
    const result = await employeeDocumentService.create(req.user.tenantId, req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Verifizieren
router.put('/:id/verify', authenticate, requirePermission('employees:edit'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const result = await employeeDocumentService.verify(req.user.tenantId, req.params.id as string, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Löschen (soft)
router.delete('/:id', authenticate, requirePermission('employees:edit'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    await employeeDocumentService.delete(req.user.tenantId, req.params.id as string);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Ablaufende Dokumente
router.get('/expiring', authenticate, requirePermission('employees:view'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const days = parseInt(req.query.days as string) || 90;
    const documents = await employeeDocumentService.getExpiring(req.user.tenantId, days);
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

// Versionshistorie
router.get('/:id/versions', authenticate, requirePermission('employees:view'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const versions = await employeeDocumentService.getVersionHistory(req.user.tenantId, req.params.id as string);
    res.json(versions);
  } catch (error) {
    next(error);
  }
});

export default router;
