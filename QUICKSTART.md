# 🚀 SMS Quick Start Guide

Schnellstart-Anleitung für das Security Management System (SMS)

---

## ⚡ 5-Minuten Schnellstart

### Voraussetzungen

**Windows:**
- Docker Desktop: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
- Git: https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe

**Mac:**
- Docker Desktop: https://desktop.docker.com/mac/main/amd64/Docker.dmg (Intel) oder https://desktop.docker.com/mac/main/arm64/Docker.dmg (Apple Silicon)
- Git: `brew install git` oder https://git-scm.com/download/mac

### Installation & Start

```bash
# 1. Repository klonen
git clone https://github.com/Charrak/Protektor.git
cd Protektor

# 2. Docker starten (alle Services)
docker-compose up -d

# 3. Warten bis alle Services ready sind (~30 Sekunden)
docker-compose ps

# 4. Database initialisieren
docker-compose exec backend npx prisma migrate deploy

# 5. Demo-Daten einspielen
docker-compose exec backend npm run seed:demo
```

**Fertig!** 🎉

---

## 🔐 Zugangsdaten

### Platform Admin (Software-Betreiber)
- **URL:** http://localhost:5173/platform
- **Email:** `admin@sms-platform.com`
- **Password:** `Admin123!`

### Tenant 1: Security Nord GmbH (Premium)
- **URL:** http://localhost:5173
- **License Key:** `lic_security-nord_premium`
- **Email:** `admin@security-nord.de`
- **Password:** `Password123!`

### Tenant 2: Schutz & Dienstleistungen AG (Enterprise)
- **URL:** http://localhost:5173
- **License Key:** `lic_schutz-ag_enterprise`
- **Email:** `info@schutz-ag.de`
- **Password:** `Password123!`

### Tenant 3: Secure Solutions UG (Test)
- **URL:** http://localhost:5173
- **License Key:** `lic_secure-solutions_test`
- **Email:** `kontakt@secure-solutions.de`
- **Password:** `Password123!`

### API Dokumentation
- **URL:** http://localhost:5000/api-docs

---

## 🎭 Demo-Daten

Das Demo-Seed-Script erstellt:
- ✅ 1 Platform Admin
- ✅ 3 Tenants (Sicherheitsunternehmen)
- ✅ 45 Mitarbeiter (verteilt auf Tenants)
- ✅ 30 Kunden
- ✅ 50+ Objekte
- ✅ 100+ Einsätze (letzte 30 Tage)
- ✅ 500+ Zeiteinträge
- ✅ 3 Tarife (Starter, Professional, Enterprise)

---

## 🔧 Häufige Befehle

```bash
# Services starten
docker-compose up -d

# Services stoppen
docker-compose down

# Logs anzeigen
docker-compose logs -f

# Backend Logs
docker-compose logs -f backend

# In Container gehen
docker-compose exec backend sh

# Database neu initialisieren
docker-compose exec backend npx prisma migrate deploy

# Demo-Daten einspielen
docker-compose exec backend npm run seed:demo

# Alles sauber neu machen
docker-compose down -v
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run seed:demo
```

---

## 📚 Weitere Dokumentation

- **Vollständige Installationsanleitung:** `DOCKER-INSTALL-GUIDE.md`
- **Admin Handbuch:** `docs/ADMIN-HANDBUCH.md`
- **API Dokumentation:** `docs/CUSTOMER-API.md`
- **Deployment Guide:** `DEPLOYMENT.md`
- **Security Dokumentation:** `SECURITY.md`

---

## 🆘 Troubleshooting

### Docker startet nicht
**Windows:** WSL 2 aktivieren
```powershell
wsl --install
wsl --set-default-version 2
```

**Mac:** Docker Desktop aus Applications starten

### Port bereits belegt
```bash
# Prüfen
netstat -ano | findstr :5000  # Windows
lsof -i :5000                  # Mac/Linux

# Prozess beenden
taskkill /PID <PID> /F         # Windows
kill -9 <PID>                  # Mac/Linux
```

### Database Connection Error
```bash
# PostgreSQL neustarten
docker-compose restart postgres

# Warten bis PostgreSQL ready ist
docker-compose logs postgres
```

---

## 📊 Demo-Szenarien

### 1. Platform Admin Demo
1. http://localhost:5173/platform öffnen
2. Mit `admin@sms-platform.com` / `Admin123!` einloggen
3. Dashboard zeigen (Statistiken, MRR, ARR)
4. Tenant-Liste zeigen
5. Lizenz-Status ändern (TEST → ACTIVE → SUSPENDED)
6. Entwickler-Einstellungen zeigen
7. Audit-Logs zeigen

### 2. Tenant Demo
1. http://localhost:5173 öffnen
2. License Key: `lic_security-nord_premium`
3. Login: `admin@security-nord.de` / `Password123!`
4. Mitarbeiter-Verwaltung zeigen
5. Kunden & Objekte zeigen
6. Einsatzplanung zeigen
7. Zeiterfassung zeigen
8. Berichte zeigen

### 3. Test-Tenant Demo
1. License Key: `lic_secure-solutions_test`
2. Login: `kontakt@secure-solutions.de` / `Password123!`
3. Einschränkungen zeigen (TEST-Status)
4. Upgrade-Prozess erklären

---

## ✅ Checklist für erfolgreiche Demo

- [ ] Docker Desktop installiert und gestartet
- [ ] Repository geklont
- [ ] `docker-compose up -d` erfolgreich
- [ ] Alle Container laufen (`docker-compose ps`)
- [ ] Database Migration ausgeführt
- [ ] Demo-Daten eingespielt
- [ ] Platform Admin Login funktioniert
- [ ] Tenant Login funktioniert
- [ ] API Docs erreichbar

---

## 🎓 Tipps für Vorführungen

1. **Morgens vorbereiten:**
   ```bash
   docker-compose down -v
   docker-compose up -d
   sleep 30
   docker-compose exec backend npx prisma migrate deploy
   docker-compose exec backend npm run seed:demo
   ```

2. **Browser Cache leeren** vor der Demo

3. **Mehrere Tabs vorbereiten:**
   - Platform Admin
   - Tenant 1 (Premium)
   - Tenant 2 (Enterprise)
   - Tenant 3 (Test)
   - API Docs

4. **Nützliche SQL-Queries:**
   ```bash
   docker-compose exec postgres psql -U sms_user -d sms_db
   
   # Aktuelle Statistiken
   SELECT 
     (SELECT COUNT(*) FROM tenants) as tenants,
     (SELECT COUNT(*) FROM employees) as employees,
     (SELECT COUNT(*) FROM deployments WHERE date >= CURRENT_DATE - INTERVAL '7 days') as deployments_last_7_days;
   ```

---

**Viel Erfolg mit dem SMS!** 🚀

Bei Problemen: Logs prüfen mit `docker-compose logs` und `DOCKER-INSTALL-GUIDE.md` lesen.
