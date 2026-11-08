# SMS – Security Management System

Professionelle SaaS-Plattform für Sicherheitsdienstleister mit Multi-Tenant-Architektur.

## 🎯 Hauptfunktionen

### Kern-Module
- **Dashboard** – Echtzeit-Übersicht über alle Kennzahlen
- **Mitarbeiterverwaltung** – Stammdaten, Qualifikationen, Dokumente, Sicherheitszertifikate
- **Kundenverwaltung** – Kunden, Ansprechpartner, Verträge
- **Objektverwaltung** – Bewachungsobjekte, Anforderungen, Zutrittsberechtigungen
- **Dienstplanung** – Drag & Drop, automatische Personalplanung, Ersatzpersonalsuche
- **Zeiterfassung** – GPS-Stempeln, Pausen, Nacht-/Sonn-/Feiertagszuschläge
- **Abrechnung** – Automatische Kundenabrechnung, Lohnberechnung, PDF-Export
- **Berichte & Analysen** – Statistiken, Custom Reports, Benchmarking

### 🔒 Sicherheits-Features (Sicherheitsfirmen)
- **Bewachungserlaubnis (§34a GewO)** – Tracking mit Ablaufdaten
- **Waffensachkundenachweis** – Status & Ablaufdatum-Tracking
- **Erste-Hilfe-Zertifizierung** – Automatische Erinnerungen
- **Schlüsselverwaltung** – Vollständiges Schlüssel-Tracking
- **Incident-Management** – 11 Incident-Typen, 4 Schweregrade
- **Notfall-Protokolle** – Alarmpläne, Evakuierungsrouten, Sammelplätze
- **Zutrittsberechtigungen** – Granulare Zugriffskontrolle pro Objekt
- **Sicherheitsstufen** – 5-stufiges Berechtigungssystem
- **Führungszeugnis-Prüfung** – Nachweisbar für Behörden
- **Zuverlässigkeitsprüfung (§7 GewO)** – Vollständig dokumentiert

### 🏢 SaaS-Plattform Features
- **Multi-Tenant-Architektur** – Jede Firma hat isolierten Bereich
- **White-Label Branding** – Eigenes Logo, Farben, Willkommensnachricht
- **Automatische Tenant-Erstellung** – E-Mail mit "Passwort wählen" Button
- **Subscription-Management** – Starter (€99), Professional (€299), Enterprise (€699)
- **API-Zugang** – REST API mit Webhooks & Statistiken
- **DATEV-Integration** – Automatischer Mitarbeiter-Import (Premium Add-on)

### 🤖 KI-Features
- **Intelligente Dienstplanung** – KI-gestützte Optimierung
- **Automatische Eignungsbewertung** – Skill-basierte Zuordnung
- **Ersatzpersonalsuche** – Automatische Kandidatenfindung
- **KI-Training in Sandbox** – Echtzeit-Training mit Status-Updates

## 🏗️ Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | Node.js 20 + TypeScript + Express |
| API | REST + WebSocket (Socket.io) |
| Datenbank | PostgreSQL 16 + Prisma ORM |
| Cache | Redis 7 |
| Container | Docker + Docker Compose |
| Proxy | Nginx (Reverse Proxy) |
| Auth | JWT + bcryptjs |
| E-Mail | Nodemailer mit HTML-Templates |

## 📦 Installation

### Für Kunden (Production)
**Kein Quellcode, fertige Docker-Images:**

```bash
# Windows
Doppelklick auf install-customer.bat

# Mac/Linux
chmod +x install-customer.sh
./install-customer.sh
```

### Für Entwickler (Development)
**Mit Quellcode zum Anpassen:**

```bash
# Windows
Doppelklick auf install-developer.bat

# Mac/Linux
chmod +x install-developer.sh
./install-developer.sh
```

