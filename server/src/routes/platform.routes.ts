import { Router } from 'express';
import { platformAuthController } from '../controllers/platformAuth.controller';
import { tenantController } from '../controllers/tenant.controller';
import { platformAuthenticate } from '../middleware/platformAuth';

const router = Router();

// ─── Plattform-Authentifizierung ───
router.post('/auth/login', (req, res, next) => platformAuthController.login(req, res, next));
router.post('/auth/logout', platformAuthenticate, (req, res, next) => platformAuthController.logout(req, res, next));
router.get('/auth/me', platformAuthenticate, (req, res, next) => platformAuthController.getMe(req, res, next));

// ─── Dashboard ───
router.get('/dashboard', platformAuthenticate, (req, res, next) => tenantController.getDashboard(req, res, next));

// ─── Mandanten-Verwaltung ───
router.get('/tenants', platformAuthenticate, (req, res, next) => tenantController.list(req, res, next));
router.post('/tenants', platformAuthenticate, (req, res, next) => tenantController.create(req, res, next));
router.get('/tenants/:id', platformAuthenticate, (req, res, next) => tenantController.getById(req, res, next));
router.put('/tenants/:id', platformAuthenticate, (req, res, next) => tenantController.update(req, res, next));
router.put('/tenants/:id/license', platformAuthenticate, (req, res, next) => tenantController.updateLicenseStatus(req, res, next));

export default router;
