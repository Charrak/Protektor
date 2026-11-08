# SMS - Installationsanleitung

## Zwei Installationsarten

Das SMS Security Management System bietet zwei verschiedene Installationsmöglichkeiten:

| | **Kunden-Installation** | **Entwickler-Installation** |
|---|---|---|
| **Zielgruppe** | Endkunden, Betreiber | Entwickler, Partner |
| **Quellcode** | ❌ Nicht enthalten | ✅ Vollständig enthalten |
| **Anpassbar** | ❌ Nur Konfiguration | ✅ Vollständig anpassbar |
| **Setup** | Einfach (5 Min) | Etwas komplexer (10 Min) |
| **Updates** | Automatisch via Docker | Manuell via Git |

---

## 📦 Kunden-Installation (Production)

**Für wen:** Kunden die das System betreiben wollen, ohne den Quellcode zu sehen oder anzupassen.

**Was wird installiert:**
- ✅ Fertige Docker-Images (keine Quellcode-Dateien)
- ✅ Produktions-optimierte Konfiguration
- ✅ Automatische Updates möglich
- ✅ Einfache Bedienung

### Installation Windows

```
1. Doppelklick auf: install-customer.bat
2. Fertig!
```

**Was passiert:**
- Docker-Konfiguration wird heruntergeladen
- Produktions-Images werden gepullt
- Server wird automatisch gestartet
- Datenbank wird initialisiert

### Installation Mac/Linux

```bash
1. Terminal öffnen
2. chmod +x install-customer.sh
3. ./install-customer.sh
4. Fertig!
```

### Zugriff nach Installation

```
Webseite: http://localhost:5173
API:      http://localhost:5000/api

Admin-Zugang:
  Email: admin@sms-platform.com
  Passwort: Admin123! (Bitte sofort ändern!)
```

### Quick Commands

```bash
# Server starten
start-customer.bat      # Windows
./start-customer.sh     # Mac/Linux

# Server stoppen
stop-customer.bat       # Windows
./stop-customer.sh      # Mac/Linux

# Logs anzeigen
cd SMS-Server
docker-compose logs -f

# Server komplett löschen
cd SMS-Server
docker-compose down -v
```

---

## 👨‍💻 Entwickler-Installation (Development)

**Für wen:** Entwickler, Partner oder Kunden die das System anpassen oder erweitern wollen.

**Was wird installiert:**
- ✅ Vollständiger Quellcode (Frontend + Backend)
- ✅ Entwicklungsumgebung mit Hot-Reload
- ✅ Demo-Daten für Tests
- ✅ Docker-Setup für einfache Bereitstellung

### Installation Windows

```
1. Doppelklick auf: install-developer.bat
2. Fertig!
```

**Was passiert:**
- Repository wird geklont
- Dependencies werden installiert
- Docker-Container werden gestartet
- Datenbank-Migration wird ausgeführt
- Demo-Daten werden geladen (optional)

### Installation Mac/Linux

```bash
1. Terminal öffnen
2. chmod +x install-developer.sh
3. ./install-developer.sh
4. Fertig!
```

### Zugriff nach Installation

```
Frontend: http://localhost:5173
Backend:  http://localhost:5000/api

Platform Admin:
  Email: admin@sms-platform.com
  Passwort: Admin123!

Tenant Admin (Demo):
  Email: admin@security-nord.de
  Passwort: Password123!
```

### Quick Commands

```bash
# Server starten
start-developer.bat     # Windows
./start-developer.sh    # Mac/Linux

# Server stoppen
stop-developer.bat      # Windows
./stop-developer.sh     # Mac/Linux

# Logs anzeigen
cd Protektor
docker-compose logs -f

# Code ändern
# Einfach Dateien bearbeiten, Hot-Reload aktiv!
```

---

## 🔐 Sicherheit

### Für Kunden-Installation

**WICHTIG:** Nach der Installation sofort folgende Passwörter ändern:

1. **In `.env` Datei anpassen:**
   ```
   POSTGRES_PASSWORD=<sicheres-passwort>
   JWT_SECRET=<zufälliger-string-min-32-zeichen>
   PLATFORM_ADMIN_PASSWORD=<sicheres-passwort>
   ```

2. **Server neu starten:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **Im Web-Interface:**
   - Mit Admin einloggen
   - Passwort ändern

### Für Entwickler-Installation

**Nur für Entwicklung/Testumgebungen!**

Für Produktion:
- Starke Passwörter verwenden
- HTTPS konfigurieren
- Firewall-Regeln setzen
- Regelmäßige Backups
- `.env` Datei nicht committen!

---

## 📊 Systemanforderungen

### Mindestanforderungen

| Komponente | Kunden | Entwickler |
|------------|--------|------------|
| **CPU** | 2 Cores | 2 Cores |
| **RAM** | 4 GB | 8 GB |
| **Festplatte** | 10 GB | 20 GB |
| **Docker** | ✅ Required | ✅ Required |
| **Git** | ❌ Optional | ✅ Required |