### Manuelle Installation
```bash
git clone https://github.com/Charrak/Protektor.git
cd Protektor

# Konfiguration
cp .env.example .env
# .env anpassen

# Docker starten
docker compose up -d --build

# Datenbank initialisieren
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx prisma/seed.ts

# Öffnen: http://localhost:5173
```

## 🖥️ Kompatibilität

- ✅ Raspberry Pi 5 (ARM64)
- ✅ Mini-PC (Intel N100, AMD64)
- ✅ Synology NAS (Container Manager)
- ✅ Linux VPS / Cloud Server
- ✅ Windows 10/11 mit Docker Desktop
- ✅ macOS (Intel & Apple Silicon)
- ✅ Alle Docker-fähigen Systeme

## 💼 Preismodelle

### 💼 Starter Plan - €99/Monat
- Bis 10 Mitarbeiter
- Alle Kern-Module
- 5 GB Speicher
- E-Mail Support

### 🏆 Professional Plan - €299/Monat
- Bis 50 Mitarbeiter
- + Dienstplanung, Abrechnung, Berichte
- 50 GB Speicher
- Priority Support
- API-Zugang (Basic)

### 🚀 Enterprise Plan - €699/Monat
- Unbegrenzte Mitarbeiter
- + KI-Planung, Custom Reports
- 500 GB Speicher
- Dedicated Support
- API-Zugang (Voll)
- SLA 99.9%

## 🎁 Premium Add-ons

- **DATEV Integration** – €49,90/Monat (Automatischer Mitarbeiter-Import)
- **Mobile App** – €19,90/Monat pro 10 MA (iOS & Android)
- **Erweiterte Berichte** – €39,90/Monat (Custom Reports, Benchmarking)
- **API-Zugang** – €99,90/Monat (REST API + Webhooks)

### Pakete
- **Starter Paket** – €149/Monat (Starter + DATEV)
- **Professional Paket** – €379/Monat (Professional + DATEV + Mobile App)
- **Enterprise Paket** – €799/Monat (Enterprise + Alle Add-ons)

## 📚 Dokumentation

### Architektur
- [Gesamtarchitektur](docs/architecture/01-GESAMTARCHITEKTUR.md)
- [Datenbankkonzept](docs/database/01-DATENBANKKONZEPT.md)
- [API-Endpunkte](docs/api/01-API-ENDPUNKTE.md)
- [Locking-Konzept](docs/architecture/02-LOCKING-KONZEPT.md)
- [Berechtigungskonzept](docs/architecture/03-BERECHTIGUNGSKONZEPT.md)
- [WebSocket-Events](docs/architecture/04-WEBSOCKET-EVENTS.md)
- [Backup-Strategie](docs/architecture/05-BACKUP-STRATEGIE.md)
- [SaaS-Architektur](docs/architecture/06-SAAS-ARCHITEKTUR.md)

### Installation
- [Allgemeine Installation](INSTALLATION.md)
- [Quick Start](QUICKSTART.md)
- [Docker Install Guide](DOCKER-INSTALL-GUIDE.md)
- [Raspberry Pi 5](docs/INSTALLATION-RASPBERRY-PI.md)
- [Mini-PC](docs/INSTALLATION-MINI-PC.md)
- [Synology NAS](docs/INSTALLATION-SYNOLOGY.md)
- [Linux VPS](docs/INSTALLATION-VPS.md)

### Betrieb & Verwaltung
- [Admin-Handbuch](docs/ADMIN-HANDBUCH.md)
- [SaaS-Lizenz-System](docs/SAAS-LICENSE-SYSTEM.md)
- [Customer API](docs/CUSTOMER-API.md)
- [Security](SECURITY.md)
- [Deployment](DEPLOYMENT.md)
- [Production Checklist](PRODUCTION-CHECKLIST.md)

### Verkauf & Marketing
- [Verkaufsstrategie (Markdown)](VERKAUFSSTRATEGIE.md)
- [Verkaufsstrategie (HTML/PDF)](VERKAUFSSTRATEGIE.html)
- [Add-ons Übersicht](docs/ADDONS.md)
- [Feature & Add-on System](FEATURE-UND-ADDON-SYSTEM.md)

