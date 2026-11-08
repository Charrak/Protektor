# 🚀 Production Deployment Checklist

## Vor dem Deployment

### ✅ 1. Environment Variables konfigurieren

```bash
# .env.production kopieren und anpassen
cp .env.production .env
nano .env
```

**WICHTIG - Diese Werte MÜSSEN geändert werden:**
- [ ] `DB_PASSWORD` - Starkes Datenbank-Passwort
- [ ] `JWT_SECRET` - Zufälliger String (mindestens 32 Zeichen)
- [ ] `ENCRYPTION_KEY` - Zufälliger String (32 Zeichen)
- [ ] `PLATFORM_ADMIN_PASSWORD` - Starkes Admin-Passwort
- [ ] `STRIPE_SECRET_KEY` - Stripe Production Key
- [ ] `SMTP_PASS` - Email-Passwort

**Generierung sicherer Keys:**
```bash
# JWT Secret
openssl rand -base64 48

# Encryption Key
openssl rand -base64 32

# Database Password
openssl rand -base64 24
```

### ✅ 2. Domain & DNS konfigurieren

- [ ] Domain gekauft
- [ ] DNS A-Records gesetzt:
  - `sms-deinefirma.de` → Server-IP
  - `www.sms-deinefirma.de` → Server-IP
  - `api.sms-deinefirma.de` → Server-IP
- [ ] DNS-Propagation abgewartet (5-60 Min)

### ✅ 3. Server vorbereiten

```bash
# Server verbinden
ssh root@dein-server.de

# System aktualisieren
apt update && apt upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com | sh

# Nginx installieren
apt install nginx -y

# Firewall konfigurieren
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## Deployment

### ✅ 4. Projekt auf Server laden

```bash
# Projekt-Verzeichnis erstellen
mkdir -p /var/www/sms
cd /var/www/sms

# Repository klonen
git clone https://github.com/dein-user/protektor.git .
```

### ✅ 5. Production Images bauen

```bash
# Environment laden
export $(cat .env | xargs)

# Images bauen
docker compose -f docker-compose.prod.yml build
```

### ✅ 6. Container starten

```bash
# Container starten
docker compose -f docker-compose.prod.yml up -d

# Logs prüfen
docker compose -f docker-compose.prod.yml logs -f
```

### ✅ 7. Database initialisieren

```bash
# Migration ausführen
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Admin-Account erstellen
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

### ✅ 8. Nginx Reverse Proxy einrichten

```bash
# Nginx Config erstellen
nano /etc/nginx/sites-available/sms
```

**Config:**
```nginx
server {
    listen 80;
    server_name sms-deinefirma.de www.sms-deinefirma.de api.sms-deinefirma.de;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.sms-deinefirma.de;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Aktivieren:**
```bash
ln -s /etc/nginx/sites-available/sms /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### ✅ 9. SSL-Zertifikat erstellen

```bash
# Certbot installieren
apt install certbot python3-certbot-nginx -y

# SSL erstellen
certbot --nginx -d sms-deinefirma.de -d www.sms-deinefirma.de -d api.sms-deinefirma.de
```

---

## Nach dem Deployment

### ✅ 10. System testen

1. **Frontend:** https://sms-deinefirma.de
2. **Platform Login:** https://sms-deinefirma.de/platform
3. **Login:** `admin@sms-deinefirma.de` / dein Passwort
4. **Teste alle Features!**

### ✅ 11. Backups einrichten

```bash
# Backup-Script kopieren
cp scripts/backup.sh /opt/scripts/
chmod +x /opt/scripts/backup.sh

# Cron Job erstellen
crontab -e
```

**Cron Job (täglich um 2:00 Uhr):**
```cron
0 2 * * * /opt/scripts/backup.sh
```

### ✅ 12. Monitoring einrichten

```bash
# Logs überwachen
docker compose -f docker-compose.prod.yml logs -f

# Resource Usage prüfen
docker stats
```

---

## Security Checklist

### ✅ 13. Security härten

- [ ] **SSH absichern:**
  ```bash
  nano /etc/ssh/sshd_config
  # PasswordAuthentication no
  # PermitRootLogin no
  systemctl reload ssh
  ```

- [ ] **Firewall prüfen:**
  ```bash
  ufw status
  # Nur 22, 80, 443 erlaubt
  ```

- [ ] **Starke Passwörter:**
  - [ ] JWT_SECRET geändert
  - [ ] Database Password stark
  - [ ] Admin Password stark
  - [ ] Encryption Key gesetzt

- [ ] **HTTPS aktiviert:**
  ```bash
  curl -I https://sms-deinefirma.de
  # Sollte 200 OK zurückgeben
  ```

- [ ] **Security Headers prüfen:**
  ```bash
  curl -I https://sms-deinefirma.de | grep -i "strict-transport"
  # Sollte HSTS zeigen
  ```

---

## Maintenance

### ✅ 14. Regelmäßige Wartung

**Wöchentlich:**
- [ ] Security Logs prüfen
- [ ] Backup prüfen
- [ ] Resource Usage checken

**Monatlich:**
- [ ] `npm audit` durchführen
- [ ] Updates installieren
- [ ] Performance prüfen

**Quartalsweise:**
- [ ] Security Audit
- [ ] Penetration Test (optional)
- [ ] Backup Restore Test

---

## Troubleshooting

### Container startet nicht

```bash
# Logs prüfen
docker compose -f docker-compose.prod.yml logs backend

# Container neu starten
docker compose -f docker-compose.prod.yml restart backend
```

### 502 Bad Gateway

```bash
# Prüfe ob Container laufen
docker compose -f docker-compose.prod.yml ps

# Nginx Logs prüfen
tail -f /var/log/nginx/error.log
```

### Database Connection Error

```bash
# PostgreSQL Status prüfen
docker compose -f docker-compose.prod.yml ps postgres

# PostgreSQL neu starten
docker compose -f docker-compose.prod.yml restart postgres
```

---

## Support

Bei Problemen:
1. Logs prüfen: `docker compose logs`
2. Nginx Logs: `/var/log/nginx/error.log`
3. Security Logs: `docker compose logs | grep SECURITY`
4. Documentation: `DEPLOYMENT.md`, `SECURITY.md`

---

## ✅ Final Checklist

- [ ] Alle Environment Variables gesetzt
- [ ] Domain konfiguriert
- [ ] SSL aktiviert
- [ ] Admin-Account erstellt
- [ ] System getestet
- [ ] Backups eingerichtet
- [ ] Security gehärtet
- [ ] Monitoring aktiv
- [ ] Documentation gelesen

---

**🎉 Production Deployment abgeschlossen!**

**URLs:**
- Frontend: https://sms-deinefirma.de
- Platform: https://sms-deinefirma.de/platform
- API: https://api.sms-deinefirma.de
- API Docs: https://api.sms-deinefirma.de/api-docs

**Viel Erfolg!** 🚀