### Empfohlene Konfiguration

| Komponente | Kunden | Entwickler |
|------------|--------|------------|
| **CPU** | 4 Cores | 4+ Cores |
| **RAM** | 8 GB | 16 GB |
| **Festplatte** | 20 GB SSD | 50 GB SSD |
| **Docker** | 20.10+ | 20.10+ |
| **OS** | Linux, Win 10+, macOS 10.15+ | Linux, Win 10+, macOS 10.15+ |

---

## 🆘 Troubleshooting

### Docker läuft nicht

**Windows:**
- Docker Desktop aus Startmenü starten
- Warten bis "Docker Desktop is running" angezeigt wird

**Mac:**
- Docker Desktop aus Applications starten
- Warten bis Whale-Icon in Menüleiste stabil ist

### Port bereits belegt

**Fehler:** `Bind for 0.0.0.0:5173 failed: port is already allocated`

**Lösung:**
```bash
# Anderen Port verwenden in docker-compose.yml
ports:
  - "8080:5173"  # Statt 5173

# Oder anderen Prozess stoppen:
# Windows: netstat -ano | findstr :5173
# Mac/Linux: lsof -i :5173
```

### Datenbank-Verbindungsfehler

**Lösung:**
```bash
# Container neu starten
docker-compose restart postgres
docker-compose restart backend

# Oder komplett neu initialisieren
docker-compose down -v
docker-compose up -d
```

### Kunde-Installation: Images nicht gefunden

**Fehler:** `image ghcr.io/charrak/protektor/backend:latest not found`

**Lösung:**
Die Production-Images müssen erst gebaut werden (nur einmalig):
```bash
# Im Repository-Verzeichnis
docker build -t ghcr.io/charrak/protektor/backend:latest ./server
docker build -t ghcr.io/charrak/protektor/frontend:latest ./client
```

Oder Images von GitHub Container Registry pullen (wenn verfügbar):
```bash
docker pull ghcr.io/charrak/protektor/backend:latest
docker pull ghcr.io/charrak/protektor/frontend:latest
```

---

## 📖 Dokumentation

- [QUICKSTART.md](QUICKSTART.md) - 5-Minuten Schnellstart
- [DOCKER-INSTALL-GUIDE.md](DOCKER-INSTALL-GUIDE.md) - Detaillierte Docker-Anleitung
- [docs/ADMIN-HANDBUCH.md](docs/ADMIN-HANDBUCH.md) - Administrator-Handbuch
- [docs/API-DOCS.md](docs/API-DOCS.md) - API-Dokumentation

---

## 🎯 Welche Installation für wen?

### Kunde-Installation wählen wenn:
- ✅ Sie das System nur betreiben wollen
- ✅ Keine Code-Anpassungen nötig sind
- ✅ Einfache Installation wichtig ist
- ✅ Automatische Updates gewünscht sind
- ✅ Quellcode geschützt bleiben soll

### Entwickler-Installation wählen wenn:
- ✅ Sie das System anpassen/erweitern wollen
- ✅ Sie Entwickler sind oder Partner
- ✅ Sie den Quellcode sehen wollen
- ✅ Sie eigene Features entwickeln wollen
- ✅ Sie Demo-Daten für Tests brauchen

---

## 💡 Tipps

### Für Kunden

1. **Backup-Strategie:**
   ```bash
   # Datenbank backup
   docker-compose exec postgres pg_dump -U sms_user sms_db > backup_$(date +%Y%m%d).sql
   
   # Uploads backup
   tar -czf uploads_backup_$(date +%Y%m%d).tar.gz SMS-Server/uploads/
   ```

2. **Monitoring:**
   ```bash
   # Logs in Echtzeit
   docker-compose logs -f
   
   # Container-Status
   docker-compose ps
   
   # Resource-Usage
   docker stats
   ```

3. **Updates:**
   ```bash
   # Neue Images pullen
   docker-compose pull
   
   # Server neu starten
   docker-compose up -d
   ```

### Für Entwickler

1. **Code-Änderungen:**
   - Einfach Dateien bearbeiten
   - Hot-Reload aktiv (Frontend + Backend)
   - Browser aktualisiert automatisch

2. **Debugging:**
   ```bash
   # Backend Logs
   docker-compose logs -f backend
   
   # Frontend Logs
   docker-compose logs -f frontend
   
   # In Container shellen
   docker-compose exec backend sh
   ```

3. **Testing:**
   ```bash
   # Tests ausführen
   docker-compose exec backend npm test
   
   # Mit Coverage
   docker-compose exec backend npm run test:coverage
   ```

---

## 📞 Support

Bei Problemen:
1. Logs prüfen: `docker-compose logs`
2. Troubleshooting-Sektion lesen
3. GitHub Issues: https://github.com/Charrak/Protektor/issues

---

**Viel Erfolg mit Ihrem SMS Security Management System!** 🚀