### Spezielle Features
- [Sicherheits-Features](docs/SECURITY-FEATURES.md)
- [White-Label Branding](docs/WHITE-LABEL.md)
- [Webhook-System](docs/WEBHOOKS.md)
- [KI-Planung](docs/KI-PLANUNG.md)

## 🚀 Quick Commands

```bash
# Server starten
start-customer.bat      # Windows (Production)
start-developer.bat     # Windows (Development)
./start-customer.sh     # Mac/Linux (Production)
./start-developer.sh    # Mac/Linux (Development)

# Server stoppen
stop-customer.bat       # Windows (Production)
stop-developer.bat      # Windows (Development)
./stop-customer.sh      # Mac/Linux (Production)
./stop-developer.sh     # Mac/Linux (Development)

# Logs anzeigen
docker compose logs -f

# Datenbank-Backup
docker compose exec postgres pg_dump -U sms_user sms_db > backup.sql

# Updates installieren (Production)
docker compose pull
docker compose up -d
```

## 🔐 Sicherheit

- ✅ DSGVO-konform (Server in Deutschland)
- ✅ Multi-Tenant-Isolierung
- ✅ JWT-Authentifizierung
- ✅ bcrypt-Passwort-Hashing
- ✅ HTTPS/TLS-Verschlüsselung
- ✅ Audit-Log für alle Änderungen
- ✅ Rate Limiting
- ✅ Input-Sanitization
- ✅ SQL-Injection-Schutz
- ✅ XSS-Schutz

## 📊 Features im Detail

### Für Geschäftsführer
- Echtzeit-Dashboards
- Umsatz-Tracking
- Mitarbeiterauslastung
- Kundenübersicht
- Automatisierte Berichte

### Für Personaler
- Digitale Personalakte
- Qualifikations-Tracking
- Automatische Erinnerungen (Ablaufdaten)
- DATEV-Import
- Dokumentenmanagement

### Für Planer
- Drag & Drop Dienstplanung
- KI-gestützte Optimierung
- Automatische Ersatzpersonalsuche
- Konflikt-Erkennung
- Skill-basierte Zuordnung

### Für Mitarbeiter
- Mobile Zeiterfassung
- Push-Benachrichtigungen
- Dienstplan einsehen
- Stundenübersicht
- Abwesenheiten melden

## 💡 USP (Alleinstellungsmerkmale)

1. **White-Label** – Jede Firma sieht ihr eigenes Logo
2. **KI-gestützte Planung** – Lernt aus Ihren Daten
3. **DSGVO-konform** – Deutsche Server, maximale Sicherheit
4. **DATEV-Integration** – Automatischer Mitarbeiter-Import
5. **Mobile App** – Zeiterfassung von der Baustelle
6. **Echtzeit-Dashboards** – Live-Einblicke
7. **Webhook-System** – Integration in bestehende Systeme
8. **API-Zugang** – Volle Flexibilität für Entwickler

## 🎓 Schulung & Support

- 📧 **E-Mail:** support@sms-platform.com
- 📞 **Telefon:** +49 (0) 123 456 799
- 📚 **Dokumentation:** Umfangreiche Handbücher & Tutorials
- 🎥 **Video-Tutorials:** Coming soon
- 💬 **Community:** Slack-Channel für Fragen

## 🤝 Contributing

Dies ist ein proprietäres Projekt. Für contributions bitte Kontakt aufnehmen.

## 📝 Lizenz

Proprietär – Alle Rechte vorbehalten.

## 📞 Kontakt

- **Sales:** sales@sms-platform.com
- **Support:** support@sms-platform.com
- **Website:** www.sms-platform.com

---

**Bereit für die Zukunft der Sicherheitsbranche?** 🚀

© 2026 SMS Security Management System. Alle Rechte vorbehalten.
