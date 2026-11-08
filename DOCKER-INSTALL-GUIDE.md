# 🐳 Docker Installation Guide - Windows & Mac

Vollständige Anleitung zur Installation und zum Starten des SMS (Security Management System) mit Docker.

---

## 📋 Inhaltsverzeichnis

1. [Benötigte Software](#benötigte-software)
2. [Installation Windows](#installation-windows)
3. [Installation Mac](#installation-mac)
4. [Docker Grundlagen](#docker-grundlagen)
5. [SMS starten](#sms-starten)
6. [Demo-Daten einspielen](#demo-daten-einspielen)
7. [Zugangsdaten](#zugangsdaten)
8. [Wichtige Befehle](#wichtige-befehle)
9. [Troubleshooting](#troubleshooting)

---

## 🛠️ Benötigte Software

### 1. Docker Desktop

**Windows:**
- Download: https://www.docker.com/products/docker-desktop/
- Direkt-Link: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
- Größe: ~550 MB
- Systemanforderungen: Windows 10/11 64-bit, WSL 2 aktiviert

**Mac:**
- Download: https://www.docker.com/products/docker-desktop/
- Intel Mac: https://desktop.docker.com/mac/main/amd64/Docker.dmg
- Apple Silicon (M1/M2/M3): https://desktop.docker.com/mac/main/arm64/Docker.dmg
- Größe: ~700 MB
- Systemanforderungen: macOS 10.15 oder neuer

### 2. Git

**Windows:**
- Download: https://git-scm.com/download/win
- Direkt-Link: https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe
- Größe: ~50 MB

**Mac:**
- Download: https://git-scm.com/download/mac
- Oder via Homebrew: `brew install git`
- Größe: ~40 MB

### 3. Code Editor (Optional, aber empfohlen)

**Visual Studio Code:**
- Download: https://code.visualstudio.com/Download
- Windows: https://update.code.visualstudio.com/latest/win32-x64-user/stable
- Mac Intel: https://update.code.visualstudio.com/latest/darwin/stable
- Mac Apple Silicon: https://update.code.visualstudio.com/latest/darwin-arm64/stable
- Größe: ~100 MB

---

## 🪟 Installation Windows

### Schritt 1: WSL 2 aktivieren (Wichtig!)

Öffne **PowerShell als Administrator** und führe aus:

```powershell
# WSL Feature aktivieren
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Virtual Machine Platform aktivieren
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Computer neu starten
shutdown /r /t 0
```

Nach dem Neustart:

```powershell
# WSL 2 Kernel Update herunterladen
# Link: https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi
# Download und installieren

# WSL 2 als Standard setzen
wsl --set-default-version 2

# Ubuntu installieren (optional, aber empfohlen)
wsl --install -d Ubuntu
```

### Schritt 2: Docker Desktop installieren

1. **Download:**
   - Öffne: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
   - Oder gehe zu: https://www.docker.com/products/docker-desktop/

2. **Installation:**
   ```powershell
   # Installer ausführen (als Administrator)
   .\Docker Desktop Installer.exe
   ```

3. **Einstellungen während Installation:**
   - ✅ "Use WSL 2 instead of Hyper-V" (empfohlen)
   - ✅ "Add shortcut to desktop"
   - ✅ "Add to start menu"

4. **Nach Installation:**
   - Computer neu starten
   - Docker Desktop starten
   - Account erstellen oder als Guest fortfahren
   - Terms & Conditions akzeptieren

5. **Docker prüfen:**
   ```powershell
   # In PowerShell oder CMD
   docker --version
   docker-compose --version
   docker run hello-world
   ```

### Schritt 3: Git installieren

1. **Download:**
   - Öffne: https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe

2. **Installation:**
   - Alle Standard-Einstellungen übernehmen
   - Wichtig: "Use Git from the Windows Command Prompt" wählen
   - "Checkout as-is, commit Unix-style line endings" wählen

3. **Git konfigurieren:**
   ```powershell
   git config --global user.name "Dein Name"
   git config --global user.email "deine.email@example.com"
   ```

### Schritt 4: Visual Studio Code installieren (Optional)

1. **Download:**
   - Öffne: https://update.code.visualstudio.com/latest/win32-x64-user/stable

2. **Installation:**
   - ✅ "Add to PATH"
   - ✅ "Register Code as editor for supported file types"
   - ✅ "Add to context menu"

---

## 🍎 Installation Mac

### Schritt 1: Docker Desktop installieren

**Für Intel Mac:**
```bash
# Download
curl -L -o Docker.dmg "https://desktop.docker.com/mac/main/amd64/Docker.dmg"

# Mount DMG
hdiutil attach Docker.dmg

# In Applications kopieren
cp -R /Volumes/Docker/Docker.app /Applications/

# Unmount
hdiutil detach /Volumes/Docker

# DMG löschen
rm Docker.dmg
```

**Für Apple Silicon (M1/M2/M3):**
```bash
# Download
curl -L -o Docker.dmg "https://desktop.docker.com/mac/main/arm64/Docker.dmg"

# Mount DMG
hdiutil attach Docker.dmg

# In Applications kopieren
cp -R /Volumes/Docker/Docker.app /Applications/

# Unmount
hdiutil detach /Volumes/Docker

# DMG löschen
rm Docker.dmg
```

**Oder einfacher über Browser:**
1. Öffne: https://www.docker.com/products/docker-desktop/
2. Klicke auf "Download for Mac - Intel Chip" oder "Apple Silicon"
3. Öffne die heruntergeladene .dmg Datei
4. Ziehe Docker.app in Applications
5. Starte Docker aus Applications

### Schritt 2: Docker starten und konfigurieren

1. **Docker starten:**
   ```bash
   open /Applications/Docker.app
   ```

2. **Erster Start:**
   - Warte bis Docker vollständig gestartet ist (Symbol in Menüleiste)
   - Account erstellen oder als Guest fortfahren
   - Terms & Conditions akzeptieren

3. **Docker prüfen:**
   ```bash
   docker --version
   docker-compose --version
   docker run hello-world
   ```

### Schritt 3: Git installieren

**Option A: Über Homebrew (empfohlen)**
```bash
# Homebrew installieren (falls nicht vorhanden)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Git installieren
brew install git

# Git konfigurieren
git config --global user.name "Dein Name"
git config --global user.email "deine.email@example.com"
```

**Option B: Über Xcode Command Line Tools**
```bash
# Xcode Command Line Tools installieren
xcode-select --install

# Git konfigurieren
git config --global user.name "Dein Name"
git config --global user.email "deine.email@example.com"
```

### Schritt 4: Visual Studio Code installieren (Optional)

**Für Intel Mac:**
```bash
curl -L -o VSCode-darwin.zip "https://update.code.visualstudio.com/latest/darwin/stable"
unzip VSCode-darwin.zip
mv "Visual Studio Code.app" /Applications/
rm VSCode-darwin.zip
```

**Für Apple Silicon:**
```bash
curl -L -o VSCode-darwin-arm64.zip "https://update.code.visualstudio.com/latest/darwin-arm64/stable"
unzip VSCode-darwin-arm64.zip
mv "Visual Studio Code.app" /Applications/
rm VSCode-darwin-arm64.zip
```

---

## 🐳 Docker Grundlagen

### Was ist Docker?

Docker ist eine Plattform zur Containerisierung von Anwendungen. Container sind leichtgewichtige, portable Einheiten, die eine Anwendung mit allen ihren Abhängigkeiten enthalten.

**Vorteile:**
- ✅ "Funktioniert auf meinem Rechner" - Problem gelöst
- ✅ Isolierung: Jede Anwendung in eigenem Container
- ✅ Portabel: Läuft auf jedem System mit Docker
- ✅ Schnell: Container starten in Sekunden
- ✅ Effizient: Teilt sich Kernel mit Host-System

### Wichtige Begriffe

**Image:**
- Vorlage für Container
- Read-only
- Enthält Betriebssystem + Anwendung + Abhängigkeiten
- Beispiel: `postgres:15`, `node:18`

**Container:**
- Laufende Instanz eines Images
- Isolierte Umgebung
- Kann gestartet, gestoppt, gelöscht werden
- Beispiel: `sms-backend`, `sms-postgres`

**Docker Compose:**
- Tool zur Definition von Multi-Container Anwendungen
- YAML-Datei (`docker-compose.yml`)
- Startet alle Services mit einem Befehl

**Volume:**
- Persistenter Speicher für Container
- Daten bleiben erhalten auch nach Container-Löschung
- Beispiel: Datenbank-Dateien

**Network:**
- Virtuelles Netzwerk für Container-Kommunikation
- Container können über Hostnamen kommunizieren
- Beispiel: Backend erreicht Database über `postgres:5432`

### Wichtige Docker-Befehle

```bash
# Container verwalten
docker ps                    # Laufende Container anzeigen
docker ps -a                 # Alle Container (auch gestoppte)
docker start <name>          # Container starten
docker stop <name>           # Container stoppen
docker restart <name>        # Container neustarten
docker rm <name>             # Container löschen

# Images verwalten
docker images                # Alle Images anzeigen
docker pull <image>          # Image herunterladen
docker rmi <image>           # Image löschen

# Logs anzeigen
docker logs <name>           # Logs eines Containers
docker logs -f <name>        # Logs live verfolgen (follow)

# In Container hinein
docker exec -it <name> sh    # Shell in Container öffnen
docker exec -it <name> bash  # Bash in Container öffnen

# Docker Compose
docker-compose up            # Alle Services starten
docker-compose up -d         # Im Hintergrund starten
docker-compose down          # Alle Services stoppen
docker-compose restart       # Alle Services neustarten
docker-compose logs -f       # Logs aller Services verfolgen
docker-compose ps            # Status aller Services

# Ressourcen
docker stats                 # CPU/RAM usage aller Container
docker system df             # Speicherverbrauch
docker system prune          # Nicht genutzte Ressourcen löschen
```

---

## 🚀 SMS starten

### Schritt 1: Repository klonen

```bash
# Verzeichnis wählen
cd ~  # oder cd ~/Documents

# Repository klonen
git clone https://github.com/Charrak/Protektor.git

# In Projekt wechseln
cd Protektor
```

### Schritt 2: Environment konfigurieren

```bash
# .env Datei erstellen
cp .env.example .env

# .env bearbeiten (optional, Standard-Werte funktionieren für Demo)
nano .env  # oder: code .env (VS Code)
```

**Wichtige Einstellungen in .env:**
```env
# Database
DATABASE_URL=postgresql://sms_user:sms_password@postgres:5432/sms_db

# JWT Secret (für Production ändern!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars

# CORS
CORS_ORIGIN=http://localhost:5173

# Admin
PLATFORM_ADMIN_EMAIL=admin@sms-platform.com
PLATFORM_ADMIN_PASSWORD=Admin123!
```

### Schritt 3: Docker starten

```bash
# Alle Services starten (im Hintergrund)
docker-compose up -d

# ODER: Im Vordergrund (für Logs)
docker-compose up

# Warte bis alle Services gestartet sind (~30 Sekunden)
```

**Docker startet automatisch:**
- ✅ PostgreSQL Datenbank (Port 5432)
- ✅ Redis Cache (Port 6379)
- ✅ Backend API Server (Port 5000)
- ✅ Frontend React App (Port 5173)

### Schritt 4: Status prüfen

```bash
# Container-Status anzeigen
docker-compose ps

# Erwartete Ausgabe:
# NAME              STATUS
# sms-postgres      Up (healthy)
# sms-redis         Up (healthy)
# sms-backend       Up
# sms-frontend      Up
```

### Schritt 5: Logs prüfen

```bash
# Alle Logs
docker-compose logs

# Nur Backend Logs
docker-compose logs backend

# Logs live verfolgen
docker-compose logs -f backend
```

---

## 🎭 Demo-Daten einspielen

### Schritt 1: Database Migration ausführen

```bash
# Database Schema erstellen
docker-compose exec backend npx prisma migrate deploy
```

### Schritt 2: Demo-Daten einspielen

```bash
# Demo-Daten generieren
docker-compose exec backend npm run seed
```

**Demo-Daten enthalten:**
- ✅ 1 Platform Admin
- ✅ 3 Demo Tenants (Sicherheitsunternehmen)
- ✅ 45+ Mitarbeiter (verteilt auf Tenants)
- ✅ 30+ Kunden
- ✅ 50+ Objekte
- ✅ 100+ Einsätze (letzte 30 Tage)
- ✅ 500+ Zeiteinträge
- ✅ 3 Tarife (Starter, Professional, Enterprise)
- ✅ Subscription-Beispiele

### Schritt 3: Demo-Daten prüfen

```bash
# In Database Container
docker-compose exec postgres psql -U sms_user -d sms_db

# SQL Befehle
SELECT COUNT(*) FROM tenants;              # Anzahl Tenants
SELECT COUNT(*) FROM employees;            # Anzahl Mitarbeiter
SELECT COUNT(*) FROM customers;            # Anzahl Kunden
SELECT COUNT(*) FROM deployments;          # Anzahl Einsätze
\q                                         # PostgreSQL verlassen
```

---

## 🔐 Zugangsdaten

### Platform Admin (Software-Betreiber)

**URL:** http://localhost:5173/platform

**Login:**
- **Email:** `admin@sms-platform.com`
- **Password:** `Admin123!`

**Funktionen:**
- Dashboard mit Statistiken
- Tenant-Verwaltung
- Subscription-Management
- Lizenz-Status ändern
- Entwickler-Einstellungen
- Audit-Logs

---

### Tenant 1: Security Nord GmbH (Premium)

**URL:** http://localhost:5173

**License Key:** `lic_security-nord_premium`

**Login:**
- **Email:** `admin@security-nord.de`
- **Password:** `Password123!`

**Daten:**
- 20 Mitarbeiter
- 12 Kunden
- 15 Objekte
- Status: ACTIVE

---

### Tenant 2: Schutz & Dienstleistungen AG (Enterprise)

**URL:** http://localhost:5173

**License Key:** `lic_schutz-ag_enterprise`

**Login:**
- **Email:** `info@schutz-ag.de`
- **Password:** `Password123!`

**Daten:**
- 15 Mitarbeiter
- 10 Kunden
- 12 Objekte
- Status: ACTIVE

---

### Tenant 3: Secure Solutions UG (Startup/Test)

**URL:** http://localhost:5173

**License Key:** `lic_secure-solutions_test`

**Login:**
- **Email:** `kontakt@secure-solutions.de`
- **Password:** `Password123!`

**Daten:**
- 10 Mitarbeiter
- 8 Kunden
- 8 Objekte
- Status: TEST (30 Tage Testphase)

---

### API Dokumentation

**URL:** http://localhost:5000/api-docs

**Kein Login erforderlich** - Swagger UI ist öffentlich zugänglich

---

## 🔧 Wichtige Befehle

### SMS starten/stoppen

```bash
# Starten (Hintergrund)
docker-compose up -d

# Stoppen
docker-compose down

# Neustarten
docker-compose restart

# Alle Container + Volumes löschen (Achtung: Daten verloren!)
docker-compose down -v
```

### Logs anzeigen

```bash
# Alle Logs
docker-compose logs

# Backend Logs
docker-compose logs backend

# Frontend Logs
docker-compose logs frontend

# Database Logs
docker-compose logs postgres

# Logs live verfolgen
docker-compose logs -f backend
```

### In Container hinein

```bash
# Backend Shell
docker-compose exec backend sh

# PostgreSQL
docker-compose exec postgres psql -U sms_user -d sms_db

# Redis
docker-compose exec redis redis-cli
```

### Database Backup

```bash
# Backup erstellen
docker-compose exec postgres pg_dump -U sms_user sms_db > backup.sql

# Backup einspielen
cat backup.sql | docker-compose exec -T postgres psql -U sms_user sms_db
```

### Code aktualisieren

```bash
# Neuesten Code holen
git pull origin main

# Container neu bauen
docker-compose build

# Container neu starten
docker-compose up -d

# Database Migration (falls nötig)
docker-compose exec backend npx prisma migrate deploy
```

---

## 🔍 Troubleshooting

### Problem: Docker startet nicht

**Windows:**
```powershell
# WSL 2 prüfen
wsl --status

# WSL 2 aktualisieren
wsl --update

# Docker Desktop neu starten
# Task Manager → Docker Desktop → Beenden
# Docker Desktop neu starten
```

**Mac:**
```bash
# Docker Desktop beenden
# Rechtsklick auf Docker Icon → Quit Docker Desktop
# Neu starten aus Applications
```

### Problem: Port bereits belegt

```bash
# Prüfen welcher Prozess Port belegt
# Windows:
netstat -ano | findstr :5000
netstat -ano | findstr :5173

# Mac/Linux:
lsof -i :5000
lsof -i :5173

# Prozess beenden
# Windows: taskkill /PID <PID> /F
# Mac/Linux: kill -9 <PID>
```

### Problem: Database Connection Error

```bash
# Prüfe ob PostgreSQL läuft
docker-compose ps postgres

# PostgreSQL neustarten
docker-compose restart postgres

# Logs prüfen
docker-compose logs postgres

# Warte 10-20 Sekunden bis PostgreSQL fully started ist
```

### Problem: Container startet nicht

```bash
# Logs des Containers prüfen
docker-compose logs backend
docker-compose logs frontend

# Container neu bauen
docker-compose build --no-cache backend

# Container neu starten
docker-compose up -d --force-recreate backend
```

### Problem: Frontend nicht erreichbar

```bash
# Prüfe ob Frontend Container läuft
docker-compose ps frontend

# Frontend Logs prüfen
docker-compose logs frontend

# Frontend neustarten
docker-compose restart frontend

# Browser Cache leeren und neu laden
```

### Problem: "Cannot connect to Docker daemon"

**Windows:**
```powershell
# Docker Desktop starten
# Warten bis Docker vollständig gestartet ist (Icon in Taskleiste)
```

**Mac:**
```bash
# Docker Desktop starten
open /Applications/Docker.app

# Warten bis Docker vollständig gestartet ist (Icon in Menüleiste)
```

### Problem: "Permission denied" beim Ausführen von docker-compose

**Mac/Linux:**
```bash
# Docker-Gruppe erstellen (falls nicht vorhanden)
sudo groupadd docker

# Benutzer zur Docker-Gruppe hinzufügen
sudo usermod -aG docker $USER

# Neu anmelden oder:
newgrp docker

# Docker testen
docker run hello-world
```

---

## 📊 Ressourcen-Monitoring

```bash
# Docker Ressourcennutzung anzeigen
docker stats

# Container-Größe anzeigen
docker ps -s

# Gesamt-Speicherverbrauch
docker system df

# Detaillierte Speichernutzung
docker system df -v

# Nicht genutzte Ressourcen löschen
docker system prune -a
```

---

## 🎓 Tipps für Vorführungen

### 1. Vorbereitung

```bash
# Morning-of Demo Checklist:
docker-compose down -v              # Alles sauber neu machen
docker-compose up -d                # Services starten
sleep 30                            # Warten bis alles ready ist
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run seed
docker-compose ps                   # Prüfe ob alles läuft
```

### 2. Demo-Reihenfolge

1. **Platform Admin zeigen:**
   - Dashboard mit Statistiken
   - Tenant-Liste
   - Lizenz-Status ändern (TEST → ACTIVE → SUSPENDED)

2. **Tenant 1 (Premium) zeigen:**
   - Mitarbeiter-Verwaltung
   - Kunden & Objekte
   - Einsatzplanung
   - Zeiterfassung
   - Berichte

3. **Tenant 3 (Test) zeigen:**
   - Einschränkungen bei TEST-Status
   - Upgrade-Prozess

4. **Entwickler-Features zeigen:**
   - Einstellungen
   - API-Keys
   - Audit-Logs
   - Rollback-Funktion

### 3. Nützliche SQL-Queries für Live-Demo

```bash
# In PostgreSQL
docker-compose exec postgres psql -U sms_user -d sms_db

# Aktuelle Statistiken
SELECT 
  (SELECT COUNT(*) FROM tenants) as tenants,
  (SELECT COUNT(*) FROM employees) as employees,
  (SELECT COUNT(*) FROM deployments WHERE date >= CURRENT_DATE - INTERVAL '7 days') as deployments_last_7_days;

# Aktive Einsätze heute
SELECT d.date, e."firstName" || ' ' || e."lastName" as employee, o.name as object
FROM deployments d
JOIN employees e ON d."employeeId" = e.id
JOIN "SMSObject" o ON d."objectId" = o.id
WHERE d.date = CURRENT_DATE
ORDER BY d."startTime";

# Umsatz nach Tenant
SELECT t."companyName", SUM(p.amount) as revenue
FROM payments p
JOIN tenants t ON p."tenantId" = t.id
WHERE p.status = 'COMPLETED'
GROUP BY t."companyName"
ORDER BY revenue DESC;
```

---

## 📞 Support & Ressourcen

### Docker Dokumentation
- Offizielle Docs: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- Docker Desktop: https://docs.docker.com/desktop/

### SMS Dokumentation
- API Docs: http://localhost:5000/api-docs (wenn SMS läuft)
- Admin Handbuch: docs/ADMIN-HANDBUCH.md
- Customer API: docs/CUSTOMER-API.md
- Deployment Guide: DEPLOYMENT.md

### Hilfe
- GitHub Issues: https://github.com/Charrak/Protektor/issues
- Docker Community: https://forums.docker.com/
- Stack Overflow: https://stackoverflow.com/questions/tagged/docker

---

## ✅ Checklist für erfolgreiche Installation

### Windows
- [ ] WSL 2 aktiviert und aktualisiert
- [ ] Docker Desktop installiert und gestartet
- [ ] Git installiert und konfiguriert
- [ ] Repository geklont
- [ ] `docker-compose up -d` erfolgreich
- [ ] Alle Container laufen (`docker-compose ps`)
- [ ] Database Migration ausgeführt
- [ ] Demo-Daten eingespielt
- [ ] Platform Admin Login funktioniert
- [ ] Tenant Login funktioniert

### Mac
- [ ] Docker Desktop installiert und gestartet
- [ ] Git installiert und konfiguriert
- [ ] Repository geklont
- [ ] `docker-compose up -d` erfolgreich
- [ ] Alle Container laufen (`docker-compose ps`)
- [ ] Database Migration ausgeführt
- [ ] Demo-Daten eingespielt
- [ ] Platform Admin Login funktioniert
- [ ] Tenant Login funktioniert

---

**Viel Erfolg mit dem SMS!** 🚀

Bei Problemen: Logs prüfen mit `docker-compose logs` und Troubleshooting-Sektion lesen.
