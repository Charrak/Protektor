/**
 * Zentrale Definition aller Berechtigungen und Standardrollen
 * Single Source of Truth für das Permission-System
 */

export interface PermissionDef {
  slug: string;
  name: string;
  module: string;
  description: string;
}

export interface RoleDef {
  slug: string;
  name: string;
  description: string;
  /** '*' = alle Berechtigungen, sonst Liste von Permission-Slugs */
  perms: '*' | string[];
}

// ═══════════════════════════════════════════════
// ALLE BERECHTIGUNGEN
// ═══════════════════════════════════════════════

export const PERMISSIONS: PermissionDef[] = [
  // Dashboard
  { slug: 'dashboard:view', name: 'Dashboard anzeigen', module: 'dashboard', description: 'Dashboard einsehen' },

  // Mitarbeiter
  { slug: 'employees:view', name: 'Mitarbeiter anzeigen', module: 'employees', description: 'Mitarbeiter-Liste einsehen' },
  { slug: 'employees:create', name: 'Mitarbeiter erstellen', module: 'employees', description: 'Neue Mitarbeiter anlegen' },
  { slug: 'employees:edit', name: 'Mitarbeiter bearbeiten', module: 'employees', description: 'Mitarbeiterdaten ändern' },
  { slug: 'employees:delete', name: 'Mitarbeiter löschen', module: 'employees', description: 'Mitarbeiter deaktivieren' },
  { slug: 'employee.manage', name: 'Mitarbeiter verwalten', module: 'employees', description: 'Vollständige Mitarbeiterverwaltung' },

  // Kunden
  { slug: 'customers:view', name: 'Kunden anzeigen', module: 'customers', description: 'Kunden-Liste einsehen' },
  { slug: 'customers:create', name: 'Kunden erstellen', module: 'customers', description: 'Neue Kunden anlegen' },
  { slug: 'customers:edit', name: 'Kunden bearbeiten', module: 'customers', description: 'Kundendaten ändern' },
  { slug: 'customers:delete', name: 'Kunden löschen', module: 'customers', description: 'Kunden deaktivieren' },

  // Objekte
  { slug: 'objects:view', name: 'Objekte anzeigen', module: 'objects', description: 'Objekte einsehen' },
  { slug: 'objects:create', name: 'Objekte erstellen', module: 'objects', description: 'Neue Objekte anlegen' },
  { slug: 'objects:edit', name: 'Objekte bearbeiten', module: 'objects', description: 'Objektdaten ändern' },
  { slug: 'objects:delete', name: 'Objekte löschen', module: 'objects', description: 'Objekte deaktivieren' },

  // Dienstplanung
  { slug: 'scheduling:view', name: 'Dienstplanung anzeigen', module: 'scheduling', description: 'Dienstpläne einsehen' },
  { slug: 'scheduling:create', name: 'Dienstplanung erstellen', module: 'scheduling', description: 'Einsätze planen' },
  { slug: 'scheduling:edit', name: 'Dienstplanung bearbeiten', module: 'scheduling', description: 'Einsätze ändern' },
  { slug: 'scheduling:delete', name: 'Dienstplanung löschen', module: 'scheduling', description: 'Einsätze löschen' },
  { slug: 'scheduling:auto_plan', name: 'Auto-Planung', module: 'scheduling', description: 'Automatische Dienstplanung' },
  { slug: 'scheduling:view_all', name: 'Alle Dienstpläne anzeigen', module: 'scheduling', description: 'Dienstpläne aller Mitarbeiter einsehen' },

  // Zeiterfassung
  { slug: 'attendance:view', name: 'Zeiterfassung anzeigen', module: 'attendance', description: 'Zeiten einsehen' },
  { slug: 'attendance:create', name: 'Zeiterfassung erstellen', module: 'attendance', description: 'Zeiten erfassen' },
  { slug: 'attendance:edit', name: 'Zeiterfassung bearbeiten', module: 'attendance', description: 'Zeiten ändern' },
  { slug: 'attendance:approve', name: 'Zeiterfassung genehmigen', module: 'attendance', description: 'Zeiten genehmigen' },
  { slug: 'attendance:view_all', name: 'Alle Zeiterfassungen anzeigen', module: 'attendance', description: 'Zeiten aller Mitarbeiter einsehen' },

  // Abrechnung
  { slug: 'billing.create', name: 'Abrechnung erstellen', module: 'billing', description: 'Rechnungen/Gehälter erstellen' },
  { slug: 'billing.read', name: 'Abrechnung anzeigen (DATEV)', module: 'billing', description: 'Rechnungen/Gehälter einsehen' },
  { slug: 'billing:invoices', name: 'Rechnungen verwalten', module: 'billing', description: 'Kundenrechnungen' },
  { slug: 'billing:payroll', name: 'Gehälter verwalten', module: 'billing', description: 'Lohnabrechnung' },

  // Berichte
  { slug: 'reports:view', name: 'Berichte anzeigen', module: 'reports', description: 'Berichte und Auswertungen' },
  { slug: 'reports:export', name: 'Berichte exportieren', module: 'reports', description: 'Berichte als Datei exportieren' },

  // Einstellungen
  { slug: 'settings:view', name: 'Einstellungen anzeigen', module: 'settings', description: 'Einstellungen einsehen' },
  { slug: 'settings:edit', name: 'Einstellungen bearbeiten', module: 'settings', description: 'Einstellungen ändern' },

  // Administration
  { slug: 'admin:roles', name: 'Rollen verwalten', module: 'admin', description: 'Rollen und Berechtigungen' },
  { slug: 'admin:users', name: 'Benutzer verwalten', module: 'admin', description: 'Benutzerkonten verwalten' },
  { slug: 'admin:tenants', name: 'Mandanten verwalten', module: 'admin', description: 'Mandantenverwaltung' },
  { slug: 'admin:settings', name: 'Systemeinstellungen', module: 'admin', description: 'Systemweite Einstellungen' },
  { slug: 'admin:audit_log', name: 'Audit-Log', module: 'admin', description: 'Audit-Protokoll einsehen' },
];

