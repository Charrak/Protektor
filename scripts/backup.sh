#!/bin/bash

# ============================================
# SMS Database Backup Script
# ============================================

set -e

# Konfiguration
BACKUP_DIR="/var/backups/sms/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sms_db_$DATE.sql.gz"
RETENTION_DAYS=30

# Farben für Output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}[$(date)] Starte Database Backup...${NC}"

# Erstelle Backup-Verzeichnis
mkdir -p "$BACKUP_DIR"

# Prüfe ob Docker Container läuft
if ! docker ps | grep -q sms-postgres; then
    echo -e "${RED}[$(date)] FEHLER: PostgreSQL Container läuft nicht!${NC}"
    exit 1
fi

# Erstelle Database Backup
echo "Erstelle Backup..."
docker exec sms-postgres pg_dump -U sms_user sms_db | gzip > "$BACKUP_FILE"

# Prüfe ob Backup erfolgreich
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}[$(date)] Backup erfolgreich erstellt: $BACKUP_FILE ($SIZE)${NC}"
else
    echo -e "${RED}[$(date)] FEHLER: Backup konnte nicht erstellt werden!${NC}"
    exit 1
fi

# Lösche alte Backups
echo "Lösche alte Backups (älter als $RETENTION_DAYS Tage)..."
DELETED=$(find "$BACKUP_DIR" -name "sms_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "$DELETED alte Backups gelöscht"

# Zeige verbleibende Backups
REMAINING=$(ls -1 "$BACKUP_DIR"/sms_db_*.sql.gz 2>/dev/null | wc -l)
echo -e "${GREEN}[$(date)] Backup abgeschlossen. $REMAINING Backups vorhanden.${NC}"

# Log-Eintrag
echo "[$(date)] Backup erfolgreich: $BACKUP_FILE ($SIZE)" >> /var/log/sms-backup.log

exit 0
