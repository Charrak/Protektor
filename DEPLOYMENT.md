# 🚀 Server-Deployment Guide

## Übersicht

Diese Anleitung zeigt dir, wie du das SMS auf einem externen Server (VPS, Cloud, Dedicated) produktiv einrichtest.

---

## 1. Server-Voraussetzungen

### Hardware-Anforderungen

**Minimum (bis 50 Benutzer):**
- CPU: 2 Cores
- RAM: 4 GB
- Storage: 40 GB SSD
- Netzwerk: 100 Mbit/s

**Empfohlen (bis 200 Benutzer):**
- CPU: 4 Cores
- RAM: 8 GB
- Storage: 100 GB SSD
- Netzwerk: 1 Gbit/s

**Enterprise (200+ Benutzer):**
- CPU: 8+ Cores
- RAM: 16+ GB
- Storage: 500+ GB SSD
- Netzwerk: 1 Gbit/s
- Load Balancer empfohlen

### Betriebssystem

- **Ubuntu 22.04 LTS** (empfohlen)
- Debian 12
- CentOS 8 Stream

### Empfohlene Anbieter

- **Hetzner Cloud** (Deutschland, günstig)
- **DigitalOcean** (einfach, gut dokumentiert)
- **AWS** (skalierbar, teuer)
- **Strato** (Deutschland)
- **IONOS** (Deutschland)

---

## 2. Server vorbereiten

### 2.1 Auf Server verbinden

```bash
# SSH-Verbindung herstellen
ssh root@dein-server.de

# Oder mit SSH-Key
ssh -i ~/.ssh/id_rsa root@dein-server.de
```

### 2.2 System aktualisieren

```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS/RHEL
dnf update -y
```

### 2.3 Firewall konfigurieren

```bash
# UFW installieren (falls nicht vorhanden)
apt install ufw -y

# Ports freigeben
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 3000/tcp    # Optional: Direktzugriff Frontend
ufw allow 5000/tcp    # Optional: Direktzugriff Backend

# Firewall aktivieren
ufw enable
ufw status
```

### 2.4 Docker installieren

```bash
# Docker Installationsskript herunterladen
curl -fsSL https://get.docker.com -o get-docker.sh

# Docker installieren
sh get-docker.sh

# Docker-Version prüfen
docker --version

# Docker Compose installieren
apt install docker-compose-plugin -y

# Docker Compose Version prüfen
docker compose version

# User zur Docker-Gruppe hinzufügen (optional)
usermod -aG docker $USER
```

### 2.5 Nginx installieren (Reverse Proxy)

```bash
apt install nginx -y

# Nginx starten
systemctl start nginx
systemctl enable nginx

# Nginx-Status prüfen
systemctl status nginx
```

---

## 3. Domain & DNS konfigurieren

### 3.1 Domain kaufen

Empfohlene Registrar:
- **Namecheap** (international)
- **INWX** (Deutschland)
- **Strato** (Deutschland)

### 3.2 DNS-Records setzen

**Beispiel für Domain: `sms-deinefirma.de`**

| Typ | Name | Wert | TTL |
|-----|------|------|-----|
| A | `@` | `123.456.789.0` (Server-IP) | 3600 |
| A | `www` | `123.456.789.0` | 3600 |
| A | `api` | `123.456.789.0` | 3600 |
| A | `app` | `123.456.789.0` | 3600 |

**Ergebnis nach DNS-Propagation (5-60 Min):**
- `https://sms-deinefirma.de` → Frontend
- `https://app.sms-deinefirma.de` → Frontend (optional)
- `https://api.sms-deinefirma.de` → Backend API

---

## 4. Projekt auf Server deployen

### 4.1 Repository klonen

```bash
# Projekt-Verzeichnis erstellen
mkdir -p /var/www/sms
cd /var/www/sms

# Repository klonen
git clone https://github.com/dein-user/protektor.git .

# Oder mit SSH
git clone git@github.com:dein-user/protektor.git .
```

### 4.2 Environment konfigurieren

```bash
# .env Datei erstellen
cp .env.example .env

# .env bearbeiten
nano .env
```

**Production .env:**

