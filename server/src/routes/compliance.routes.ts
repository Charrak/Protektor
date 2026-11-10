import { Router } from 'express';
import { complianceService } from '../services/compliance.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// ArbZG-Compliance-Check
router.get('/arbzg', authenticate, requirePermission('admin:audit_log'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const { dateFrom, dateTo } = req.query;
    const violations = await complianceService.checkArbZGCompliance(
      req.user.tenantId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );
    res.json(violations);
  } catch (error) {
    next(error);
  }
});

// §34a GewO Compliance-Check
router.get('/security-license', authenticate, requirePermission('admin:audit_log'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const violations = await complianceService.checkSecurityLicenseCompliance(req.user.tenantId);
    res.json(violations);
  } catch (error) {
    next(error);
  }
});

// DSGVO: Datenexport (Auskunftsantrag)
router.get('/dsgvo/export/:employeeId', authenticate, requirePermission('employees:view'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const exportData = await complianceService.generateDataExport(req.user.tenantId, req.params.employeeId);
    res.json(exportData);
  } catch (error) {
    next(error);
  }
});

// DSGVO: Löschungsantrag
router.post('/dsgvo/delete', authenticate, requirePermission('admin:settings'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const { employeeId, reason, retainPeriod } = req.body;
    if (!employeeId || !reason) {
      res.status(400).json({ error: 'employeeId und reason erforderlich' });
      return;
    }
    const result = await complianceService.processDeletionRequest(req.user.tenantId, {
      employeeId,
      reason,
      retainPeriod,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GoBD: Aufbewahrungsfristen prüfen
router.get('/retention', authenticate, requirePermission('admin:audit_log'), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    const result = await complianceService.checkRetentionCompliance(req.user.tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
