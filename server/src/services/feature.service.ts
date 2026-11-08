import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Feature Service
 * Verwaltet Feature-Zugriffe für Tenants basierend auf:
 * 1. Plan-Features (im Abo enthalten)
 * 2. Add-on-Features (zugekauft)
 * 3. Individuelle Features (VIP-Kunden, kostenlos freigeschaltet)
 */

// Alle verfügbaren Feature-Keys im System
export const FEATURE_KEYS = {
  // ═══════════════════════════════════════════════════
  // BASIS-FEATURES (im Standard-Abo enthalten)
  // ═══════════════════════════════════════════════════
  BASIC_EMPLOYEE_MGMT: 'basic_employee_mgmt',         // Mitarbeiter-Grundverwaltung
  BASIC_CUSTOMER_MGMT: 'basic_customer_mgmt',         // Kunden-Grundverwaltung
  BASIC_OBJECT_MGMT: 'basic_object_mgmt',             // Objekt-Grundverwaltung
  BASIC_DEPLOYMENT: 'basic_deployment',                // Einfache Dienstplanung
  BASIC_TIME_TRACKING: 'basic_time_tracking',         // Zeiterfassung
  BASIC_BILLING: 'basic_billing',                     // Grundabrechnung
  BASIC_REPORTS: 'basic_reports',                     // Basis-Berichte
  BASIC_EXPORT: 'basic_export',                       // CSV/PDF Export
  
  // ═══════════════════════════════════════════════════
  // PREMIUM-FEATURES (Zusatzverkauf)
  // ═══════════════════════════════════════════════════
  
  // Integrationen
  DATEV_EXPORT: 'datev_export',                        // DATEV-Export für Lohnabrechnung
  STRIPE_PAYMENT: 'stripe_payment',                    // Stripe-Zahlungsabwicklung
  API_ACCESS: 'api_access',                            // REST API Zugang
  WEBHOOKS: 'webhooks',                                // Webhook-Integrationen
  ZAPIER_INTEGRATION: 'zapier_integration',            // Zapier-Integration
  
  // Automatisierung
  AUTO_PLANNING: 'auto_planning',                      // Automatische Dienstplanung
  AUTO_BILLING: 'auto_billing',                        // Automatische Abrechnung
  AUTO_NOTIFICATIONS: 'auto_notifications',            // Automatische Benachrichtigungen
  AUTO_REPORTS: 'auto_reports',                        // Automatische Berichte
  
  // Erweiterte Funktionen
  ADVANCED_REPORTS: 'advanced_reports',                // Erweiterte Berichte & Analytics
  ADVANCED_SCHEDULING: 'advanced_scheduling',          // Erweiterte Dienstplanung
  ADVANCED_SEARCH: 'advanced_search',                  // Erweiterte Suche
  DOCUMENT_MANAGEMENT: 'document_management',          // Dokumenten-Management
  GPS_TRACKING: 'gps_tracking',                        // GPS-Ortung für Einsätze
  MOBILE_APP: 'mobile_app',                            // Mobile App Zugang
  
  // Kommunikation
  SMS_NOTIFICATIONS: 'sms_notifications',              // SMS-Benachrichtigungen
  PUSH_NOTIFICATIONS: 'push_notifications',            // Push-Benachrichtigungen
  EMAIL_TEMPLATES: 'email_templates',                  // Custom Email-Templates
  CUSTOMER_PORTAL: 'customer_portal',                  // Kunden-Portal
  
  // Security & Compliance
  AUDIT_LOG: 'audit_log',                              // Erweitertes Audit-Log
  TWO_FACTOR_AUTH: 'two_factor_auth',                  // 2FA für alle Benutzer
  IP_WHITELIST: 'ip_whitelist',                        // IP-Whitelist
  CUSTOM_DATA_RETENTION: 'custom_data_retention',      // Individuelle Datenaufbewahrung
  
  // Support
  PRIORITY_SUPPORT: 'priority_support',                // Priorisierter Support
  DEDICATED_SUPPORT: 'dedicated_support',              // Dedizierter Ansprechpartner
  SLA_GUARANTEE: 'sla_guarantee',                      // SLA-Garantie
  CUSTOM_TRAINING: 'custom_training',                  // Individuelle Schulung
  
  // White-Label
  CUSTOM_BRANDING: 'custom_branding',                  // Eigenes Branding
  CUSTOM_DOMAIN: 'custom_domain',                      // Eigene Domain
  WHITE_LABEL: 'white_label',                          // Vollständiges White-Label
  
  // Sonstiges
  UNLIMITED_STORAGE: 'unlimited_storage',              // Unbegrenzter Speicher
  UNLIMITED_EMPLOYEES: 'unlimited_employees',          // Unbegrenzte Mitarbeiter
  MULTI_LOCATION: 'multi_location',                    // Mehrere Standorte
  FRANCHISE_MODE: 'franchise_mode',                    // Franchise-Modus
} as const;