```env
# ============================================
# PRODUCTION CONFIGURATION
# ============================================

# --------------------------------------------
# Database
# --------------------------------------------
DATABASE_URL=postgresql://sms_user:SEHR_SICHRES_PASSWORT_HIER@postgres:5432/sms_db

# --------------------------------------------
# JWT (WICHTIG: Sicheren Key generieren!)
# --------------------------------------------
# Generiere mit: openssl rand -base64 48
JWT_SECRET=dein-super-sicherer-jwt-secret-mindestens-32-zeichen-lang
JWT_EXPIRES_IN=7d

# --------------------------------------------
# Server
# --------------------------------------------
NODE_ENV=production
PORT=5000

# --------------------------------------------
# CORS
# --------------------------------------------
CORS_ORIGIN=https://sms-deinefirma.de

# --------------------------------------------
# Stripe (Production Keys!)
# --------------------------------------------
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# --------------------------------------------
# Email (Production SMTP)
# --------------------------------------------
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=deine-email@gmail.com
SMTP_PASS=dein-app-passwort

# --------------------------------------------
# Platform Admin
# --------------------------------------------
PLATFORM_ADMIN_EMAIL=admin@sms-deinefirma.de
PLATFORM_ADMIN_PASSWORD=SehrSicheresPasswort123!

# --------------------------------------------
# License
# --------------------------------------------
OFFLINE_GRACE_MINUTES=1440
PAYMENT_GRACE_DAYS=7
DEFAULT_TRIAL_DAYS=30
```

**Sicherheitstipps:**
- ✅ JWT_SECRET: Mindestens 32 Zeichen, zufällig generiert
- ✅ Database Password: Stark und einzigartig
- ✅ Platform Admin Password: Nicht das Standard-Passwort!
- ✅ Stripe: Production Keys (nicht Test Keys!)

### 4.3 Docker Production Setup

