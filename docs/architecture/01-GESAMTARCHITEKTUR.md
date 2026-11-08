# SMS – Security Management System
## Technische Gesamtarchitektur

**Version:** 1.0.0
**Datum:** 2026-11-08
**Status:** Phase 0 – Planung

---

## 1. Systemübersicht

Das Security Management System (SMS) ist eine webbasierte Anwendung zur zentralen Verwaltung von Sicherheitsdienstleistungen. Die Software unterstützt die komplette Bandbreite von Mitarbeiterverwaltung über Dienstplanung, Zeiterfassung bis hin zur Kundenabrechnung.

### 1.1 Architekturprinzip

```
┌─────────────────────────────────────────────────────────────┐
│                      Clients (Browser)                       │
│  Windows PC │ macOS │ Linux │ Android │ iOS │ Tablet        │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS / WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                        │
│         SSL-Terminierung │ Routing │ Rate Limiting           │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
┌──────────────────────┐  ┌─────────────────────────────────┐
│   Frontend (React)   │  │    Backend (Node.js/Express)     │
│   Statische Dateien  │  │    REST API + WebSocket Server   │
│   Port 3000          │  │    Port 4000                     │
└──────────────────────┘  └─────────┬───────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                  ┌───────────────┐  ┌────────────────┐
                  │  PostgreSQL   │  │   Redis        │
                  │  (Datenbank)  │  │   (optional)   │
                  │  Port 5432    │  │   Port 6379    │
                  └───────────────┘  └────────────────┘
```

### 1.2 Technologie-Stack

