import Stripe from 'stripe';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

// Stripe Client initialisieren - nur wenn API Key vorhanden
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
  });
  logger.info('Stripe Client initialisiert');
} else {
  logger.warn('STRIPE_SECRET_KEY nicht gesetzt - Stripe Services deaktiviert');
}

export interface CreateCheckoutSessionInput {
  tenantId: string;
  planId: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  successUrl: string;
  cancelUrl: string;
}

export class StripeService {
  /**
   * Erstellt eine Checkout-Session für ein neues Abonnement
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput) {
    const { tenantId, planId, billingInterval, successUrl, cancelUrl } = input;

    // Tenant und Plan laden
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant nicht gefunden');
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('Plan nicht gefunden');
    }

    // Stripe Price ID auswählen
    const priceId = billingInterval === 'MONTHLY'
      ? plan.stripePriceIdMonthly
      : plan.stripePriceIdYearly;

    if (!priceId) {
      throw new Error(`Stripe Price ID für ${billingInterval} nicht konfiguriert`);
    }

    // Stripe Customer erstellen oder finden
    let customerId = tenant.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.contactEmail,
        name: tenant.companyName,
        metadata: {
          tenantId: tenant.id,
          tenantIdExternal: tenant.tenantId,
        },
      });

      customerId = customer.id;

      // Customer ID im Tenant speichern
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Checkout Session erstellen
    const session = await (stripe.checkout.sessions as any).create({
      customer: customerId,
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        tenantId: tenant.id,
        planId: plan.id,
        billingInterval,
      },
      subscription_data: {
        metadata: {
          tenantId: tenant.id,
          planId: plan.id,
        },
      },
    });

    logger.info(`Checkout Session erstellt: ${session.id} für Tenant ${tenant.companyName}`);

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Erstellt ein Customer Portal Session für Selbstverwaltung
   */
  async createPortalSession(tenantId: string, returnUrl: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.stripeCustomerId) {
      throw new Error('Tenant oder Stripe Customer nicht gefunden');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    logger.info(`Portal Session erstellt: ${session.id} für Tenant ${tenant.companyName}`);

    return {
      url: session.url,
    };
  }

  /**
   * Ruft Abonnement-Details von Stripe ab
   */
  async getSubscription(subscriptionId: string) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  }

  /**
   * Verifiziert Webhook-Signatur
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string | undefined): Stripe.Event {
    if (!signature) {
      throw new Error('Webhook-Signatur fehlt');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET nicht konfiguriert');
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (err) {
      logger.error('Webhook-Signatur-Verifizierung fehlgeschlagen', err);
      throw new Error('Ungültige Webhook-Signatur');
    }
  }
}

export const stripeService = new StripeService();