// Feature-Kategorien für UI-Darstellung
export const FEATURE_CATEGORIES = {
  integration: {
    name: 'Integrationen',
    icon: 'plug',
    features: [
      FEATURE_KEYS.DATEV_EXPORT,
      FEATURE_KEYS.STRIPE_PAYMENT,
      FEATURE_KEYS.API_ACCESS,
      FEATURE_KEYS.WEBHOOKS,
      FEATURE_KEYS.ZAPIER_INTEGRATION,
    ],
  },
  automation: {
    name: 'Automatisierung',
    icon: 'cog',
    features: [
      FEATURE_KEYS.AUTO_PLANNING,
      FEATURE_KEYS.AUTO_BILLING,
      FEATURE_KEYS.AUTO_NOTIFICATIONS,
      FEATURE_KEYS.AUTO_REPORTS,
    ],
  },
  advanced: {
    name: 'Erweiterte Funktionen',
    icon: 'star',
    features: [
      FEATURE_KEYS.ADVANCED_REPORTS,
      FEATURE_KEYS.ADVANCED_SCHEDULING,
      FEATURE_KEYS.ADVANCED_SEARCH,
      FEATURE_KEYS.DOCUMENT_MANAGEMENT,
      FEATURE_KEYS.GPS_TRACKING,
      FEATURE_KEYS.MOBILE_APP,
    ],
  },
  communication: {
    name: 'Kommunikation',
    icon: 'message',
    features: [
      FEATURE_KEYS.SMS_NOTIFICATIONS,
      FEATURE_KEYS.PUSH_NOTIFICATIONS,
      FEATURE_KEYS.EMAIL_TEMPLATES,
      FEATURE_KEYS.CUSTOMER_PORTAL,
    ],
  },
  security: {
    name: 'Security & Compliance',
    icon: 'shield',
    features: [
      FEATURE_KEYS.AUDIT_LOG,
      FEATURE_KEYS.TWO_FACTOR_AUTH,
      FEATURE_KEYS.IP_WHITELIST,
      FEATURE_KEYS.CUSTOM_DATA_RETENTION,
    ],
  },
  support: {
    name: 'Support & Training',
    icon: 'headset',
    features: [
      FEATURE_KEYS.PRIORITY_SUPPORT,
      FEATURE_KEYS.DEDICATED_SUPPORT,
      FEATURE_KEYS.SLA_GUARANTEE,
      FEATURE_KEYS.CUSTOM_TRAINING,
    ],
  },
  whitelabel: {
    name: 'White-Label',
    icon: 'palette',
    features: [
      FEATURE_KEYS.CUSTOM_BRANDING,
      FEATURE_KEYS.CUSTOM_DOMAIN,
      FEATURE_KEYS.WHITE_LABEL,
    ],
  },
};

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

export interface FeatureCheckResult {
  enabled: boolean;
  source: 'plan' | 'addon' | 'custom' | 'not_found';
  expiresAt?: Date | null;
  reason?: string;
}