**Erstelle `docker-compose.prod.yml`:**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: sms-postgres
    restart: always
    environment:
      POSTGRES_USER: sms_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: sms_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - sms-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sms_user -d sms_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API Server
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
    container_name: sms-backend
    restart: always
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    expose:
      - "5000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - sms-network
    command: npm start

  # Frontend React App
  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
        - VITE_API_URL=https://api.sms-deinefirma.de
    container_name: sms-frontend
    restart: always
    environment:
      VITE_API_URL: ${VITE_API_URL:-https://api.sms-deinefirma.de}
    expose:
      - "5173"
    depends_on:
      - backend
    networks:
      - sms-network
    command: npm run preview -- --host 0.0.0.0 --port 5173

volumes:
  postgres_data:

networks:
  sms-network:
    driver: bridge
```

### 4.4 Production Images bauen

```bash
# Production Images bauen
docker compose -f docker-compose.prod.yml build

# Container starten
docker compose -f docker-compose.prod.yml up -d

# Logs prüfen
docker compose -f docker-compose.prod.yml logs -f
```

---

## 5. Nginx Reverse Proxy konfigurieren

### 5.1 Nginx-Konfiguration erstellen

```bash
nano /etc/nginx/sites-available/sms
```

**Nginx Config:**

```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name sms-deinefirma.de www.sms-deinefirma.de api.sms-deinefirma.de;
    
    # Let's Encrypt Challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Frontend (Main Domain)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sms-deinefirma.de www.sms-deinefirma.de;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/sms-deinefirma.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sms-deinefirma.de/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend Proxy
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.sms-deinefirma.de;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/sms-deinefirma.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sms-deinefirma.de/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Backend Proxy
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 5.2 Nginx aktivieren

```bash
# Symlink erstellen
ln -s /etc/nginx/sites-available/sms /etc/nginx/sites-enabled/

# Default Seite entfernen (optional)
rm /etc/nginx/sites-enabled/default

# Nginx Config testen
nginx -t

# Nginx reloaden
systemctl reload nginx
```

---

## 6. SSL-Zertifikate mit Let's Encrypt

### 6.1 Certbot installieren

```bash
apt install certbot python3-certbot-nginx -y
```

### 6.2 Zertifikate erstellen

```bash
# Für Hauptdomain
certbot --nginx -d sms-deinefirma.de -d www.sms-deinefirma.de -d api.sms-deinefirma.de

# Oder nur für eine Domain
certbot --nginx -d sms-deinefirma.de
```

### 6.3 Auto-Renewal einrichten

```bash
# Certbot Renewal Timer prüfen
systemctl status certbot.timer

# Manuelles Renewal testen
certbot renew --dry-run

# Cron Job hinzufügen (optional)
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

---

## 7. Database initialisieren

```bash
# In Backend Container wechseln
docker compose -f docker-compose.prod.yml exec backend sh

# Migration ausführen
npx prisma migrate deploy

# Seed-Daten einspielen (für ersten Admin)
npm run seed

# Container verlassen
exit
```

---

## 8. Erste Schritte nach Deployment

### 8.1 System testen

1. **Frontend aufrufen:** https://sms-deinefirma.de
2. **Platform Login:** https://sms-deinefirma.de/platform
3. **Mit Admin einloggen:** `admin@sms-deinefirma.de` / dein Passwort
4. **Ersten Tenant anlegen**
5. **Testen!**

### 8.2 Security Checks

```bash
# Firewall prüfen
ufw status

# Offene Ports prüfen
netstat -tulpn | grep LISTEN

# Docker Container prüfen
docker compose -f docker-compose.prod.yml ps

# Logs prüfen
docker compose -f docker-compose.prod.yml logs --tail=100
```

---

## 9. Backup-Strategie

### 9.1 Database Backup Script

**Erstelle `/opt/scripts/backup-db.sh`:**

```bash
#!/bin/bash

# Backup-Verzeichnis
BACKUP_DIR="/var/backups/sms/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sms_db_$DATE.sql.gz"

# Erstelle Backup-Verzeichnis
mkdir -p $BACKUP_DIR

# Database Backup erstellen
docker exec sms-postgres pg_dump -U sms_user sms_db | gzip > $BACKUP_FILE

# Alte Backups löschen (älter als 30 Tage)
find $BACKUP_DIR -name "sms_db_*.sql.gz" -mtime +30 -delete

# Log
echo "Backup erstellt: $BACKUP_FILE" >> /var/log/sms-backup.log
```

### 9.2 Backup-Cron einrichten

```bash
# Script ausführbar machen
chmod +x /opt/scripts/backup-db.sh

# Cron Job erstellen
crontab -e

# Täglich um 2:00 Uhr backuppen
0 2 * * * /opt/scripts/backup-db.sh
```

### 9.3 Restore from Backup

```bash
# Backup entpacken
gunzip sms_db_20240108_020000.sql.gz

# In Database importieren
docker exec -i sms-postgres psql -U sms_user sms_db < sms_db_20240108_020000.sql
```

---

## 10. Monitoring & Wartung

### 10.1 Docker Logs ansehen

```bash
# Alle Logs
docker compose -f docker-compose.prod.yml logs -f

# Nur Backend
docker compose -f docker-compose.prod.yml logs -f backend

# Nur Frontend
docker compose -f docker-compose.prod.yml logs -f frontend

# Nur Database
docker compose -f docker-compose.prod.yml logs -f postgres
```

### 10.2 Container neu starten

```bash
# Alle Container neu starten
docker compose -f docker-compose.prod.yml restart

# Nur Backend neu starten
docker compose -f docker-compose.prod.yml restart backend

# Container stoppen
docker compose -f docker-compose.prod.yml down

# Container mit neuem Image starten
docker compose -f docker-compose.prod.yml up -d --build
```

### 10.3 Resource Monitoring

```bash
# Docker Stats (CPU, RAM)
docker stats

# Disk Usage
docker system df

# Logs Größe prüfen
du -sh /var/lib/docker/containers/*/*-json.log
```

---

## 11. Update-Strategie

### 11.1 Code aktualisieren

```bash
# Zum Projekt-Verzeichnis
cd /var/www/sms

# Neuesten Code holen
git pull origin main

# .env prüfen (falls nötig anpassen)
nano .env
```

### 11.2 Deployment aktualisieren

```bash
# Images neu bauen
docker compose -f docker-compose.prod.yml build

# Database Migration
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Container neu starten
docker compose -f docker-compose.prod.yml up -d

# Logs prüfen
docker compose -f docker-compose.prod.yml logs -f
```

---

## 12. Troubleshooting

### Problem: "502 Bad Gateway"

```bash
# Prüfe ob Container laufen
docker compose -f docker-compose.prod.yml ps

# Backend Logs prüfen
docker compose -f docker-compose.prod.yml logs backend

# Nginx Logs prüfen
tail -f /var/log/nginx/error.log
```

### Problem: "Connection refused"

```bash
# Ports prüfen
netstat -tulpn | grep LISTEN

# Firewall prüfen
ufw status

# Docker Netzwerk prüfen
docker network ls
```

### Problem: "Out of memory"

```bash
# RAM Usage prüfen
free -h

# Docker Container Limits setzen
# In docker-compose.prod.yml:
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

---

## 13. Security Best Practices

### ✅ Checkliste

- [ ] JWT_SECRET geändert (mindestens 32 Zeichen)
- [ ] Database Password stark und einzigartig
- [ ] Platform Admin Password geändert
- [ ] HTTPS aktiviert (Let's Encrypt)
- [ ] Firewall konfiguriert (nur 22, 80, 443)
- [ ] SSH Key Authentication (kein Password)
- [ ] Regelmäßige Backups eingerichtet
- [ ] Auto-Updates für System aktiviert
- [ ] Docker Images regelmäßig aktualisieren
- [ ] Logs regelmäßig prüfen

### 🔒 SSH absichern

```bash
# SSH Config bearbeiten
nano /etc/ssh/sshd_config

# Password Authentication deaktivieren
PasswordAuthentication no

# Root Login deaktivieren (optional)
PermitRootLogin no

# SSH Port ändern (optional)
Port 2222

# SSH reloaden
systemctl reload ssh
```

---

## 14. Schnellstart-Script

**Erstelle `deploy.sh`:**

```bash
#!/bin/bash

echo "🚀 SMS Production Deployment"
echo "============================"

# 1. System aktualisieren
echo "📦 System aktualisieren..."
apt update && apt upgrade -y

# 2. Docker installieren
echo "🐳 Docker installieren..."
curl -fsSL https://get.docker.com | sh

# 3. Nginx installieren
echo "🌐 Nginx installieren..."
apt install nginx -y

# 4. Certbot installieren
echo "🔒 Certbot installieren..."
apt install certbot python3-certbot-nginx -y

# 5. Projekt klonen
echo "📥 Projekt klonen..."
git clone https://github.com/dein-user/protektor.git /var/www/sms
cd /var/www/sms

# 6. Environment konfigurieren
echo "⚙️  Environment konfigurieren..."
cp .env.example .env
echo "⚠️  BITTE .env BEARBEITEN: nano /var/www/sms/.env"
read -p "Drücke Enter wenn .env konfiguriert ist..."

# 7. Production Images bauen
echo "🔨 Images bauen..."
docker compose -f docker-compose.prod.yml build

# 8. Container starten
echo "▶️  Container starten..."
docker compose -f docker-compose.prod.yml up -d

# 9. Database initialisieren
echo "🗄️  Database initialisieren..."
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec backend npm run seed

# 10. SSL einrichten
echo "🔐 SSL einrichten..."
read -p "Domain eingeben (z.B. sms-deinefirma.de): " DOMAIN
certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN

echo "✅ Deployment abgeschlossen!"
echo "🌐 Frontend: https://$DOMAIN"
echo "🔧 Platform: https://$DOMAIN/platform"
```

---

## Zusammenfassung

### Deployment-Schritte

1. ✅ Server vorbereiten (Docker, Nginx, Firewall)
2. ✅ Domain & DNS konfigurieren
3. ✅ Projekt klonen & .env konfigurieren
4. ✅ Production Images bauen
5. ✅ Container starten
6. ✅ Database initialisieren
7. ✅ Nginx Reverse Proxy einrichten
8. ✅ SSL-Zertifikate erstellen
9. ✅ Backups einrichten
10. ✅ System testen

### Wichtige URLs nach Deployment

- **Frontend:** https://sms-deinefirma.de
- **Platform:** https://sms-deinefirma.de/platform
- **API:** https://api.sms-deinefirma.de
- **API Docs:** https://api.sms-deinefirma.de/api-docs

### Support

Bei Problemen:
1. Logs prüfen: `docker compose logs`
2. Nginx Logs: `/var/log/nginx/error.log`
3. Docker Status: `docker compose ps`
4. Firewall: `ufw status`

---

**Viel Erfolg beim Deployment!** 🚀
