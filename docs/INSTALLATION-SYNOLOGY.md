# SMS Installation – Synology NAS (Container Manager)

## Voraussetzungen

- Synology NAS mit Container Manager (früher Docker)
- DSM 7.2 oder neuer
- mind. 4 GB RAM
- 10 GB freier Speicher

## 1. Container Manager installieren

1. Paketzentrum öffnen
2. "Container Manager" installieren
3. Unter "Einstellungen" → Container-Verzeichnis festlegen

## 2. SMS-Dateien hochladen

1. File Station öffnen
2. Ordner `docker/sms` erstellen
3. Das gesamte Projekt dort hochladen

## 3. Über SSH konfigurieren

```bash
# SSH in Synology aktivieren (Systemsteuerung → Terminal & SNMP)
ssh admin@<nas-ip>
sudo -i

cd /volume1/docker/sms

# Umgebungsvariablen setzen
cp .env.example .env
vi .env
```

## 4. Starten

```bash
# Docker Compose ausführen
docker compose up -d --build

# Datenbank initialisieren
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx tsx prisma/seed.ts
```

## 5. Im Container Manager

Alternativ über die GUI:
1. Container Manager → Projekt
2. "Erstellen" → Bestehende docker-compose.yml auswählen
3. Pfad: `/volume1/docker/sms/docker-compose.yml`

## 6. Zugriff

Browser: `http://<nas-ip>:80` (Port ggf. anpassen)

## Besonderheiten Synology

- Standard-Port 80 kann belegt sein → in .env `HTTP_PORT=8080` ändern
- Daten liegen in `/volume1/docker/sms/`
- Backup über Hyper Backup möglich
