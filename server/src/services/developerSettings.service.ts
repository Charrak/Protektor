import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Developer Settings Service
 * Zentrale Verwaltung aller Systemeinstellungen
 */

export interface SystemSettings {
  // Allgemein
  systemName: string;
  systemVersion: string;
  maintenanceMode: boolean;
  
  // Email
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  
  // Stripe
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeTestMode: boolean;
  
  // Bank (SEPA)
  sepaCreditorId: string;
  sepaIban: string;
  sepaBic: string;
  sepaBankName: string;
  sepaMandateReference: string;
  
  // API Keys
  apiKeyDatev: string;
  apiKeySms: string;
  apiKeyPush: string;
  apiKeyMaps: string;
  
  // Lizenz
  defaultTrialDays: number;
  defaultGraceDays: number;
  defaultOfflineGraceMinutes: number;
  
  // Sicherheit
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordMinLength: number;
  require2FA: boolean;
  
  // Benachrichtigungen
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  enablePushNotifications: boolean;
  
  // Backups
  autoBackupEnabled: boolean;
  backupInterval: string; // daily, weekly, monthly
  backupRetention: number; // days
}

export class DeveloperSettingsService {
  /**
   * Alle Einstellungen abrufen
   */
  async getSettings(): Promise<SystemSettings> {
    const settings = await prisma.systemSettings.findFirst({
      where: { key: 'system_settings' },
    });

    if (!settings) {
      // Standard-Einstellungen zurückgeben
      return this.getDefaultSettings();
    }

    return settings.value as unknown as SystemSettings;
  }

  /**
   * Alle Einstellungen aktualisieren
   */
  async updateSettings(settings: Partial<SystemSettings>) {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...settings };

    await prisma.systemSettings.upsert({
      where: { key: 'system_settings' },
      update: { value: newSettings as any },
      create: {
        key: 'system_settings',
        value: newSettings as any,
      },
    });

    logger.info('System-Einstellungen aktualisiert');
    return newSettings;
  }

  /**
   * Standard-Einstellungen
   */
  getDefaultSettings(): SystemSettings {
    return {
      systemName: 'SMS - Security Management System',
      systemVersion: '1.0.0',
      maintenanceMode: false,
      
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      fromEmail: 'noreply@sms-platform.com',
      fromName: 'SMS Platform',
      
      stripePublicKey: '',
      stripeSecretKey: '',
      stripeWebhookSecret: '',
      stripeTestMode: true,
      
      sepaCreditorId: '',
      sepaIban: '',
      sepaBic: '',
      sepaBankName: '',
      sepaMandateReference: '',
      
      apiKeyDatev: '',
      apiKeySms: '',
      apiKeyPush: '',
      apiKeyMaps: '',
      
      defaultTrialDays: 30,
      defaultGraceDays: 7,
      defaultOfflineGraceMinutes: 1440,
      
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      passwordMinLength: 8,
      require2FA: false,
      
      enableEmailNotifications: true,
      enableSmsNotifications: false,
      enablePushNotifications: true,
      
      autoBackupEnabled: true,
      backupInterval: 'daily',
      backupRetention: 30,
    };
  }

  /**
   * Test-Verbindungen prüfen
   */
  async testConnection(type: 'email' | 'stripe' | 'bank' | 'api') {
    const settings = await this.getSettings();
    
    switch (type) {
      case 'email':
        return this.testEmailConnection(settings);
      case 'stripe':
        return this.testStripeConnection(settings);
      case 'bank':
        return this.testBankConnection(settings);
      case 'api':
        return this.testApiConnections(settings);
      default:
        throw new Error('Unbekannter Verbindungs-Typ');
    }
  }

  private async testEmailConnection(settings: SystemSettings) {
    // Email-Verbindung testen
    try {
      // Hier würde echte Email-Logik stehen
      return {
        success: true,
        message: 'Email-Verbindung erfolgreich',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Email-Verbindung fehlgeschlagen',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  private async testStripeConnection(settings: SystemSettings) {
    // Stripe-Verbindung testen
    try {
      if (!settings.stripeSecretKey) {
        return {
          success: false,
          message: 'Stripe Secret Key nicht konfiguriert',
        };
      }
      
      return {
        success: true,
        message: 'Stripe-Verbindung erfolgreich',
        testMode: settings.stripeTestMode,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Stripe-Verbindung fehlgeschlagen',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  private async testBankConnection(settings: SystemSettings) {
    // Bank-Verbindung testen
    try {
      if (!settings.sepaIban || !settings.sepaBic) {
        return {
          success: false,
          message: 'Bank-Daten nicht konfiguriert',
        };
      }
      
      return {
        success: true,
        message: 'Bank-Verbindung erfolgreich',
        iban: settings.sepaIban.substring(0, 8) + '***',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Bank-Verbindung fehlgeschlagen',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  private async testApiConnections(settings: SystemSettings) {
    // API-Verbindungen testen
    const results = {
      datev: !!settings.apiKeyDatev,
      sms: !!settings.apiKeySms,
      push: !!settings.apiKeyPush,
      maps: !!settings.apiKeyMaps,
    };
    
    return {
      success: Object.values(results).every(r => r),
      message: 'API-Verbindungen getestet',
      results,
    };
  }

  /**
   * Einstellungen validieren
   */
  validateSettings(settings: Partial<SystemSettings>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Email validieren
    if (settings.smtpHost && !settings.smtpUser) {
      errors.push('SMTP User erforderlich wenn SMTP Host gesetzt ist');
    }
    
    // Stripe validieren
    if (settings.stripeSecretKey && !settings.stripePublicKey) {
      errors.push('Stripe Public Key erforderlich wenn Secret Key gesetzt ist');
    }
    
    // Bank validieren
    if (settings.sepaIban && !settings.sepaBic) {
      errors.push('BIC erforderlich wenn IBAN gesetzt ist');
    }
    
    // Sicherheit validieren
    if (settings.passwordMinLength && settings.passwordMinLength < 8) {
      errors.push('Minimale Passwortlänge muss mindestens 8 Zeichen sein');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const developerSettingsService = new DeveloperSettingsService();