// ═══════════════════════════════════════════════
// STANDARDROLLEN
// ═══════════════════════════════════════════════

export const DEFAULT_ROLES: RoleDef[] = [
  {
    slug: 'admin',
    name: 'Administrator',
    description: 'Vollzugriff auf alle Funktionen',
    perms: '*',
  },
  {
    slug: 'dispatcher',
    name: 'Disponent',
    description: 'Dienstplanung und Einsatzsteuerung',
    perms: [
      'dashboard:view',
      'employees:view', 'employees:edit',
      'customers:view',
      'objects:view',
      'scheduling:view', 'scheduling:create', 'scheduling:edit', 'scheduling:delete', 'scheduling:auto_plan',
      'attendance:view', 'attendance:edit', 'attendance:approve',
    ],
  },
  {
    slug: 'teamleader',
    name: 'Teamleiter',
    description: 'Teamverwaltung und Zeitgenehmigung',
    perms: [
      'dashboard:view',
      'employees:view',
      'scheduling:view',
      'attendance:view', 'attendance:approve',
      'reports:view',
    ],
  },
  {
    slug: 'employee',
    name: 'Mitarbeiter',
    description: 'Eigene Daten einsehen',
    perms: [
      'dashboard:view',
      'attendance:view', 'attendance:create',
      'scheduling:view',
    ],
  },
  {
    slug: 'accountant',
    name: 'Buchhaltung',
    description: 'Abrechnung und Gehälter',
    perms: [
      'dashboard:view',
      'employees:view',
      'billing.read', 'billing.create', 'billing:invoices', 'billing:payroll',
      'reports:view',
    ],
  },
];
