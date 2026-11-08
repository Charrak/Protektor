import { Router } from 'express';
import { platformAuthController } from '../controllers/platformAuth.controller';
import { tenantController } from '../controllers/tenant.controller';
import { subscriptionController } from '../controllers/subscription.controller';
import { planController } from '../controllers/plan.controller';
import { stripeWebhookController } from '../controllers/stripeWebhook.controller';
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

// ─── Subscription-Verwaltung ───
router.get('/subscriptions', platformAuthenticate, (req, res, next) => subscriptionController.list(req, res, next));
router.post('/subscriptions', platformAuthenticate, (req, res, next) => subscriptionController.create(req, res, next));
router.get('/subscriptions/tenant/:tenantId', platformAuthenticate, (req, res, next) => subscriptionController.getByTenant(req, res, next));
router.put('/subscriptions/:id', platformAuthenticate, (req, res, next) => subscriptionController.update(req, res, next));
router.post('/subscriptions/:id/cancel', platformAuthenticate, (req, res, next) => subscriptionController.cancel(req, res, next));
router.post('/subscriptions/:id/reactivate', platformAuthenticate, (req, res, next) => subscriptionController.reactivate(req, res, next));

// ─── Plan-Verwaltung ───
router.get('/plans', platformAuthenticate, (req, res, next) => planController.list(req, res, next));
router.post('/plans', platformAuthenticate, (req, res, next) => planController.create(req, res, next));
router.get('/plans/:id', platformAuthenticate, (req, res, next) => planController.getById(req, res, next));
router.put('/plans/:id', platformAuthenticate, (req, res, next) => planController.update(req, res, next));
router.delete('/plans/:id', platformAuthenticate, (req, res, next) => planController.delete(req, res, next));

// ─── Stripe Webhooks (KEINE Authentifizierung, wird von Stripe signiert) ───
router.post('/webhooks/stripe', (req, res, next) => stripeWebhookController.handleWebhook(req, res, next));

export default router;
