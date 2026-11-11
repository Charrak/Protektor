import { Request, Response, NextFunction } from 'express';
import { stripeWebhookService, StripeWebhookEvent } from '../services/stripeWebhook.service';
import { logger } from '../config/logger';

export class StripeWebhookController {
  /**
   * POST /api/platform/webhooks/stripe
   * ACHTUNG: Diese Route muss MIT express.raw({ type: 'application/json' }) registriert werden
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        logger.error('STRIPE_WEBHOOK_SECRET nicht konfiguriert');
        res.status(500).json({ error: 'Webhook-Secret nicht konfiguriert' });
        return;
      }

      if (!signature) {
        logger.error('Stripe-Signatur fehlt');
        res.status(400).json({ error: 'Fehlende Signatur' });
        return;
      }

      // Signatur validieren
      let event: StripeWebhookEvent;
      try {
        const stripe = (await import('stripe')).default;
        const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '');
        event = stripeClient.webhooks.constructEvent(
          req.body as Buffer,
          signature,
          webhookSecret
        ) as StripeWebhookEvent;
      } catch (err: any) {
        logger.error('Webhook-Signatur ungültig:', err.message);
        res.status(400).json({ error: 'Ungültige Signatur' });
        return;
      }

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
