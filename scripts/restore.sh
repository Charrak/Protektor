#!/bin/bash

# ============================================
# SMS Database Restore Script
# ============================================

set -e

# Farben für Output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Prüfe Argument
if [ -z "$1" ]; then
    echo -e "${RED}FEHLER: Backup-Datei muss angegeben werden!${NC}"
    echo "Verwendung: $0 <backup-file.sql.gz>"
    echo ""
    echo "Verfügbare Backups:"
    ls -lh /var/backups/sms/postgres/*.sql.gz 2>/dev/null || echo "Keine Backups gefunden"
    exit 1
fi

BACKUP_FILE="$1"

# Prüfe ob Datei existiert
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}FEHLER: Backup-Datei nicht gefunden: $BACKUP_FILE${NC}"
    exit 1
fi

# Warnung anzeigen
echo -e "${YELLOW}WARNUNG: Dies wird die aktuelle Datenbank überschreiben!${NC}"
echo "Backup-Datei: $BACKUP_FILE"
read -p "Fortfahren? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Abgebrochen."
    exit 0
fi

# Prüfe ob Docker Container läuft
if ! docker ps | grep -q sms-postgres; then
    echo -e "${RED}FEHLER: PostgreSQL Container läuft nicht!${NC}"
    exit 1
fi

echo -e "${GREEN}[$(date)] Starte Database Restore...${NC}"

# Entpacke und importiere Backup
echo "Importiere Backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i sms-postgres psql -U sms_user sms_db

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[$(date)] Restore erfolgreich abgeschlossen!${NC}"
else
    echo -e "${RED}[$(date)] FEHLER beim Restore!${NC}"
    exit 1
fi

echo ""
echo "Nächste Schritte:"
echo "1. Backend neu starten: docker compose restart backend"
echo "2. Login testen"
echo "3. Daten prüfen"

exit 0
