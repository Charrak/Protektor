import { Request, Response, NextFunction } from 'express';
import { stripeWebhookService, StripeWebhookEvent } from '../services/stripeWebhook.service';
import { logger } from '../config/logger';

export class StripeWebhookController {
  /**
   * POST /api/platform/webhooks/stripe
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Stripe Webhook-Signatur validieren
      // const signature = req.headers['stripe-signature'];
      // const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

      const event: StripeWebhookEvent = req.body;

      if (!event.id || !event.type) {
        res.status(400).json({ error: 'Ungültiges Webhook-Event' });
        return;
      }

      await stripeWebhookService.processWebhook(event);

      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook-Verarbeitungsfehler:', error);
      res.status(500).json({ error: 'Webhook-Verarbeitung fehlgeschlagen' });
    }
  }
}

export const stripeWebhookController = new StripeWebhookController();
