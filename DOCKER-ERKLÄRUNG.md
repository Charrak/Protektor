# 🐳 Docker-Konfiguration erklärt

## Wie Docker die Dateien findet

### 1. docker-compose.yml (Hauptkonfiguration)

Die `docker-compose.yml` definiert **alle Services** und wo deren Dateien zu finden sind:

```yaml
services:
  backend:
    build:
      context: ./server          # ← Hier sucht Docker nach Dateien
      dockerfile: Dockerfile     # ← Dockerfile im context-Verzeichnis
    volumes:
      - ./server:/app            # ← Lokale Dateien in Container mounten
```

**Was bedeuten die Pfade?**

- `context: ./server` → Docker sucht im `server/` Ordner nach dem Dockerfile
- `dockerfile: Dockerfile` → Das Dockerfile heißt "Dockerfile" (Standard)
- `volumes: ./server:/app` → Lokaler `server/` Ordner wird in Container unter `/app` gemountet

### 2. Verzeichnisstruktur

```
Protektor/
├── docker-compose.yml          # Hauptkonfiguration
├── server/
│   ├── Dockerfile              # Backend Container Definition
│   ├── src/                    # Source Code
│   └── package.json
├── client/
│   ├── Dockerfile              # Frontend Container Definition
│   ├── src/                    # Source Code
│   └── package.json
└── .env                        # Environment Variables
```

## Ablauf: Was passiert bei `docker-compose up`?

### Schritt 1: Docker Compose liest Konfiguration

```bash
docker-compose up
```

Docker Comase:
1. Liest `docker-compose.yml`
2. Findet `backend` Service mit `context: ./server`
3. Geht in `server/` Verzeichnis
4. Sucht `Dockerfile`

### Schritt 2: Docker Image wird gebaut

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine              # Basis-Image
WORKDIR /app                     # Arbeitsverzeichnis im Container
COPY package*.json ./            # Kopiere package.json
COPY prisma ./prisma/            # Kopiere Prisma Schema
RUN npm ci                       # Installiere Dependencies
COPY . .                         # Kopiere gesamten Source Code
RUN npm run prisma:generate      # Generiere Prisma Client
EXPOSE 5000                      # Port freigeben
CMD ["npm", "run", "dev"]        # Starte Dev Server
```

**Was passiert:**
1. Node.js 18 wird als Basis installiert
2. `/app` wird als Arbeitsverzeichnis gesetzt
3. `package.json` wird kopiert
4. Dependencies werden installiert
5. **Gesamter Source Code** wird kopiert (`COPY . .`)
6. Prisma Client wird generiert
7. Dev Server wird gestartet

### Schritt 3: Container startet

Der Container läuft mit:
- Node.js 18
- Alle Dependencies installiert
- Source Code unter `/app`
- Port 5000 ist freigegeben

### Schritt 4: Volumes mounten (für Development)

```yaml
volumes:
  - ./server:/app                # Lokale Dateien → Container
```

**Vorteil:** Wenn du lokal eine Datei änderst, ist sie sofort im Container!
**Nachteil:** Langsamer als ohne Volumes (nur für Development)

## Netzwerk: Wie die Services kommunizieren

```yaml
services:
  backend:
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://sms_user:sms_password@postgres:5432/sms_db
      #                                                  ↑
      #                                     "postgres" = Service Name!
```

**Wichtig:** Services kommunizieren über **Service Names**, nicht über `localhost`!

- `postgres` → PostgreSQL Service
- `redis` → Redis Service
- `backend` → Backend Service
- `frontend` → Frontend Service

## Ports: Zugriff von außen

```yaml
ports:
  - "5000:5000"    # Host-Port:Container-Port
  - "5432:5432"
```

**Format:** `HOST_PORT:CONTAINER_PORT`

- `5000:5000` → Container Port 5000 ist erreichbar auf Host Port 5000
- Zugriff: `http://localhost:5000`

## Environment Variables

```yaml
environment:
  DATABASE_URL: postgresql://sms_user:sms_password@postgres:5432/sms_db
  NODE_ENV: development
```

**Oder aus `.env` Datei:**
```yaml
environment:
  - JWT_SECRET=${JWT_SECRET}
```

## Zusammenfassung: Wo sind die Dateien?

| Service | Context | Dockerfile | Source Code | Volumes |
|---------|---------|------------|-------------|---------|
| **Backend** | `./server` | `./server/Dockerfile` | `/app` in Container | `./server:/app` |
| **Frontend** | `./client` | `./client/Dockerfile` | `/app` in Container | `./client:/app` |
| **PostgreSQL** | - | `postgres:15-alpine` (Image) | `/var/lib/postgresql/data` | `postgres_data:/var/lib/postgresql/data` |
| **Redis** | - | `redis:7-alpine` (Image) | `/data` | `redis_data:/data` |

## Wichtige Befehle

### Container starten
```bash
docker-compose up              # Mit Logs
docker-compose up -d           # Im Hintergrund (detached)
```

### Logs ansehen
```bash
docker-compose logs            # Alle Services
docker-compose logs backend    # Nur Backend
docker-compose logs -f         # Follow (live)
```

### In Container rein
```bash
docker-compose exec backend sh           # Shell im Backend
docker-compose exec backend npm test     # Befehl ausführen
```

### Container stoppen
```bash
docker-compose down          # Stoppe alle
docker-compose down -v       # Stoppe alle + lösche Volumes
```

### Rebuild
```bash
docker-compose up --build    # Images neu bauen
docker-compose build backend # Nur Backend neu bauen
```

## Troubleshooting

### "Dockerfile not found"
```yaml
# Falsch:
build: ./server

# Richtig:
build:
  context: ./server
  dockerfile: Dockerfile
```

### "Cannot connect to database"
```yaml
# Falsch (localhost funktioniert nicht zwischen Containern):
DATABASE_URL: postgresql://user:pass@localhost:5432/db

# Richtig (Service Name verwenden):
DATABASE_URL: postgresql://user:pass@postgres:5432/db
```

### "Port already in use"
```yaml
# Ändere Host-Port:
ports:
  - "5001:5000"    # Backend auf Port 5001 statt 5000
  - "5174:5173"    # Frontend auf Port 5174 statt 5173
```

## Production vs Development

### Development (mit Volumes)
```yaml
volumes:
  - ./server:/app    # Live-Reload bei Änderungen
```

### Production (ohne Volumes, Copy)
```yaml
# Kein volume mount
# Code wird in Image kopiert (COPY . .)
# Schneller und stabiler
```

**Tipp:** Für Production separate `docker-compose.prod.yml` erstellen!

## Visualisierung

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Frontend   │  │   Backend    │  │  PostgreSQL  │ │
│  │  :5173       │→ │  :5000       │→ │  :5432       │ │
│  │  ./client    │  │  ./server    │  │  (Image)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                  │          │
│         └─────────────────┴──────────────────┘          │
│                           │                             │
│                    ┌──────────────┐                    │
│                    │    Redis     │                    │
│                    │    :6379     │                    │
│                    │   (Image)    │                    │
│                    └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
         ↑
         │
    localhost:5173 (Browser)
```

## Fazit

Docker findet die Dateien durch:
1. **`context`** in `docker-compose.yml` → Wo suchen?
2. **`dockerfile`** in `docker-compose.yml` → Welches Dockerfile?
3. **`COPY`** in Dockerfile → Welche Dateien in Image?
4. **`volumes`** in `docker-compose.yml` → Welche Dateien mounten?

**Wichtig:** Pfade sind immer **relativ zur `docker-compose.yml`**!
