import { Router } from 'express';
import { customerPortalService } from '../services/customerPortal.service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { featureService } from '../services/feature.service';

const router = Router();

// ═══════════════════════════════════════════════════
// PORTAL-AUTHENTIFIZIERUNG (ohne Tenant-Auth)
// ═══════════════════════════════════════════════════

/**
 * POST /api/v1/customer-portal/login
 * Portal-Login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, tenantId } = req.body;
    
    if (!email || !password || !tenantId) {
      res.status(400).json({ error: 'E-Mail, Passwort und TenantId sind erforderlich' });
      return;
    }

    const result = await customerPortalService.login(email, password, tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/customer-portal/forgot-password
 * Passwort vergessen
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email, tenantId } = req.body;
    
    if (!email || !tenantId) {
      res.status(400).json({ error: 'E-Mail und TenantId sind erforderlich' });
      return;
    }

    const result = await customerPortalService.resetPassword(email, tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/customer-portal/reset-password
 * Passwort zurücksetzen mit Token
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword, tenantId } = req.body;
    
    if (!token || !newPassword || !tenantId) {
      res.status(400).json({ error: 'Token, neues Passwort und TenantId sind erforderlich' });
      return;
    }

    const result = await customerPortalService.setNewPassword(token, newPassword, tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════
// PORTAL-VERWALTUNG (für Tenant-Admins)
// ═══════════════════════════════════════════════════

/**
 * GET /api/v1/customer-portal/check-access
 * Prüft ob Tenant Portal-Access hat
 */
router.get(
  '/check-access',
  authenticate,
  requirePermission('admin:settings'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const hasAccess = await customerPortalService.checkPortalAccess(req.user.tenantId);
      res.json({ hasAccess });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/customer-portal/users
 * Erstellt einen neuen Portal-User
 */
router.post(
  '/users',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const user = await customerPortalService.createPortalUser(
        req.user.tenantId,
        req.body,
        req.user.id
      );
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/customer-portal/users
 * Listet alle Portal-User eines Kunden
 */
router.get(
  '/users',
  authenticate,
  requirePermission('customers:view'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const { customerId } = req.query;
      if (!customerId) {
        res.status(400).json({ error: 'customerId ist erforderlich' });
        return;
      }

      const users = await customerPortalService.listPortalUsers(
        req.user.tenantId,
        customerId as string
      );
      res.json(users);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/customer-portal/users/:id
 * Aktualisiert einen Portal-User
 */
router.put(
  '/users/:id',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const user = await customerPortalService.updatePortalUser(
        req.user.tenantId,
        req.params.id,
        req.body
      );
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/customer-portal/users/:id
 * Löscht einen Portal-User
 */
router.delete(
  '/users/:id',
  authenticate,
  requirePermission('customers:edit'),
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const result = await customerPortalService.deletePortalUser(
        req.user.tenantId,
        req.params.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ═══════════════════════════════════════════════════
// PORTAL-DATEN (für Portal-User)
// ═══════════════════════════════════════════════════

/**
 * GET /api/v1/customer-portal/invoices
 * Rechnungen für Portal-User
 */
router.get(
  '/invoices',
  authenticate,
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      // TODO: JWT-Token für Portal-User validieren und customerId extrahieren
      const { customerId, portalUserId } = req.query;
      
      if (!customerId || !portalUserId) {
        res.status(400).json({ error: 'customerId und portalUserId sind erforderlich' });
        return;
      }

      const invoices = await customerPortalService.getInvoices(
        req.user.tenantId,
        customerId as string,
        portalUserId as string
      );
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/customer-portal/reports
 * Schichtberichte für Portal-User
 */
router.get(
  '/reports',
  authenticate,
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const { customerId, portalUserId } = req.query;
      
      if (!customerId || !portalUserId) {
        res.status(400).json({ error: 'customerId und portalUserId sind erforderlich' });
        return;
      }

      const reports = await customerPortalService.getShiftReports(
        req.user.tenantId,
        customerId as string,
        portalUserId as string
      );
      res.json(reports);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/customer-portal/documents
 * Dokumente für Portal-User
 */
router.get(
  '/documents',
  authenticate,
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Nicht angemeldet' });
        return;
      }

      const { customerId, portalUserId } = req.query;
      
      if (!customerId || !portalUserId) {
        res.status(400).json({ error: 'customerId und portalUserId sind erforderlich' });
        return;
      }

      const documents = await customerPortalService.getDocuments(
        req.user.tenantId,
        customerId as string,
        portalUserId as string
      );
      res.json(documents);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
