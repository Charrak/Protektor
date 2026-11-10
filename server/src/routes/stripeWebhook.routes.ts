import { Router } from 'express';
import { stripeWebhookController } from '../controllers/stripeWebhook.controller';

const router = Router();

// POST /api/platform/webhooks/stripe
// Wird mit express.raw() aufgerufen, req.body ist ein Buffer
router.post('/', (req, res, next) => stripeWebhookController.handleWebhook(req, res, next));

export default router;
