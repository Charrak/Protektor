import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

// E-Mail Transporter konfigurieren
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Sendet eine E-Mail
   */
  async sendEmail(options: EmailOptions) {
    try {
      const info = await transporter.sendMail({
        from: `"SMS Platform" <${process.env.SMTP_FROM || 'noreply@example.com'}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
        html: options.html,
      });

      logger.info(`E-Mail gesendet: ${options.subject} → ${options.to} (${info.messageId})`);

      return info;
    } catch (error) {
      logger.error('E-Mail-Versand fehlgeschlagen', error);
      throw error;
    }
  }

  /**
   * Sendet Zahlungserinnerung
   */
  async sendPaymentReminder(tenantId: string, daysUntilDue: number) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: { plan: true },
          take: 1,
        },
      },
    });

    if (!tenant) return;

    const subscription = tenant.subscriptions[0];
    if (!subscription) return;

    const subject = daysUntilDue === 0
      ? 'Zahlung heute fällig'
      : `Zahlungserinnerung: ${daysUntilDue} Tage bis zur Fälligkeit`;

    const html = `
      <h2>Zahlungserinnerung</h2>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>Ihr Abonnement für <strong>${tenant.companyName}</strong> wird in ${daysUntilDue} Tagen fällig.</p>
      <h3>Abonnement-Details:</h3>
      <ul>
        <li><strong>Tarif:</strong> ${subscription.plan.name}</li>
        <li><strong>Abrechnung:</strong> ${subscription.billingInterval === 'MONTHLY' ? 'Monatlich' : 'Jährlich'}</li>
        <li><strong>Fällig am:</strong> ${new Date(subscription.currentPeriodEnd).toLocaleDateString('de-DE')}</li>
      </ul>
      <p>Bitte stellen Sie sicher, dass Ihre Zahlungsmethode aktuell ist.</p>
      <p>Mit freundlichen Grüßen,<br>Ihr SMS-Team</p>
    `;

    await this.sendEmail({
      to: tenant.contactEmail,
      subject,
      html,
    });

    logger.info(`Zahlungserinnerung gesendet: ${tenant.companyName} (${daysUntilDue} Tage)`);
  }

  /**
   * Sendet Benachrichtigung bei Zahlungsausfall
   */
  async sendPaymentFailed(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) return;

    const html = `
      <h2>Zahlung fehlgeschlagen</h2>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>Leider konnte Ihre Zahlung für <strong>${tenant.companyName}</strong> nicht verarbeitet werden.</p>
      <h3>Was bedeutet das?</h3>
      <p>Ihr Abonnement befindet sich jetzt im Status "Zahlung ausstehend". Sie haben noch <strong>${tenant.paymentGraceDays} Tage</strong> Zeit, die Zahlung zu aktualisieren.</p>
      <h3>Was müssen Sie tun?</h3>
      <p>Bitte aktualisieren Sie Ihre Zahlungsmethode in Ihrem Kundenportal, um eine Unterbrechung des Dienstes zu vermeiden.</p>
      <p>Nach Ablauf der Kulanzfrist wird Ihr Zugang eingeschränkt.</p>
      <p>Mit freundlichen Grüßen,<br>Ihr SMS-Team</p>
    `;

    await this.sendEmail({
      to: tenant.contactEmail,
      subject: 'Zahlung fehlgeschlagen - Bitte Zahlungsmethode aktualisieren',
      html,
    });

    logger.info(`Zahlungsausfall-Benachrichtigung gesendet: ${tenant.companyName}`);
  }

  /**
   * Sendet Benachrichtigung bei Status-Änderung
   */
  async sendStatusChangeNotification(tenantId: string, oldStatus: string, newStatus: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) return;

    const statusMessages: Record<string, { subject: string; message: string }> = {
      ACTIVE: {
        subject: 'Ihr Abonnement ist wieder aktiv',
        message: 'Gute Nachrichten! Ihre Zahlung wurde erfolgreich verarbeitet und Ihr Abonnement ist wieder voll aktiv.',
      },
      PAYMENT_PENDING: {
        subject: 'Zahlung ausstehend - Kulanzfrist aktiv',
        message: 'Ihre Zahlung konnte nicht verarbeitet werden. Sie haben noch 7 Tage Zeit, die Zahlung zu aktualisieren.',
      },
      GRACE_PERIOD: {
        subject: 'Kulanzfrist läuft ab',
        message: 'Ihre Kulanzfrist läuft bald ab. Bitte aktualisieren Sie Ihre Zahlungsmethode, um eine Sperrung zu vermeiden.',
      },
      RESTRICTED: {
        subject: 'Zugriff eingeschränkt',
        message: 'Aufgrund ausstehender Zahlungen wurde Ihr Zugang eingeschränkt.',
      },
      SUSPENDED: {
        subject: 'Zugang suspendiert',
        message: 'Ihr Zugang wurde aufgrund ausstehender Zahlungen suspendiert.',
      },
    };

    const statusInfo = statusMessages[newStatus];
    if (!statusInfo) return;

    const html = `
      <h2>${statusInfo.subject}</h2>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>${statusInfo.message}</p>
      <h3>Status-Änderung:</h3>
      <ul>
        <li><strong>Von:</strong> ${oldStatus}</li>
        <li><strong>Zu:</strong> ${newStatus}</li>
      </ul>
      <p>Mit freundlichen Grüßen,<br>Ihr SMS-Team</p>
    `;

    await this.sendEmail({
      to: tenant.contactEmail,
      subject: statusInfo.subject,
      html,
    });

    logger.info(`Status-Änderung-Benachrichtigung gesendet: ${tenant.companyName} (${oldStatus} → ${newStatus})`);
  }

  /**
   * Sendet Willkommens-E-Mail für neue Mandanten mit Passwort-Setup-Link
   */
  async sendWelcomeEmail(tenantId: string, adminPassword: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) return;

    // Generate password reset token (valid for 24 hours)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token to tenant for password setup
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry,
      },
    });

    const setupLink = `${process.env.APP_URL || 'http://localhost:5173'}/setup-password?token=${resetToken}&tenant=${tenant.tenantId}`;

    // Use the template
    const { generateTenantWelcomeEmail } = await import('../templates/emails/tenant-welcome');
    const emailData = generateTenantWelcomeEmail({
      companyName: tenant.companyName,
      contactName: tenant.contactEmail.split('@')[0], // Use email prefix as name
      contactEmail: tenant.contactEmail,
      setupLink,
      adminName: 'Administrator',
      platformName: 'SMS',
    });

    await this.sendEmail({
      to: tenant.contactEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    logger.info(`Willkommens-E-Mail mit Setup-Link gesendet: ${tenant.companyName} → ${tenant.contactEmail}`);
  }
}

export const emailService = new EmailService();
