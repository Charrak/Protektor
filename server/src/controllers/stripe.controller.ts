import { Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { logger } from '../config/logger';

export class StripeController {
  /**
   * POST /api/platform/stripe/checkout-session
   * Erstellt eine Checkout-Session für ein neues Abonnement
   */
  async createCheckoutSession(req: Request, res: Response) {
    try {
      const { tenantId, planId, billingInterval, successUrl, cancelUrl } = req.body;

      if (!tenantId || !planId || !billingInterval || !successUrl || !cancelUrl) {
        return res.status(400).json({
          error: 'Alle Felder erforderlich: tenantId, planId, billingInterval, successUrl, cancelUrl',
        });
      }

      const session = await stripeService.createCheckoutSession({
        tenantId,
        planId,
        billingInterval,
        successUrl,
        cancelUrl,
      });

      res.json(session);
    } catch (error) {
      logger.error('Checkout-Session-Fehler:', error);
      res.status(500).json({ error: 'Checkout-Session konnte nicht erstellt werden' });
    }
  }

  /**
   * POST /api/platform/stripe/portal-session
   * Erstellt eine Customer Portal Session für Selbstverwaltung
   */
  async createPortalSession(req: Request, res: Response) {
    try {
      const { tenantId, returnUrl } = req.body;

      if (!tenantId || !returnUrl) {
        return res.status(400).json({
          error: 'Alle Felder erforderlich: tenantId, returnUrl',
        });
      }

      const session = await stripeService.createPortalSession(tenantId, returnUrl);

      res.json(session);
    } catch (error) {
      logger.error('Portal-Session-Fehler:', error);
      res.status(500).json({ error: 'Portal-Session konnte nicht erstellt werden' });
    }
  }

  /**
   * GET /api/platform/stripe/subscription/:subscriptionId
   * Ruft Abonnement-Details von Stripe ab
   */
  async getSubscription(req: Request, res: Response) {
    try {
      const { subscriptionId } = req.params;

      const subscription = await stripeService.getSubscription(subscriptionId as string);

      res.json(subscription);
    } catch (error) {
      logger.error('Subscription-Abruf-Fehler:', error);
      res.status(500).json({ error: 'Subscription konnte nicht abgerufen werden' });
    }
  }
}

export const stripeController = new StripeController();
