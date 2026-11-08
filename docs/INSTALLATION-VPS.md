# SMS Installation – Linux VPS / Cloud Server

## Voraussetzungen

- Linux VPS (Ubuntu 22.04 oder Debian 12)
- mind. 2 GB RAM, 2 vCPU
- mind. 40 GB SSD
- Öffentliche IP-Adresse
- Optional: Eigene Domain

## 1. System vorbereiten

```bash
sudo apt update && sudo apt upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo reboot
```

## 2. Firewall konfigurieren

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## 3. SMS installieren

```bash
git clone https://github.com/Charrak/Protektor.git /opt/sms
cd /opt/sms
cp .env.example .env
nano .env
```

## 4. Domain einrichten (empfohlen)

```bash
# DNS A-Record auf Server-IP setzen

# Nginx für Let's Encrypt vorbereiten
# In docker/nginx/nginx.conf SSL-Block hinzufügen

sudo apt install certbot
sudo certbot certonly --standalone -d sms.example.com
```

## 5. SMS starten

```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx prisma/seed.ts
```

## 6. Automatisches Backup

```bash
chmod +x scripts/backup/backup.sh
sudo mkdir -p /var/backups/sms

# Täglich um 02:00
sudo crontab -e
# 0 2 * * * /opt/sms/scripts/backup/backup.sh >> /var/log/sms-backup.log 2>&1

# Optional: Remote-Backup
# 0 3 * * * rsync -avz /var/backups/sms/ user@backup-server:/backups/sms/
```

## 7. Monitoring

```bash
# Logs prüfen
docker compose logs -f backend
docker compose logs -f postgres

# Status
docker compose ps
```

## Sicherheit

- SSH-Key statt Passwort verwenden
- `fail2ban` installieren: `sudo apt install fail2ban`
- Regelmäßige Updates: `sudo apt update && sudo apt upgrade -y`
