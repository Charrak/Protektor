# 🚀 SMS Quickstart Guide

## Übersicht

Das SMS besteht aus zwei Hauptkomponenten:

1. **Platform Admin Portal** - Für dich als Software-Betreiber
   - Verwaltung aller Kunden (Tenants)
   - Subscription-Management
   - Lizenz-Verwaltung
   - Dashboard mit MRR/ARR

2. **Tenant App** - Für deine Kunden (Security-Unternehmen)
   - Mitarbeiter-Verwaltung
   - Kunden-Verwaltung
   - Einsatz-Planung
   - Zeiterfassung
   - Abrechnung

## Installation

### Voraussetzung

- Docker & Docker Compose installiert
- Node.js 18+ (für lokale Entwicklung)
- Git

### Schritt 1: Repository klonen

```bash
git clone <repository-url>
cd Protektor
```

### Schritt 2: Environment Variables konfigurieren

```bash
# Kopiere das Beispiel
cp .env.example .env

# Bearbeite .env mit deinen Einstellungen
nano .env  # oder vim, code, etc.
```

**Wichtige Einstellungen:**
- `JWT_SECRET`: Ändern für Production!
- `STRIPE_SECRET_KEY`: Stripe Test Key (optional)
- `SMTP_*`: Email-Konfiguration (optional)

### Schritt 3: Docker starten

```bash
# Starte alle Services
docker-compose up -d

# Oder für Development (mit Live-Reload)
docker-compose up
```

Die Services starten:
- ✅ PostgreSQL (Port 5432)
- ✅ Redis (Port 6379)
- ✅ Backend API (Port 5000)
- ✅ Frontend App (Port 5173)

### Schritt 4: Datenbank initialisieren

```bash
# Database Migration ausführen
docker-compose exec backend npx prisma migrate deploy

# Demo-Daten einspielen
docker-compose exec backend npm run seed
```

### Schritt 5: System öffnen

Öffne deinen Browser:

**🌐 Frontend App:** http://localhost:5173

## Zugangsdaten

### 📊 Platform Admin (Software-Betreiber)

**URL:** http://localhost:5173/platform

**Zugangsdaten:**
- Email: `admin@sms-platform.com`
- Password: `Admin123!`

**Funktionen:**
- Dashboard mit MRR/ARR
- Tenant-Verwaltung
- Subscription-Management
- Plan-Verwaltung
- Webhook-Logs

### 🏢 Tenant App (Kunden-Portal)

**URL:** http://localhost:5173

**Zugangsdaten:**
- License Key: `demo-license-key-12345`

**Funktionen:**
- Mitarbeiter verwalten
- Kunden verwalten
- Objekte verwalten
- Einsätze planen
- Zeiterfassung
- Berichte

## Demo-Daten

Das Seeding erstellt folgende Demo-Daten:

### Platform Admin
- 1 Platform Administrator

### Tenant (Demo Security GmbH)
- 1 Tenant mit ACTIVE Lizenz
- 1 Subscription (30 Tage)
- 3 Mitarbeiter (Max, Anna, Thomas)
- 2 Kunden (ABC GmbH, XYZ AG)

### Pläne
- Starter: 49.99€/Monat, 10 Mitarbeiter
- Professional: 149.99€/Monat, 50 Mitarbeiter
- Enterprise: 399.99€/Monat, 200 Mitarbeiter

## Testing-Szenarien

### Szenario 1: Als Platform Admin

1. Gehe zu http://localhost:5173/platform
2. Login mit `admin@sms-platform.com` / `Admin123!`
3. Dashboard ansehen (MRR, ARR, Tenant-Stats)
4. Tenants verwalten
5. Subscription-Status ändern
6. Neuen Tenant anlegen

### Szenario 2: Als Tenant-User (Kunde)

1. Gehe zu http://localhost:5173
2. License Key eingeben: `demo-license-key-12345`
3. Mitarbeiter hinzufügen
4. Kunden anlegen
5. Objekte verwalten
6. Einsatz planen
7. Zeiterfassung testen

### Szenario 3: Subscription Lifecycle

1. **Als Admin:** Neuen Tenant anlegen (Status: TEST)
2. **Als Admin:** Subscription erstellen (Status: TRIAL)
3. **Als Tenant:** System testen (30 Tage Trial)
4. **Als Admin:** Subscription auf ACTIVE setzen
5. **Als Tenant:** Volle Funktionalität nutzen

### Szenario 4: Lizenz-Status ändern

1. **Als Admin:** Tenant-Status auf SUSPENDED setzen
2. **Als Tenant:** Versuchen, neue Mitarbeiter anzulegen → Blockiert!
3. **Als Tenant:** Export-Funktion testen → Funktioniert!
4. **Als Admin:** Tenant-Status auf ACTIVE setzen
5. **Als Tenant:** Alles funktioniert wieder

## Lokale Entwicklung (ohne Docker)

### Backend starten

```bash
cd server

# Dependencies installieren
npm install

# Database migrations
npm run prisma:migrate

# Seed data
npm run seed

# Server starten
npm run dev
```

Backend läuft auf: http://localhost:5000

### Frontend starten

```bash
cd client

# Dependencies installieren
npm install

# Dev Server starten
npm run dev
```

Frontend läuft auf: http://localhost:5173

## API-Dokumentation

**Swagger UI:** http://localhost:5000/api-docs

Hier kannst du:
- Alle API-Endpunkte ansehen
- Requests testen
- Schema-Definitionen prüfen

## Troubleshooting

### Backend startet nicht

```bash
# Logs ansehen
docker-compose logs backend

# Container neu starten
docker-compose restart backend
```

### Database Connection Error

```bash
# PostgreSQL Status prüfen
docker-compose ps postgres

# PostgreSQL neu starten
docker-compose restart postgres
```

### Frontend kann nicht verbinden

Prüfe `CORS_ORIGIN` in `.env`:
```env
CORS_ORIGIN=http://localhost:5173
```

### Port bereits belegt

Ändere Ports in `docker-compose.yml`:
```yaml
ports:
  - "5001:5000"  # Backend auf 5001
  - "5174:5173"  # Frontend auf 5174
```

## Nächste Schritte

1. 📖 Lies die [Dokumentation](./docs/)
2. 🧪 Teste alle Features
3. 📊 Erstelle eigene Tenants
4. 💳 Richte Stripe ein (für Production)
5. 📧 Konfiguriere E-Mail-Versand
6. 🚀 Deploye zu Production

## Support

Bei Fragen:
- API Docs: http://localhost:5000/api-docs
- GitHub Issues: [Repository Issues]
- Documentation: ./docs/

---

**Viel Spaß beim Testen!** 🎉
