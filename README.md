# SMS – Security Management System

Professionelle webbasierte Verwaltungssoftware für Sicherheitsdienstleister.

## Funktionen

- **Dashboard** – Übersicht über alle wichtigen Kennzahlen
- **Mitarbeiterverwaltung** – Stammdaten, Qualifikationen, Dokumente
- **Kundenverwaltung** – Kunden, Ansprechpartner, Verträge
- **Objektverwaltung** – Bewachungsobjekte, Anforderungen
- **Dienstplanung** – Tages-/Wochen-/Monatsansicht, Drag & Drop
- **Automatische Personalplanung** – Intelligente Eignungsbewertung
- **Ersatzpersonalsuche** – Automatische Kandidatenfindung bei Ausfällen
- **Zeiterfassung** – Arbeitszeiten, Pausen, Nacht-/Sonn-/Feiertagszuschläge
- **Stundenkontrolle** – Überstunden, Ruhezeiten, Arbeitszeitgrenzen
- **Lohnberechnung** – Mitarbeitervergütung mit Zuschlägen
- **Kundenabrechnung** – Rechnungen erstellen, PDF-Export
- **PDF & Dokumente** – Dokumentenverwaltung, Export
- **Statistiken** – Berichte und Auswertungen
- **Benutzerverwaltung** – Rollenbasierte Berechtigungen
- **Änderungsprotokoll** – Vollständige Nachverfolgung aller Änderungen
- **Bearbeitungssperren** – Verhindert gleichzeitiges Bearbeiten

## Technologie

| Schicht | Technologie |
|---------|-------------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Backend | Node.js 20 + TypeScript + Express |
| API | REST + WebSocket (Socket.io) |
| Datenbank | PostgreSQL 16 + Prisma ORM |
| Container | Docker + Docker Compose |
| Proxy | Nginx |

## Kompatibilität

- ✅ Raspberry Pi 5 (ARM64)
- ✅ Mini-PC (Intel N100, AMD64)
- ✅ Synology NAS (Container Manager)
- ✅ Linux VPS / Cloud Server
- ✅ Alle Docker-fähigen Linux-Systeme

## Quick Start

```bash
# Projekt klonen
git clone https://github.com/Charrak/Protektor.git
cd Protektor

# Konfiguration
cp .env.example .env
# .env anpassen (Passwörter, Secrets)

# Starten
docker compose up -d --build

# Datenbank initialisieren
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx prisma/seed.ts

# Öffnen: http://localhost
# Login: admin / admin123
```

## Dokumentation

- [Gesamtarchitektur](docs/architecture/01-GESAMTARCHITEKTUR.md)
- [Datenbankkonzept](docs/database/01-DATENBANKKONZEPT.md)
- [API-Endpunkte](docs/api/01-API-ENDPUNKTE.md)
- [Locking-Konzept](docs/architecture/02-LOCKING-KONZEPT.md)
- [Berechtigungskonzept](docs/architecture/03-BERECHTIGUNGSKONZEPT.md)
- [WebSocket-Events](docs/architecture/04-WEBSOCKET-EVENTS.md)
- [Backup-Strategie](docs/architecture/05-BACKUP-STRATEGIE.md)

### Installationsanleitungen

- [Raspberry Pi 5](docs/INSTALLATION-RASPBERRY-PI.md)
- [Mini-PC](docs/INSTALLATION-MINI-PC.md)
- [Synology NAS](docs/INSTALLATION-SYNOLOGY.md)
- [Linux VPS](docs/INSTALLATION-VPS.md)

## Entwicklung

```bash
# Backend
cd server
npm install
npm run dev

# Frontend
cd client
npm install
npm run dev
```

## Lizenz

Proprietär – Alle Rechte vorbehalten.
