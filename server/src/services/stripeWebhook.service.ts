import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { emailService } from './email.service';

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export class StripeWebhookService {
  /**
   * Verarbeitet Stripe Webhook Events
   */
  async processWebhook(event: StripeWebhookEvent): Promise<void> {
    // Duplikat-Prüfung
    const existing = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existing) {
      logger.warn(`Webhook bereits verarbeitet: ${event.id}`);
      return;
    }

    // Event speichern
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: event.data,
        processed: false,
      },
    });

    try {
      // Event-Typ verarbeiten
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event);
          break;

        default:
          logger.info(`Unbehandelter Webhook-Typ: ${event.type}`);
      }

      // Als verarbeitet markieren
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processed: true, processedAt: new Date() },
      });

      logger.info(`Webhook verarbeitet: ${event.type} (${event.id})`);
    } catch (error) {
      // Fehler speichern
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      logger.error(`Webhook-Fehler: ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Zahlung erfolgreich
   */
  private async handlePaymentSucceeded(event: StripeWebhookEvent): Promise<void> {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    // Tenant finden
    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) {
      logger.warn(`Tenant nicht gefunden für Customer: ${customerId}`);
      return;
    }

    // Zahlung speichern
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: tenant.subscriptions?.[0]?.id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid / 100, // Stripe verwendet Cents
        currency: invoice.currency.toUpperCase(),
        status: 'SUCCEEDED',
        paidAt: new Date(invoice.status_transitions?.paid_at * 1000 || Date.now()),
        billingPeriodStart: new Date(invoice.period_start * 1000),
        billingPeriodEnd: new Date(invoice.period_end * 1000),
      },
    });

    // Lizenz auf ACTIVE setzen
    const oldStatus = tenant.licenseStatus;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        licenseStatus: 'ACTIVE',
        offlineSince: null,
      },
    });

    // E-Mail-Benachrichtigung senden, wenn Status sich geändert hat
    if (oldStatus !== 'ACTIVE') {
      await emailService.sendStatusChangeNotification(tenant.id, oldStatus, 'ACTIVE');
    }

    logger.info(`Zahlung erfolgreich: Tenant ${tenant.tenantId}, Betrag: ${invoice.amount_paid / 100} ${invoice.currency}`);
  }

  /**
   * Zahlung fehlgeschlagen
   */
  private async handlePaymentFailed(event: StripeWebhookEvent): Promise<void> {
    const invoice = event.data.object;
    const customerId = invoice.customer;

    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) return;

    // Zahlung als fehlgeschlagen speichern
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: invoice.last_finalization_error?.message || 'Payment failed',
        billingPeriodStart: new Date(invoice.period_start * 1000),
        billingPeriodEnd: new Date(invoice.period_end * 1000),
      },
    });

    // Lizenz auf PAYMENT_PENDING setzen
    const oldStatus = tenant.licenseStatus;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { licenseStatus: 'PAYMENT_PENDING' },
    });

    // E-Mail-Benachrichtigung senden
    if (oldStatus !== 'PAYMENT_PENDING') {
      await emailService.sendPaymentFailed(tenant.id);
      await emailService.sendStatusChangeNotification(tenant.id, oldStatus, 'PAYMENT_PENDING');
    }

    logger.warn(`Zahlung fehlgeschlagen: Tenant ${tenant.tenantId}`);
  }

  /**
   * Subscription erstellt
   */
  private async handleSubscriptionCreated(event: StripeWebhookEvent): Promise<void> {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) return;

    // Subscription speichern (falls noch nicht vorhanden)
    const existing = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existing) {
      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          stripeSubscriptionId: subscription.id,
          planId: tenant.subscriptions?.[0]?.planId || '', // TODO: Plan zuordnen
          status: this.mapStripeStatus(subscription.status),
          billingInterval: subscription.items?.data[0]?.price?.recurring?.interval === 'year' ? 'YEARLY' : 'MONTHLY',
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          monthlyRevenue: subscription.items?.data[0]?.price?.unit_amount / 100 || 0,
        },
      });
    }

    logger.info(`Subscription erstellt: Tenant ${tenant.tenantId}`);
  }

  /**
   * Subscription aktualisiert
   */
  private async handleSubscriptionUpdated(event: StripeWebhookEvent): Promise<void> {
    const subscription = event.data.object;

    const existing = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existing) return;

    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    logger.info(`Subscription aktualisiert: ${subscription.id}`);
  }

  /**
   * Subscription gelöscht
   */
  private async handleSubscriptionDeleted(event: StripeWebhookEvent): Promise<void> {
    const subscription = event.data.object;

    const existing = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existing) return;

    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: 'CANCELED',
        endedAt: new Date(),
      },
    });

    // Tenant auf CANCELLED setzen
    const tenant = await prisma.tenant.findUnique({ where: { id: existing.tenantId } });
    if (tenant) {
      const oldStatus = tenant.licenseStatus;
      await prisma.tenant.update({
        where: { id: existing.tenantId },
        data: { licenseStatus: 'CANCELLED' },
      });

      // E-Mail-Benachrichtigung senden
      if (oldStatus !== 'CANCELLED') {
        await emailService.sendStatusChangeNotification(existing.tenantId, oldStatus, 'CANCELLED');
      }
    }

    logger.info(`Subscription gelöscht: ${subscription.id}`);
  }

  /**
   * Trial endet bald
   */
  private async handleTrialWillEnd(event: StripeWebhookEvent): Promise<void> {
    const subscription = event.data.object;

    const existing = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existing) return;

    // TODO: E-Mail-Benachrichtigung an Tenant senden

    logger.info(`Trial endet bald: Tenant ${existing.tenantId}`);
  }

  /**
   * Mappt Stripe Status zu internem Status
   */
  private mapStripeStatus(stripeStatus: string): string {
    const mapping: Record<string, string> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      unpaid: 'UNPAID',
      incomplete: 'INCOMPLETE',
      paused: 'PAUSED',
      trialing: 'TRIAL',
    };
    return mapping[stripeStatus] || 'ACTIVE';
  }
}

export const stripeWebhookService = new StripeWebhookService();
