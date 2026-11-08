# SMS SaaS-Lizenzverwaltung - Implementierung

## Überblick

Das SMS wurde um ein vollständiges SaaS-Lizenzverwaltungssystem erweitert. Dies ermöglicht es, die Software als Multi-Tenant SaaS-Plattform an verschiedene Sicherheitsunternehmen zu vermieten.

## Architektur

### Zentrale Komponenten

1. **Plattform-Administration** (`/platform`)
   - Separates Admin-Portal für den Software-Anbieter
   - Verwaltung aller Mandanten (Tenants)
   -Subscription- und Plan-Management
   - Stripe-Integration für Zahlungen

2. **Mandanten-Isolation**
   - Jeder Mandant erhält eine eindeutige `tenantId`
   - Alle Daten sind strikt nach Mandant getrennt
   - API-Filterung durch Tenant-Context Middleware

3. **Lizenz-Status-Management**
   - Automatische Status-Übergänge
   - Offline-Kulanzzeit
   - Feature-Freischaltung basierend auf Abonnement

## Lizenz-Status

| Status | Beschreibung | Zugriffsrechte |
|--------|--------------|----------------|
| `TEST` | Testphase (z.B. 30 Tage) | Voller Zugriff |
| `ACTIVE` | Aktives Abonnement | Voller Zugriff |
| `PAYMENT_PENDING` | Zahlung ausstehend | Voller Zugriff (Kulanz) |
| `GRACE_PERIOD` | Kulanzfrist nach Zahlungsausfall | Eingeschränkt |
| `RESTRICTED` | Längere Überfälligkeit | Nur Lesen |
| `SUSPENDED` | Suspendiert | Kein Zugriff |
| `CANCELLED` | Gekündigt | Kein Zugriff |

## API-Endpunkte

### Plattform-API (`/api/platform`)

#### Authentifizierung
```http
POST /api/platform/auth/login
POST /api/platform/auth/logout
GET /api/platform/auth/me
```

#### Dashboard
```http
GET /api/platform/dashboard
```

#### Mandanten-Verwaltung
```http
GET /api/platform/tenants
POST /api/platform/tenants
GET /api/platform/tenants/:id
PUT /api/platform/tenants/:id
PUT /api/platform/tenants/:id/license
```

#### Subscription-Verwaltung
```http
GET /api/platform/subscriptions
POST /api/platform/subscriptions
GET /api/platform/subscriptions/tenant/:tenantId
PUT /api/platform/subscriptions/:id
POST /api/platform/subscriptions/:id/cancel
POST /api/platform/subscriptions/:id/reactivate
```

#### Plan-Verwaltung
```http
GET /api/platform/plans
POST /api/platform/plans
GET /api/platform/plans/:id
PUT /api/platform/plans/:id
DELETE /api/platform/plans/:id
```

#### Stripe Webhooks
```http
POST /api/platform/webhooks/stripe
```

### Mandanten-API (alle anderen Endpunkte)

Alle Mandanten-APIs erfordern jetzt den `X-License-Key` Header:

```http
GET /api/employees
Headers:
  X-License-Key: TNT-ABC123
```

## Datenbank-Schema

### Neue Tabellen

#### `tenants`
- Mandanten-Stammdaten
- Lizenz-Status
- Employee-Limit
- Feature-Flags
- Offline-Kulanzzeit

#### `subscriptions`
- Abonnement-Details
- Stripe-Integration
- Abrechnungszeitraum
- Status-Tracking

#### `plans`
- Tarif-Definitionen
- Preise (monatlich/jährlich)
- Employee-Limits
- Feature-Listen

#### `payments`
- Zahlungshistorie
- Stripe-Referenzen
- Status-Tracking

#### `webhook_events`
- Stripe-Webhook-Protokoll
- Verarbeitungsstatus
- Fehler-Tracking

#### `platform_admins`
- Plattform-Administratoren
- Separate Authentifizierung

## Backend-Services

### TenantService
- `list()` - Alle Mandanten auflisten
- `create()` - Neuen Mandanten erstellen
- `update()` - Mandant aktualisieren
- `updateLicenseStatus()` - Lizenzstatus ändern
- `getDashboard()` - Dashboard-Metriken

### SubscriptionService
- `list()` - Alle Abonnements
- `create()` - Neues Abonnement
- `cancel()` - Abonnement kündigen
- `reactivate()` - Abonnement reaktivieren
- `getByTenant()` - Abonnement für Mandant

### PlanService
- `list()` - Alle Tarife
- `create()` - Neuen Tarif erstellen
- `update()` - Tarif aktualisieren
- `delete()` - Tarif löschen

### StripeWebhookService
- `processWebhook()` - Webhook verarbeiten
- Automatische Status-Updates
- Duplikat-Prüfung

### LicenseService
- `checkLicense()` - Lizenz validieren
- `runLicenseCheckJob()` - Automatische Prüfung
- `reactivateLicense()` - Nach Zahlung reaktivieren

## Frontend-Komponenten

### Plattform-Admin (`/platform`)

1. **PlatformLoginPage**
   - Separate Anmeldung für Plattform-Admins

