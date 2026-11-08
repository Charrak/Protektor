# SaaS-Lizenzverwaltung - Technische Architektur

## 1. Systemübersicht

Das SMS wird von einer Einzelanwendung zu einer Multi-Tenant SaaS-Plattform erweitert.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZENTRALE PLATTFORM                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Lizenz-Server (separate DB)                              │  │
│  │  - Tenant-Verwaltung                                       │  │
│  │  - Subscription-Management                                 │  │
│  │  - Stripe Integration                                      │  │
│  │  - License Key Validation                                  │  │
│  │  - Usage Tracking                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS + License Check
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Tenant A     │  │  Tenant B     │  │  Tenant C     │
│  (SMS Instanz)│  │  (SMS Instanz)│  │  (SMS Instanz)│
│  Tenant-ID: 1 │  │  Tenant-ID: 2 │  │  Tenant-ID: 3 │
└───────────────┘  └───────────────┘  └───────────────┘
```

## 2. Mandantenfähigkeit (Multi-Tenancy)

### 2.1 Datenisolation

Jede Datenbanktabelle erhält ein `tenantId`-Feld:

```sql
-- Alle Mandanten-bezogenen Tabellen
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Employee" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SMSObject" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Deployment" ADD COLUMN "tenantId" TEXT;
-- ... etc
```

### 2.2 Tenant-Context Middleware

```typescript
// Jede API-Request wird mit tenantId validiert
app.use(tenantMiddleware);

// Middleware prüft:
// 1. License-Key im Header
// 2. Tenant-Status (ACTIVE, SUSPENDED, etc.)
// 3. Mitarbeiter-Limit nicht überschritten
// 4. Feature-Flags für abonnierte Module
```

### 2.3 Repository-Pattern

```typescript
// Alle Queries filtern automatisch nach tenantId
class EmployeeRepository {
  async findAll(tenantId: string) {
    return prisma.employee.findMany({
      where: { tenantId, deletedAt: null }
    });
  }
}
```

## 3. Lizenz-Server (Separate Datenbank)

### 3.1 Datenbank-Schema

```sql
-- Zentrale Lizenz-Datenbank (license_db)

CREATE TABLE "Tenant" (
  id UUID PRIMARY KEY,
  companyName VARCHAR(200),
  contactEmail VARCHAR(255),
  licenseKey VARCHAR(100) UNIQUE,
  status VARCHAR(50), -- TEST, ACTIVE, SUSPENDED, etc.
  maxEmployees INTEGER,
  createdAt TIMESTAMP,
  expiresAt TIMESTAMP
);

CREATE TABLE "Subscription" (
  id UUID PRIMARY KEY,
  tenantId UUID REFERENCES "Tenant"(id),
  planId UUID REFERENCES "Plan"(id),
  stripeCustomerId VARCHAR(100),
  stripeSubscriptionId VARCHAR(100),
  status VARCHAR(50),
  currentPeriodStart TIMESTAMP,
  currentPeriodEnd TIMESTAMP,
  cancelAtPeriodEnd BOOLEAN
);

CREATE TABLE "Plan" (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  stripePriceId VARCHAR(100),
  monthlyPrice DECIMAL(10,2),
  yearlyPrice DECIMAL(10,2),
  maxEmployees INTEGER,
  features JSONB
);

CREATE TABLE "PaymentEvent" (
  id UUID PRIMARY KEY,
  tenantId UUID REFERENCES "Tenant"(id),
  stripeEventId VARCHAR(200),
  eventType VARCHAR(100),
  status VARCHAR(50),
  receivedAt TIMESTAMP,
  processedAt TIMESTAMP
);
```

### 3.2 Lizenz-Status

```typescript
enum LicenseStatus {
  TEST = 'TEST',              // Testphase (14 Tage)
  ACTIVE = 'ACTIVE',          // Voll aktiv
  PAYMENT_PENDING = 'PAYMENT_PENDING',  // Zahlung ausstehend
  GRACE_PERIOD = 'GRACE_PERIOD',        // Kulanzfrist (7 Tage)
  RESTRICTED = 'RESTRICTED',            // Eingeschränkt
  SUSPENDED = 'SUSPENDED',              // Voll gesperrt
  CANCELLED = 'CANCELLED'               // Gekündigt
}
```

### 3.3 Zugriffsbeschränkungen nach Status

| Status | Lesen | Erstellen | Bearbeiten | Export |
|--------|-------|-----------|------------|--------|
| TEST | ✓ | ✓ | ✓ | ✓ |
| ACTIVE | ✓ | ✓ | ✓ | ✓ |
| PAYMENT_PENDING | ✓ | ✓ | ✓ | ✓ |
| GRACE_PERIOD | ✓ | ✗ | ✗ | ✓ |
| RESTRICTED | ✓ | ✗ | ✗ | ✓ |
| SUSPENDED | ✗ | ✗ | ✗ | ✗ |
| CANCELLED | ✗ | ✗ | ✗ | ✗ |

## 4. API-Integration

### 4.1 License Check Endpoint

```http
POST /api/license/validate
Headers:
  X-License-Key: {{licenseKey}}
  X-Instance-ID: {{instanceId}}

Response:
{
  "valid": true,
  "tenantId": "uuid",
  "status": "ACTIVE",
  "maxEmployees": 50,
  "features": ["scheduling", "billing"],
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

### 4.2 Heartbeat (alle 24h)

```http
POST /api/license/heartbeat
Headers:
  X-License-Key: {{licenseKey}}

Body:
{
  "instanceId": "uuid",
  "employeeCount": 45,
  "version": "1.0.0"
}
```

## 5. Offline-Kulanzzeit

Bei Internetausfall:
- Lokaler Cache der letzten Lizenz-Validierung
- Konfigurierbare Offline-Dauer (Standard: 7 Tage)
- Nach Ablauf: Read-Only Modus
- Automatische Reaktivierung bei Internet-Rückkehr

## 6. Stripe Integration

### 6.1 Webhooks

```typescript
// Stripe Webhook Handler
app.post('/webhooks/stripe', (req, res) => {
  const event = req.body;
  
  switch(event.type) {
    case 'invoice.payment_succeeded':
      handlePaymentSuccess(event);
      break;
    case 'invoice.payment_failed':
      handlePaymentFailure(event);
      break;
    case 'customer.subscription.deleted':
      handleSubscriptionCancelled(event);
      break;
  }
});
```

### 6.2 Zahlungsstatus-Synchronisation

```typescript
async function syncPaymentStatus(tenantId: string) {
  const subscription = await getStripeSubscription(tenantId);
  
  switch(subscription.status) {
    case 'active':
      await updateLicenseStatus(tenantId, 'ACTIVE');
      break;
    case 'past_due':
      await updateLicenseStatus(tenantId, 'PAYMENT_PENDING');
      break;
    case 'canceled':
      await updateLicenseStatus(tenantId, 'CANCELLED');
      break;
  }
}
```

## 7. Plattform-Dashboard

### 7.1 Metriken

- Anzahl Tenant (gesamt, aktiv, inaktiv)
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn Rate
- Employee utilization pro Tenant
- Feature usage statistics

### 7.2 Admin-Aktionen

- Tenant erstellen/aktivieren/deaktivieren
- Subscription manuell anpassen
- Testphase verlängern
- License-Key regenerieren
- Zahlungshistorie einsehen
