# 📖 SMS Admin-Handbuch

## Vollständige Anleitung für Plattform-Administratoren

**Version 1.0 | 2026**

---

## Inhaltsverzeichnis

1. [Erste Schritte](#erste-schritte)
2. [Dashboard](#dashboard)
3. [Mandanten-Verwaltung](#mandanten-verwaltung)
4. [Abonnement-Verwaltung](#abonnement-verwaltung)
5. [Tarif-Verwaltung](#tarif-verwaltung)
6. [Entwickler-Einstellungen](#entwickler-einstellungen)
7. [Hilfe-Center](#hilfe-center)
8. [Kritische Berichte](#kritische-berichte)

---

## Erste Schritte

### Login

1. Öffnen Sie: `https://ihre-domain.de/platform`
2. Geben Sie Ihre Admin-E-Mail ein
3. Geben Sie Ihr Passwort ein
4. Klicken Sie auf "Anmelden"

### Dashboard-Überblick

Nach dem Login sehen Sie das Dashboard mit:
- **MRR** (Monthly Recurring Revenue)
- **ARR** (Annual Recurring Revenue)
- **Tenant-Übersicht** (aktiv, Test, gesperrt)
- **Kritische Berichte** (sofortige Handlung erforderlich)

---

## Dashboard

### Übersichtskarten

| Karte | Beschreibung |
|-------|-------------|
| **MRR** | Monatliche wiederkehrende Einnahmen |
| **ARR** | Jährliche wiederkehrende Einnahmen (MRR × 12) |
| **Aktive Mandanten** | Anzahl aktiver Lizenzen |
| **Test-Mandanten** | Anzahl in der Testphase |
| **Gesperrte Mandanten** | Anzahl gesperrter Lizenzen |

### Kritische Berichte

Das Dashboard zeigt automatisch Probleme mit Lösungsvorschlägen:

**🔴 Kritisch** (Sofort handeln):
- Überfällige Zahlungen
- Gesperrte Tenants
- Hohe Churn-Rate
- Umsatzrückgang

**🟡 Warnung** (Bald handeln):
- Auslaufende Testphasen
- Viele fehlgeschlagene Logins

**🔵 Info** (Zur Kenntnis):
- Neue Mandanten
- System-Updates

Jeder Bericht enthält:
- Beschreibung des Problems
- Anzahl betroffener Einheiten
- Konkrete Lösungsvorschläge
- Priorität (Hoch/Mittel/Niedrig)

---

## Mandanten-Verwaltung

### Neuen Mandanten anlegen

1. Klicken Sie auf "Mandanten" in der Sidebar
2. Klicken Sie auf "+ Neuer Mandant"
3. Füllen Sie das Formular aus:
   - Firmenname
   - Kontakt-E-Mail
   - Kontakt-Telefon
   - Adresse
4. Wählen Sie den Anfangsstatus:
   - **TEST**: 30 Tage Testphase (Standard)
   - **ACTIVE**: Sofort aktiv
5. Setzen Sie das Mitarbeiter-Limit
6. Klicken Sie auf "Erstellen"

### Mandanten bearbeiten

1. Klicken Sie auf den gewünschten Mandanten
2. Ändern Sie die Daten
3. Klicken Sie auf "Speichern"

### Lizenz-Status ändern

**Verfügbare Status:**

| Status | Beschreibung | Zugriff |
|--------|-------------|---------|
| TEST | Testphase | Voller Zugriff |
| ACTIVE | Aktiviert | Voller Zugriff |
| PAYMENT_PENDING | Zahlung ausstehend | Eingeschränkt |
| GRACE_PERIOD | Kulanzfrist | Eingeschränkt |
| RESTRICTED | Eingeschränkt | Nur Lesen |
| SUSPENDED | Gesperrt | Kein Zugriff |
| CANCELLED | Gekündigt | Nur Export |

**Status ändern:**
1. Mandant auswählen
2. Auf "Lizenz-Status" klicken
3. Neuen Status wählen
4. Grund eingeben (optional)
5. Bestätigen

### Features für VIP-Kunden freischalten

Für besonders gute Kunden können Sie Premium-Features kostenlos aktivieren:

1. Mandant auswählen
2. Tab "Features" öffnen
3. Feature auswählen
4. Grund eingeben (z.B. "Treuer Kunde seit 3 Jahren")
5. Optional: Ablaufdatum setzen
6. Klick auf "Kostenlos freischalten"

---

## Abonnement-Verwaltung

### Subscription erstellen

1. Gehen Sie zu "Abonnements"
2. Klicken Sie auf "+ Neues Abonnement"
3. Wählen Sie den Mandanten
4. Wählen Sie den Tarif
5. Stellen Sie ein:
   - Abrechnungsintervall (Monatlich/Jährlich)
   - Startdatum
   - Testphase (optional)
6. Klicken Sie auf "Erstellen"

### Subscription kündigen

1. Subscription auswählen
2. Klick auf "Kündigen"
3. Wählen Sie:
   - **Sofort**: Zugang endet sofort
   - **Zum Periodenende**: Zugang bis zum bezahlten Zeitraum
4. Grund eingeben
5. Bestätigen

### Subscription reaktivieren

1. Gekündigte Subscription auswählen
2. Klick auf "Reaktivieren"
3. Neuer Status: ACTIVE
4. Zugang wird sofort wiederhergestellt

---

## Tarif-Verwaltung

### Neuen Tarif erstellen

1. Gehen Sie zu "Tarife"
2. Klick auf "+ Neuer Tarif"
3. Füllen Sie aus:
   - Name (z.B. "Professional")
   - Slug (z.B. "professional")
   - Beschreibung
   - Preis (Monatlich/Jährlich)
   - Mitarbeiter-Limit
4. Aktivieren Sie die Features:
   - Basic Scheduling
   - Advanced Scheduling
   - Time Tracking
   - Billing
   - API Access
   - etc.
5. Speichern

### Tarif bearbeiten

1. Tarif auswählen
2. Daten ändern
3. Speichern

⚠️ **Achtung**: Preisänderungen gelten nur für neue Subscriptions!

---

## Entwickler-Einstellungen

### Übersicht

Das Entwickler-Menü (⚙️) enthält alle technischen Einstellungen:

### Allgemein
- Systemname
- Version
- Wartungsmodus

### E-Mail
- SMTP-Host (z.B. smtp.gmail.com)
- SMTP-Port (z.B. 587)
- SMTP-User
- SMTP-Passwort
- Absender-E-Mail
- Absender-Name

**Testen:** Klick auf "E-Mail Verbindung testen"

### Zahlungen (Stripe)
- Testmodus (Ja/Nein)
- Public Key
- Secret Key
- Webhook Secret

**Einrichtung:**
1. Stripe-Account erstellen: https://stripe.com
2. API Keys kopieren
3. Hier eintragen
4. Webhook-URL in Stripe: `https://ihre-domain.de/api/platform/webhooks/stripe`
5. Webhook Secret kopieren und hier eintragen
6. Verbindung testen

### Bank/SEPA
- Bankverbindungen verwalten
- IBAN, BIC, Bankname
- Gläubiger-ID für SEPA
- SEPA-Lastschriften ausführen

**SEPA-Lastschrift einrichten:**
1. Gläubiger-ID bei Bank beantragen
2. Bankverbindung hier eintragen
3. Kunden-Mandate verwalten
4. Sammellastschrift ausführen

### API-Keys
- DATEV API-Key
- SMS API-Key
- Push API-Key
- Maps API-Key
- Webhook API-Key

**Neuen Key erstellen:**
1. Klick auf entsprechenden Button
2. Name eingeben
3. Key wird automatisch generiert
4. Key sicher aufbewahren (wird nur einmal angezeigt!)

### Sicherheit
- Max. Login-Versuche (Standard: 5)
- Sperrdauer in Minuten (Standard: 15)
- Min. Passwortlänge (Standard: 8)
- 2FA erforderlich (Ja/Nein)

### Benachrichtigungen
- E-Mail Benachrichtigungen
- SMS Benachrichtigungen
- Push Benachrichtigungen

### Backup
- Automatische Backups (Ja/Nein)
- Intervall (Täglich/Wöchentlich/Monatlich)
- Aufbewahrung in Tagen (Standard: 30)

---

## Hilfe-Center

### Übersicht

Das Hilfe-Center (📚) enthält:
- Admin-Anleitungen
- Anwender-Hilfe
- API-Dokumentation
- Fehlerbehebung

### Artikel durchsuchen

1. Suchfeld oben verwenden
2. Oder Kategorie wählen:
   - 📖 Alle Artikel
   - 🔧 Admin-Anleitungen
   - 👤 Anwender-Hilfe
   - 🔗 API-Dokumentation
   - 🔨 Fehlerbehebung

### Neuen Artikel erstellen

1. Klick auf "+ Neuer Artikel"
2. Kategorie wählen
3. Titel eingeben
4. Inhalt schreiben (Markdown unterstützt)
5. Tags hinzufügen
6. Veröffentlichen

### Artikel drucken/versenden

Jeder Artikel kann:
- 🖨️ Gedruckt werden (PDF)
- 📧 Per E-Mail versendet werden

---

## Kritische Berichte

### Berichtstypen

#### Zahlungsprobleme
- Überfällige Zahlungen
- Gescheiterte Zahlungen
- Mahnungen erforderlich

**Lösungen:**
- Automatische Mahnungen aktivieren
- SEPA-Lastschrift einführen
- Kunden kontaktieren

#### Lizenzprobleme
- Auslaufende Testphasen
- Gesperrte Tenants

**Lösungen:**
- Erinnerungs-E-Mails senden
- Rabatt für schnelle Konvertierung
- Persönliche Follow-up Calls

#### Sicherheitsprobleme
- Viele fehlgeschlagene Logins
- Verdächtige Aktivitäten

**Lösungen:**
- Rate Limiting verschärfen
- 2FA aktivieren
- IP-Whitelist verwenden

#### Umsatzprobleme
- Umsatzrückgang
- Hohe Churn-Rate

**Lösungen:**
- Churn-Analyse durchführen
- Win-back Kampagne starten
- Upselling bei bestehenden Kunden

### Berichte exportieren

1. Klick auf "PDF Export"
2. Bericht wird generiert
3. Download oder E-Mail-Versand

---

## API-Dokumentation

### Basis-URL
```
https://ihre-domain.de/api/platform
```

### Authentifizierung

Alle API-Calls benötigen einen Bearer-Token:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://ihre-domain.de/api/platform/tenants
```

### Endpunkte

#### Dashboard
```
GET /dashboard              - Dashboard-Statistiken
GET /dashboard/critical-reports - Kritische Berichte
GET /dashboard/revenue-stats   - Umsatz-Statistiken
```

#### Mandanten
```
GET    /tenants              - Alle Mandanten
POST   /tenants              - Neuen Mandanten erstellen
GET    /tenants/:id          - Mandant-Details
PUT    /tenants/:id          - Mandant aktualisieren
PUT    /tenants/:id/license  - Lizenz-Status ändern
```

#### Abonnements
```
GET    /subscriptions              - Alle Abonnements
POST   /subscriptions              - Neues Abonnement
GET    /subscriptions/tenant/:id   - Abos eines Tenants
PUT    /subscriptions/:id          - Abo aktualisieren
POST   /subscriptions/:id/cancel   - Abo kündigen
POST   /subscriptions/:id/reactivate - Abo reaktivieren
```

#### Tarife
```
GET    /plans        - Alle Tarife
POST   /plans        - Neuen Tarif
GET    /plans/:id    - Tarif-Details
PUT    /plans/:id    - Tarif aktualisieren
DELETE /plans/:id    - Tarif löschen
```

#### Entwickler
```
GET    /developer/settings           - Einstellungen
PUT    /developer/settings           - Einstellungen aktualisieren
POST   /developer/settings/reset     - Auf Standard zurücksetzen
POST   /developer/test-connection    - Verbindung testen
GET    /developer/api-keys           - API-Keys
POST   /developer/api-keys           - API-Key erstellen
DELETE /developer/api-keys/:id       - API-Key löschen
GET    /developer/bank-connections   - Bankverbindungen
POST   /developer/bank-connections   - Bankverbindung hinzufügen
POST   /developer/sepa/batch-collect - Sammellastschrift
```

#### Hilfe
```
GET    /help/articles         - Alle Artikel
POST   /help/articles         - Artikel erstellen
GET    /help/articles/:slug   - Artikel-Details
PUT    /help/articles/:id     - Artikel aktualisieren
DELETE /help/articles/:id     - Artikel löschen
GET    /help/categories       - Kategorien
GET    /help/popular          - Beliebte Artikel
```

### Beispiele

#### Mandant erstellen
```bash
curl -X POST https://ihre-domain.de/api/platform/tenants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Security GmbH",
    "contactEmail": "info@security.de",
    "employeeLimit": 50,
    "licenseStatus": "TEST"
  }'
```

#### Lizenz-Status ändern
```bash
curl -X PUT https://ihre-domain.de/api/platform/tenants/123/license \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACTIVE",
    "reason": "Subscription aktiviert"
  }'
```

#### Feature freischalten
```bash
curl -X POST https://ihre-domain.de/api/platform/tenants/123/features/grant \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "featureKey": "datev_export",
    "reason": "VIP-Kunde"
  }'
```

---

## Fehlerbehebung

### Login funktioniert nicht
1. Passwort zurücksetzen
2. Browser-Cache leeren
3. Andere Browser testen
4. Admin kontaktieren

### Dashboard lädt nicht
1. Internetverbindung prüfen
2. Browser aktualisieren
3. Developer Console prüfen (F12)
4. Admin kontaktieren

### E-Mails werden nicht gesendet
1. Entwickler → E-Mail prüfen
2. SMTP-Daten überprüfen
3. "Verbindung testen" klicken
4. Fehlermeldung notieren

### Zahlungen funktionieren nicht
1. Entwickler → Zahlungen prüfen
2. Stripe Keys überprüfen
3. Webhook-URL in Stripe prüfen
4. "Verbindung testen" klicken

---

## Support

### Kontakt
- **E-Mail**: support@sms-platform.com
- **Telefon**: +49 (0) 123 456789
- **Dokumentation**: docs/ Ordner

### Notfall
Bei kritischen Problemen:
1. Wartungsmodus aktivieren
2. Support kontaktieren
3. Logs sichern

---

## Externe Kunden-API (Add-on)

### Überblick

Die **External Customer API** ist ein Add-on, das Kunden für **€99/Monat** buchen können. Sie ermöglicht die Integration des SMS in eigene Systeme.

### API-Endpunkte

```
Basis-URL: https://ihre-domain.de/api/external
Auth: X-API-Key Header
Rate Limit: 10.000 Requests/Tag
```

**Verfügbare Endpunkte:**

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/me` | GET | API-Key Info |
| `/employees` | GET | Mitarbeiter auflisten |
| `/employees` | POST | Mitarbeiter anlegen |
| `/customers` | GET | Kunden auflisten |
| `/customers` | POST | Kunde anlegen |
| `/objects` | GET | Objekte auflisten |
| `/deployments` | GET | Einsätze auflisten |
| `/time-entries` | POST | Zeiteintrag anlegen |
| `/webhooks` | GET | Webhooks auflisten |
| `/webhooks` | POST | Webhook registrieren |

### API-Key erstellen

1. Gehen Sie zu **Entwickler → API-Keys**
2. Klicken Sie auf **"+ Externer API-Key"**
3. Vergeben Sie einen Namen (z.B. "Kunde Müller - ERP Integration")
4. Key wird generiert und angezeigt
5. **Wichtig:** Key sofort an Kunden weitergeben (wird nur einmal angezeigt!)

### Beispiel-Anfrage

```bash
curl -H "X-API-Key: sms_external_abc123def456" \
  https://ihre-domain.de/api/external/employees
```

### Vollständige Dokumentation

Siehe: **docs/CUSTOMER-API.md**

---

## Audit-Logs & Rollback

### Überblick

Das **Audit-Log-System** protokolliert alle Änderungen im System. Entwickler können:
- Logs für alle Tenant einsehen
- Versehentliche Änderungen rückgängig machen
- Statistiken überwachen

### Audit-Logs einsehen

1. Gehen Sie zu **Audit-Logs** in der Sidebar
2. Filtern Sie nach:
   - Tenant
   - Aktion (CREATE, UPDATE, DELETE, LOGIN)
   - Entity Type (Employee, Customer, etc.)
   - Zeitraum
3. Klicken Sie auf **Details** für vollständige Informationen

### Änderung rückgängig machen (Rollback)

**Wichtig:** Rollback sollte nur bei versehentlichen Änderungen verwendet werden!

1. Log in der Tabelle finden
2. Auf **Rollback** klicken
3. Bestätigen Sie die Aktion
4. System stellt den alten Zustand wieder her

**Unterstützte Rollbacks:**
- ✅ CREATE → Entity wird gelöscht
- ✅ UPDATE → Alter Zustand wird wiederhergestellt
- ✅ DELETE → Entity wird wiederhergestellt

**Nicht unterstützt:**
- ❌ LOGIN/LOGOUT (nur Informationen)
- ❌ ROLLBACK (Rollback eines Rollbacks)

### Statistiken

Das Dashboard zeigt:
- **Gesamt**: Alle Logs
- **Letzte 24h**: Logs der letzten 24 Stunden
- **Letzte 7 Tage**: Logs der letzten Woche
- **Aktionen**: Verteilung nach Aktionstyp

### API-Endpunkte

```
GET    /api/platform/audit-logs              - Alle Logs
GET    /api/platform/audit-logs/tenant/:id   - Logs für Tenant
GET    /api/platform/audit-logs/:logId       - Log-Details
POST   /api/platform/audit-logs/:logId/rollback - Rollback
GET    /api/platform/audit-logs/stats        - Statistiken
```

---

## Anhänge

### A. Lizenz-Status Übersicht

| Status | Zugriff | Zahlung | Aktion |
|--------|---------|---------|--------|
| TEST | ✅ Voll | - | Automatisch nach 30 Tagen |
| ACTIVE | ✅ Voll | ✅ Bezahlt | - |
| PAYMENT_PENDING | ⚠️ Eingeschränkt | ❌ Ausstehend | Mahnen |
| GRACE_PERIOD | ⚠️ Eingeschränkt | ❌ Überfällig | Kulanz |
| RESTRICTED | ❌ Nur Lesen | ❌ Überfällig | Sperren |
| SUSPENDED | ❌ Kein | ❌ Gesperrt | Kontaktieren |
| CANCELLED | ❌ Nur Export | - | Archivieren |

### B. Feature-Keys Übersicht

```
Integrationen:
- datev_export
- stripe_payment
- api_access
- webhooks
- zapier_integration

Automatisierung:
- auto_planning
- auto_billing
- auto_notifications
- auto_reports

Erweitert:
- advanced_reports
- advanced_scheduling
- gps_tracking
- mobile_app

Kommunikation:
- sms_notifications
- push_notifications
- customer_portal

Security:
- audit_log
- two_factor_auth
- ip_whitelist

Support:
- priority_support
- dedicated_support
- sla_guarantee

White-Label:
- custom_branding
- custom_domain
- white_label
```

### C. Datenbank-Schema (Auszug)

```
PlatformAdmin
├── id (UUID)
├── email (unique)
├── passwordHash
├── firstName, lastName
└── isActive

Tenant
├── id (UUID)
├── tenantId (unique)
├── companyName
├── contactEmail
├── licenseStatus (Enum)
├── employeeLimit
└── createdById (FK)

Subscription
├── id (UUID)
├── tenantId (FK)
├── planId (FK)
├── status (Enum)
├── billingInterval
├── currentPeriodStart/End
└── monthlyRevenue

Plan
├── id (UUID)
├── name
├── slug (unique)
├── monthlyPrice, yearlyPrice
├── employeeLimit
└── features (JSON)

SystemSettings
├── id (UUID)
├── key (unique)
└── value (JSON)

ApiKey
├── id (UUID)
├── name
├── key (unique)
├── type
└── isActive

BankConnection
├── id (UUID)
├── name
├── iban
├── bic
├── creditorId
└── isDefault

HelpArticle
├── id (UUID)
├── category
├── title
├── slug (unique)
├── content
└── tags (Array)
```

---

**© 2026 SMS - Security Management System**
**Alle Rechte vorbehalten**

*Dieses Dokument ist vertraulich und nur für interne Verwendung.*