| Schicht       | Technologie                              |
|---------------|------------------------------------------|
| Frontend      | React 18 + TypeScript + Tailwind CSS     |
| Backend       | Node.js 20 LTS + TypeScript              |
| API           | REST (Express.js) + WebSocket (Socket.io) |
| Datenbank     | PostgreSQL 16                            |
| ORM           | Prisma 5                                 |
| Auth          | JWT + bcrypt + HTTPOnly Cookies          |
| Container     | Docker + Docker Compose                   |
| Proxy         | Nginx (Let's Encrypt für SSL)            |
| Cache         | Redis (optional, bedarfsorientiert)      |

---

## 2. Ordnerstruktur

```
Protektor/
├── docker/                          # Docker-Konfiguration
│   ├── nginx/
│   │   └── nginx.conf              # Nginx-Konfiguration
│   ├── Dockerfile.frontend          # Frontend-Build
│   ├── Dockerfile.backend           # Backend-Build
│   └── entrypoint.sh               # Container-Startskript
├── scripts/
│   ├── install/                     # Installationsskripte
│   │   ├── install-raspberry-pi.sh
│   │   ├── install-mini-pc.sh
│   │   ├── install-synology.sh
│   │   └── install-vps.sh
│   ├── backup/                      # Backup-Skripte
│   │   ├── backup.sh
│   │   ├── restore.sh
│   │   └── backup-cron.sh
│   └── update.sh                   # Update-Skript
├── server/                          # Backend-Anwendung
│   ├── prisma/
│   │   ├── schema.prisma           # Datenbank-Schema
│   │   └── migrations/             # Datenbank-Migrationen
│   ├── src/
│   │   ├── index.ts                # Anwendungseinstieg
│   │   ├── config/                 # Konfiguration
│   │   │   ├── env.ts              # Umgebungsvariablen
│   │   │   ├── database.ts         # DB-Verbindung
│   │   │   ├── websocket.ts        # WebSocket-Setup
│   │   │   └── logger.ts           # Logging
│   │   ├── controllers/            # Request-Handler
│   │   │   ├── auth.controller.ts
│   │   │   ├── employee.controller.ts
│   │   │   ├── customer.controller.ts
│   │   │   ├── object.controller.ts
│   │   │   ├── deployment.controller.ts
│   │   │   ├── scheduling.controller.ts
│   │   │   ├── attendance.controller.ts
│   │   │   ├── billing.controller.ts
│   │   │   ├── report.controller.ts
│   │   │   ├── admin.controller.ts
│   │   │   ├── locking.controller.ts
│   │   │   └── notification.controller.ts
│   │   ├── middleware/             # Express Middleware
│   │   │   ├── auth.ts             # Authentifizierung
│   │   │   ├── authorization.ts    # Berechtigungsprüfung
│   │   │   ├── locking.ts          # Sperr-Prüfung
│   │   │   ├── audit.ts            # Änderungsprotokoll
│   │   │   ├── validation.ts       # Eingabevalidierung
│   │   │   ├── rateLimiter.ts      # Rate Limiting
│   │   │   └── errorHandler.ts     # Fehlerbehandlung
│   │   ├── routes/                 # API-Endpunkte
│   │   │   ├── index.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── employee.routes.ts
│   │   │   ├── customer.routes.ts
│   │   │   ├── object.routes.ts
│   │   │   ├── deployment.routes.ts
│   │   │   ├── scheduling.routes.ts
│   │   │   ├── attendance.routes.ts
│   │   │   ├── billing.routes.ts
│   │   │   ├── report.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   ├── locking.routes.ts
│   │   │   └── notification.routes.ts
│   │   ├── services/              # Geschäftslogik
│   │   │   ├── auth.service.ts
│   │   │   ├── employee.service.ts
│   │   │   ├── customer.service.ts
│   │   │   ├── object.service.ts
│   │   │   ├── deployment.service.ts
│   │   │   ├── scheduling.service.ts
│   │   │   ├── attendance.service.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── report.service.ts
│   │   │   ├── locking.service.ts
│   │   │   ├── websocket.service.ts
│   │   │   ├── pdf.service.ts
│   │   │   ├── export.service.ts
│   │   │   ├── backup.service.ts
│   │   │   ├── autoPlanner.service.ts
│   │   │   └── replacement.service.ts
│   │   ├── utils/                 # Hilfsfunktionen
│   │   │   ├── dateUtils.ts
│   │   │   ├── pdfUtils.ts
│   │   │   ├── excelUtils.ts
│   │   │   └── validators.ts
│   │   ├── types/                 # TypeScript-Typen
│   │   │   ├── index.ts
│   │   │   ├── auth.types.ts
│   │   │   ├── employee.types.ts
│   │   │   ├── scheduling.types.ts
│   │   │   └── websocket.types.ts
│   │   └── validators/            # Validierungsschemata
│   │       ├── auth.validator.ts
│   │       ├── employee.validator.ts
│   │       └── scheduling.validator.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── client/                          # Frontend-Anwendung
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── index.tsx               # Einstiegspunkt
│   │   ├── App.tsx                 # Hauptkomponente
│   │   ├── components/            # Wiederverwendbare Komponenten
│   │   │   ├── layout/            # Layout-Komponenten
│   │   │   ├── common/            # Gemeinsame Komponenten
│   │   │   ├── dashboard/         # Dashboard-Komponenten
│   │   │   ├── employees/         # Mitarbeiter-Komponenten
│   │   │   ├── customers/         # Kunden-Komponenten
│   │   │   ├── objects/           # Objekt-Komponenten
│   │   │   ├── deployments/       # Einsatz-Komponenten
│   │   │   ├── scheduling/        # Dienstplan-Komponenten
│   │   │   ├── attendance/        # Zeiterfassungs-Komponenten
│   │   │   ├── billing/           # Abrechnungs-Komponenten
│   │   │   ├── reports/           # Statistik-Komponenten
│   │   │   ├── admin/             # Admin-Komponenten
│   │   │   └── auth/              # Auth-Komponenten
│   │   ├── pages/                 # Seiten-Komponenten
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── customers/
│   │   │   ├── objects/
│   │   │   ├── deployments/
│   │   │   ├── scheduling/
│   │   │   ├── attendance/
│   │   │   ├── billing/
│   │   │   ├── reports/
│   │   │   ├── admin/
│   │   │   └── auth/
│   │   ├── hooks/                 # Custom React Hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useLocking.ts
│   │   │   └── usePermissions.ts
│   │   ├── services/              # API-Service-Layer
│   │   │   ├── api.ts             # Axios-Instanz
│   │   │   ├── auth.service.ts
│   │   │   ├── employee.service.ts
│   │   │   ├── customer.service.ts
│   │   │   ├── object.service.ts
│   │   │   ├── deployment.service.ts
│   │   │   ├── scheduling.service.ts
│   │   │   ├── attendance.service.ts
│   │   │   ├── billing.service.ts
│   │   │   └── websocket.service.ts
│   │   ├── types/                 # Frontend-Typen
│   │   │   └── index.ts
│   │   ├── utils/                 # Hilfsfunktionen
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── constants.ts
│   │   └── contexts/              # React Contexts
│   │       ├── AuthContext.tsx
│   │       ├── WebSocketContext.tsx
│   │       └── NotificationContext.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml              # Haupt-Compose-Datei
├── docker-compose.dev.yml          # Entwicklungs-Compose-Datei
├── .env.example                    # Beispiel-Umgebungsvariablen
├── .gitignore
├── README.md
└── LICENSE
```

---

## 3. Datenfluss

### 3.1 Standard-Request-Flow

```
Browser → Nginx → Express Route → Middleware-Kette
                                    ├── Auth-Middleware (JWT validieren)
                                    ├── Permission-Middleware (Rolle prüfen)
                                    ├── Lock-Middleware (Sperre prüfen)
                                    ├── Validation-Middleware (Eingaben prüfen)
                                    └── Controller → Service → Prisma → PostgreSQL
                                                              ↓
                                               WebSocket → Alle betroffenen Clients
```

### 3.2 WebSocket-Flow

```
Browser ←→ Socket.io Server ←→ Event-Bus
                  │
                  ├── Neue Sperre erstellt
                  ├── Sperre freigegeben
                  ├── Dienstplan geändert
                  ├── Mitarbeiter hinzugefügt/geändert
                  ├── Einsatz erstellt/geändert
                  ├── Krankmeldung erfasst
                  ├── Zeiterfassung geändert
                  └── Systembenachrichtigung
```

### 3.3 Locking-Flow

```
Benutzer A öffnet Datensatz → POST /api/locks/acquire
    ├── Sperre erstellen (DB-Transaktion)
    ├── WebSocket: "lock:acquired" an alle
    └── Heartbeat starten (alle 30s)

Benutzer A speichert → PUT /api/resource/:id
    ├── Sperre prüfen (Lock-Middleware)
    ├── Daten ändern (DB-Transaktion)
    ├── Versionsnummer erhöhen
    ├── WebSocket: "resource:updated" an alle
    └── Sperre bei Erfolg beibehalten

Benutzer A schließt → DELETE /api/locks/:lockId
    ├── Sperre freigeben
    └── WebSocket: "lock:released" an alle

Heartbeat ausbleibt (Timeout 90s) → Cron-Job
    └── Abgelaufene Sperren automatisch freigeben
```

---

## 4. Sicherheitsarchitektur

### 4.1 Authentifizierung

- **JWT-basiert** mit HttpOnly-Cookies
- Access Token: 15 Minuten Gültigkeit
- Refresh Token: 7 Tage Gültigkeit
- Passwort-Hashing: bcrypt (cost factor 12)
- Sitzungsmanagement mit automatischer Abmeldung bei Inaktivität

### 4.2 Autorisierung

- Rollenbasierte Zugriffskontrolle (RBAC)
- Feingranulare Berechtigungen pro Ressource und Aktion
- Middleware-basierte Prüfung vor jedem API-Aufruf
- Serverseitige Validierung aller Eingaben

### 4.3 Datenschutz (DSGVO)

- Verschlüsselte Passwörter (bcrypt)
- HttpOnly-Cookies für Token
- CSRF-Schutz
- XSS-Schutz durch Content Security Policy
- Rate Limiting gegen Brute-Force
- Audit-Log für alle sicherheitsrelevanten Aktionen
- Datenlöschkonzept nach DSGVO

---

## 5. Skalierbarkeit

### 5.1 Horizontale Skalierung

- Stateless Backend-Server (Session in DB)
- PostgreSQL als Single Source of Truth
- Redis für WebSocket-Pub/Sub bei mehreren Backend-Instanzen (optional)
- Nginx als Load Balancer (bei Bedarf)

### 5.2 Minimale Systemanforderungen

| Zielplattform       | RAM  | CPU      | Speicher |
|---------------------|------|----------|----------|
| Raspberry Pi 5      | 4 GB | 4× A76   | 32 GB SD |
| Mini-PC (N100)      | 8 GB | 4× N100  | 128 GB   |
| Synology NAS        | 4 GB | ARM/x86  | Verfügbar |
| Linux-VPS           | 2 GB | 2 vCPU   | 40 GB    |