export class FeatureService {
  /**
   * Prüft ob ein Tenant ein bestimmtes Feature nutzen darf
   * Prüft in dieser Reihenfolge:
   * 1. Individuelle Feature-Freischaltung (TenantFeature)
   * 2. Add-on-Features (TenantAddon)
   * 3. Plan-Features (Plan.features)
   */
  async hasFeature(tenantId: string, featureKey: string): Promise<FeatureCheckResult> {
    // 1. Prüfe individuelle Feature-Freischaltung (VIP)
    const customFeature = await prisma.tenantFeature.findFirst({
      where: {
        tenantId,
        featureKey,
        enabled: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (customFeature) {
      return {
        enabled: true,
        source: 'custom',
        expiresAt: customFeature.expiresAt,
        reason: customFeature.reason || 'Individuell freigeschaltet',
      };
    }

    // 2. Prüfe Add-on-Features
    const addon = await prisma.tenantAddon.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        addon: {
          featureKey,
          isActive: true,
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        addon: true,
      },
    });

    if (addon) {
      return {
        enabled: true,
        source: 'addon',
        expiresAt: addon.expiresAt,
        reason: `Add-on: ${addon.addon.name}`,
      };
    }

    // 3. Prüfe Plan-Features
    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    if (subscription?.plan?.features) {
      const planFeatures = subscription.plan.features as Record<string, boolean>;
      if (planFeatures[featureKey] === true) {
        return {
          enabled: true,
          source: 'plan',
          reason: `Enthalten im Plan: ${subscription.plan.name}`,
        };
      }
    }

    // Feature nicht verfügbar
    return {
      enabled: false,
      source: 'not_found',
      reason: 'Feature nicht in Ihrem Plan enthalten',
    };
  }

  /**
   * Gibt alle Features für einen Tenant zurück
   */
  async getAllFeatures(tenantId: string): Promise<Record<string, FeatureCheckResult>> {
    const allFeatures: Record<string, FeatureCheckResult> = {};
    const featureKeys = Object.values(FEATURE_KEYS);

    for (const key of featureKeys) {
      allFeatures[key] = await this.hasFeature(tenantId, key);
    }

    return allFeatures;
  }

  /**
   * Schaltet ein Feature individuell frei (für VIP-Kunden)
   */
  async grantFeature(
    tenantId: string,
    featureKey: string,
    grantedBy: string,
    options?: {
      reason?: string;
      expiresAt?: Date;
    }
  ) {
    const feature = await prisma.tenantFeature.upsert({
      where: {
        tenantId_featureKey: {
          tenantId,
          featureKey,
        },
      },
      update: {
        enabled: true,
        grantedBy,
        reason: options?.reason,
        expiresAt: options?.expiresAt,
      },
      create: {
        tenantId,
        featureKey,
        enabled: true,
        grantedBy,
        reason: options?.reason,
        expiresAt: options?.expiresAt,
      },
    });

    logger.info(`Feature ${featureKey} freigeschaltet für Tenant ${tenantId} von ${grantedBy}`);
    return feature;
  }

  /**
   * Entzieht ein individuell freigeschaltetes Feature
   */
  async revokeFeature(tenantId: string, featureKey: string) {
    await prisma.tenantFeature.updateMany({
      where: { tenantId, featureKey },
      data: { enabled: false },
    });

    logger.info(`Feature ${featureKey} entzogen für Tenant ${tenantId}`);
  }

  /**
   * Aktiviert ein Add-on für einen Tenant
   */
  async activateAddon(
    tenantId: string,
    addonId: string,
    billingInterval: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
    notes?: string
  ) {
    const addon = await prisma.addon.findUnique({ where: { id: addonId } });
    if (!addon) throw new Error('Add-on nicht gefunden');

    const price = billingInterval === 'YEARLY' ? addon.yearlyPrice : addon.monthlyPrice;

    const tenantAddon = await prisma.tenantAddon.create({
      data: {
        tenantId,
        addonId,
        status: 'ACTIVE',
        billingInterval,
        price,
        notes,
      },
    });

    logger.info(`Add-on ${addon.name} aktiviert für Tenant ${tenantId}`);
    return tenantAddon;
  }

  /**
   * Deaktiviert ein Add-on
   */
  async deactivateAddon(tenantAddonId: string) {
    const tenantAddon = await prisma.tenantAddon.update({
      where: { id: tenantAddonId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    logger.info(`Add-on ${tenantAddon.addonId} deaktiviert`);
    return tenantAddon;
  }

  /**
   * Listet alle verfügbaren Add-ons auf
   */
  async listAvailableAddons(category?: string) {
    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    }

    return prisma.addon.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Listet alle aktiven Add-ons eines Tenants
   */
  async listTenantAddons(tenantId: string) {
    return prisma.tenantAddon.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        addon: true,
      },
    });
  }

  /**
   * Gibt die monatlichen Add-on-Kosten eines Tenants zurück
   */
  async getMonthlyAddonCost(tenantId: string) {
    const addons = await prisma.tenantAddon.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });

    return addons.reduce((sum: number, addon: any) => {
      if (addon.billingInterval === 'YEARLY') {
        return sum + Number(addon.price) / 12; // Jährlich auf monatlich umgerechnet
      }
      return sum + Number(addon.price);
    }, 0);
  }

  /**
   * Listet alle individuell freigeschalteten Features eines Tenants
   */
  async listGrantedFeatures(tenantId: string) {
    return prisma.tenantFeature.findMany({
      where: {
        tenantId,
        enabled: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Räumt abgelaufene Feature-Freischaltungen auf
   */
  async cleanupExpiredFeatures() {
    const result = await prisma.tenantFeature.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    logger.info(`${result.count} abgelaufene Feature-Freischaltungen bereinigt`);
    return result;
  }
}

export const featureService = new FeatureService();
