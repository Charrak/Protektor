# SMS Installation – Mini-PC (Intel N100)

## Voraussetzungen

- Mini-PC mit Intel N100 oder vergleichbar
- Ubuntu Server 22.04 LTS oder Debian 12
- mind. 4 GB RAM
- mind. 64 GB Speicher

## 1. System vorbereiten

```bash
sudo apt update && sudo apt upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo reboot
```

## 2. SMS installieren

```bash
git clone https://github.com/Charrak/Protektor.git /opt/sms
cd /opt/sms
cp .env.example .env
nano .env
```

## 3. SMS starten

```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx prisma/seed.ts
docker compose ps
```

## 4. Erstanmeldung

Browser: `http://<ip-adresse>`
Zugangsdaten: `admin` / `admin123`

## 5. Optional: Domain & SSL

```bash
# Certbot installieren
sudo apt install certbot

# SSL-Zertifikat erstellen
sudo certbot certonly --standalone -d sms.example.com

# In .env HTTPS aktivieren und nginx.conf anpassen
```

## 6. Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
