// @ts-ignore - axios ist optional
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Webhook Execution Service
 * Sends events to registered customer webhooks
 */

export interface WebhookEvent {
  eventType: string;
  timestamp: Date;
  data: any;
  tenantId: string;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Execute webhook for a specific event
 */
export async function executeWebhook(webhook: any, event: WebhookEvent): Promise<boolean> {
  try {
    const payload = JSON.stringify({
      event: event.eventType,
      timestamp: event.timestamp.toISOString(),
      data: event.data,
    });

    const signature = generateSignature(payload, webhook.secret);

    const response = await axios.post(webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event.eventType,
        'User-Agent': 'SMS-Webhook/1.0',
      },
      timeout: 10000, // 10 second timeout
    });

    // Log successful delivery
    await prisma.webhookEvent.create({
      data: {
        tenantId: event.tenantId,
        webhookId: webhook.id,
        eventType: event.eventType,
        payload: event.data,
        responseCode: response.status,
        success: true,
      },
    });

    logger.info(`Webhook delivered: ${webhook.url} - ${event.eventType} (${response.status})`);
    return true;
  } catch (error: any) {
    const responseCode = error.response?.status || 0;
    const errorMessage = error.message || 'Unknown error';

    // Log failed delivery
    await prisma.webhookEvent.create({
      data: {
        tenantId: event.tenantId,
        webhookId: webhook.id,
        eventType: event.eventType,
        payload: event.data,
        responseCode,
        errorMessage,
        success: false,
      },
    });

    logger.error(`Webhook failed: ${webhook.url} - ${event.eventType} - ${errorMessage}`);
    return false;
  }
}

/**
 * Trigger webhook events for a tenant
 */
export async function triggerWebhookEvent(tenantId: string, eventType: string, data: any): Promise<void> {
  try {
    // Get all active webhooks for this tenant that subscribe to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { events: { array_contains: [eventType] } },
          { events: { array_contains: ['*'] } }, // Wildcard
        ],
      },
    });

    if (webhooks.length === 0) {
      return; // No webhooks registered for this event
    }

    const event: WebhookEvent = {
      eventType,
      timestamp: new Date(),
      data,
      tenantId,
    };

    // Execute all webhooks in parallel
    const results = await Promise.allSettled(
      webhooks.map((webhook: any) => executeWebhook(webhook, event))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - successful;

    logger.info(`Webhook event triggered: ${eventType} - ${successful} successful, ${failed} failed`);
  } catch (error: any) {
    logger.error(`Error triggering webhook event: ${error.message}`);
  }
}

/**
 * Common webhook event types
 */
export const WebhookEvents = {
  // Employee events
  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_DELETED: 'employee.deleted',
  
  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  
  // Object events
  OBJECT_CREATED: 'object.created',
  OBJECT_UPDATED: 'object.updated',
  OBJECT_DELETED: 'object.deleted',
  
  // Deployment events
  DEPLOYMENT_CREATED: 'deployment.created',
  DEPLOYMENT_UPDATED: 'deployment.updated',
  DEPLOYMENT_COMPLETED: 'deployment.completed',
  
  // Time record events
  TIME_RECORD_CREATED: 'time_record.created',
  TIME_RECORD_UPDATED: 'time_record.updated',
  TIME_RECORD_APPROVED: 'time_record.approved',
  
  // Billing events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',
  
  // Scheduling events
  SCHEDULE_CREATED: 'schedule.created',
  SCHEDULE_UPDATED: 'schedule.updated',
  SCHEDULE_CANCELLED: 'schedule.cancelled',
};