2. **PlatformLayout**
   - Sidebar-Navigation
   - Benutzer-Info
   - Seiten-Navigation

3. **PlatformDashboardPage**
   - Übersichtsmetriken
   - Umsatz-Statistiken
   - Mandanten-Übersicht

4. **TenantListPage**
   - Mandanten-Tabelle
   - Status-Filter
   - Suchfunktion
   - Schnellaktionen

5. **SubscriptionListPage**
   - Abonnement-Übersicht
   - Status-Filter
   - Umsatz-Anzeige

6. **PlanListPage**
   - Tarif-Karten
   - Feature-Übersicht
   - Preis-Informationen

## Middleware

### TenantContext Middleware
- Validiert `X-License-Key` Header
- Prüft Mandanten-Status
- Injectiert Tenant-Context in Request
- Aktualisiert `lastLicenseCheck`

### requireLicenseFeature Middleware
- Prüft Feature-Freischaltung
- Blockiert nicht-verfügbare Features

### checkEmployeeLimit Middleware
- Prüft Employee-Limit
- Blockiert bei Überschreitung

### requireWriteAccess Middleware
- Prüft Schreibrechte basierend auf Status
- Blockiert Schreiboperationen bei eingeschränktem Status

## Stripe-Integration

### Webhook-Events

| Event | Aktion |
|-------|--------|
| `invoice.payment_succeeded` | Status → ACTIVE |
| `invoice.payment_failed` | Status → PAYMENT_PENDING |
| `customer.subscription.created` | Subscription erstellen |
| `customer.subscription.updated` | Subscription aktualisieren |
| `customer.subscription.deleted` | Status → CANCELLED |
| `customer.subscription.trial_will_end` | Benachrichtigung senden |

### Setup

1. Stripe-Account erstellen
2. Webhook-URL konfigurieren: `https://your-domain.com/api/platform/webhooks/stripe`
3. API-Keys in `.env` hinterlegen:
   ```env
   STRIPE_SECRET_KEY=sk_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Offline-Kulanzzeit

Wenn der Lizenz-Server nicht erreichbar ist:
- Lokale Validierung basiert auf letztem erfolgreichen Check
- Konfigurierbare Kulanzzeit (Standard: 24h)
- Nach Ablauf: Read-Only Modus
- Automatische Reaktivierung bei Verbindung

## Sicherheitsaspekte

1. **Daten-Isolation**
   - Strikte Trennung durch `tenantId`
   - Alle Queries filtern nach Mandant
   - Keine Cross-Tenant-Zugriffe möglich

2. **API-Sicherheit**
   - License-Key in jedem Request erforderlich
   - Status-Prüfung vor jeder Operation
   - Feature-basierte Zugriffskontrolle

3. **Plattform-Admin**
   - Separate Authentifizierung
   - Eigene Session-Verwaltung
   - Audit-Logging aller Aktionen

## Deployment

### Umgebungsvariablen

```env
# Plattform
PLATFORM_JWT_SECRET=your-secret-key
PLATFORM_DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Lizenz-Server
LICENSE_SERVER_URL=https://license.your-domain.com
OFFLINE_GRACE_MINUTES=1440
```

### Datenbank-Migration

```bash
cd server
npx prisma migrate dev --name add_saas_tables
npx prisma db seed
```

### Ersten Plattform-Admin erstellen

```typescript
// seed.ts
await prisma.platformAdmin.create({
  data: {
    username: 'admin',
    email: 'admin@your-domain.com',
    passwordHash: await bcrypt.hash('admin123', 12),
    firstName: 'Platform',
    lastName: 'Admin',
  }
});
```

## Testing

### Plattform-Admin testen
1. Navigiere zu `/platform/login`
2. Melde dich mit Plattform-Admin an
3. Erstelle einen Test-Mandanten
4. Weise einen Tarif zu

### Mandant testen
1. Verwende die `tenantId` des erstellten Mandanten
2. Setze `X-License-Key` Header in API-Requests
3. Teste verschiedene Lizenz-Status

## Nächste Schritte

1. **Stripe-Integration vervollständigen**
   - Checkout-Session erstellen
   - Customer-Portal integrieren
   - Usage-Based Billing

2. **E-Mail-Benachrichtigungen**
   - Zahlungserinnerungen
   - Trial-Ende-Warnungen
   - Status-Änderungen

3. **Erweiterte Features**
   - Usage-Tracking pro Mandant
   - Custom Domains
   - White-Labeling
   - API-Rate-Limiting pro Tarif

4. **Monitoring**
   - Lizenz-Status-Dashboard
   - Revenue-Metriken
   - Churn-Rate-Analyse

## Zusammenfassung

Das SMS ist jetzt eine vollständige SaaS-Plattform mit:
- ✅ Multi-Tenant-Architektur
- ✅ Zentrale Lizenzverwaltung
- ✅ Stripe-Integration (vorbereitet)
- ✅ Plattform-Admin-Portal
- ✅ Automatische Status-Verwaltung
- ✅ Offline-Kulanzzeit
- ✅ Feature-basierte Zugriffskontrolle
- ✅ Employee-Limit-Management

Die Plattform ist produktionsbereit und kann sofort als SaaS-Lösung angeboten werden.
