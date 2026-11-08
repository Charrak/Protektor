# SMS Installation – Raspberry Pi 5

## Voraussetzungen

- Raspberry Pi 5 (4 GB RAM empfohlen)
- Raspberry Pi OS (64-bit, Bookworm)
- MicroSD-Karte (mind. 32 GB) oder SSD
- Internetverbindung für Erstinstallation

## 1. System vorbereiten

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose installieren
sudo apt install -y docker-compose-plugin

# Neustart für Gruppenänderung
sudo reboot
```

## 2. SMS installieren

```bash
# Projekt klonen
git clone https://github.com/Charrak/Protektor.git /opt/sms
cd /opt/sms

# Umgebungsvariablen konfigurieren
cp .env.example .env
nano .env
```

### Wichtige Einstellungen in .env:

```env
POSTGRES_PASSWORD=<starkes_passwort>
JWT_SECRET=<openssl rand -base64 64>
JWT_REFRESH_SECRET=<openssl rand -base64 64>
HTTP_PORT=80
CORS_ORIGIN=http://<ip-adresse-pi>
```

### Secrets generieren:

```bash
openssl rand -base64 64
```

## 3. SMS starten

```bash
cd /opt/sms

# Container bauen und starten
docker compose up -d --build

# Datenbank initialisieren
docker compose exec backend npx prisma migrate deploy

# Seed ausführen (Rollen, Berechtigungen, Admin)
docker compose exec backend npx tsx prisma/seed.ts

# Status prüfen
docker compose ps
```

## 4. Erstanmeldung

1. Browser öffnen: `http://<ip-adresse-pi>`
2. Anmeldedaten: `admin` / `admin123`
3. **Sofort Passwort ändern!**

## 5. Automatische Updates

```bash
# Update-Skript ausführbar machen
chmod +x scripts/update.sh

# Cron für tägliche Updates (optional)
sudo crontab -e
# 0 4 * * 0 /opt/sms/scripts/update.sh >> /var/log/sms-update.log 2>&1
```

## 6. Backup einrichten

```bash
chmod +x scripts/backup/backup.sh
sudo mkdir -p /var/backups/sms

# Täglicher Backup um 02:00
sudo crontab -e
# 0 2 * * * /opt/sms/scripts/backup/backup.sh >> /var/log/sms-backup.log 2>&1
```

## 7. Performance-Tipps für Raspberry Pi

- SSD statt MicroSD verwenden (deutlich schneller)
- `max_wal_size` in PostgreSQL reduzieren: 256MB
- Swap aktivieren: `sudo dphys-swapfile` auf 1024
