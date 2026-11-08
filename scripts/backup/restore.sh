#!/bin/bash
# SMS Wiederherstellungs-Skript
set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "SMS Wiederherstellung"
    echo ""
    echo "Verwendung:"
    echo "  ./restore.sh <backup-datei>"
    echo ""
    echo "Beispiele:"
    echo "  ./restore.sh /var/backups/sms/db/sms_2026-11-08_020000.sql.gz"
    echo "  ./restore.sh /var/backups/sms/files/sms_files_2026-11-08_020000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"
INSTALL_DIR="${INSTALL_DIR:-/opt/sms}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Datei nicht gefunden: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNUNG: Dies wird Daten überschreiben!"
echo "   Datei: $BACKUP_FILE"
read -p "Fortfahren? (j/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    echo "Abgebrochen."
    exit 0
fi

if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    echo "🗄️  Datenbank-Wiederherstellung..."
    gunzip -c "$BACKUP_FILE" | docker exec -i sms-postgres \
        psql -U "${POSTGRES_USER:-sms_user}" -d "${POSTGRES_DB:-sms}"
    echo "✅ Datenbank wiederhergestellt"

elif [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    echo "📁 Datei-Wiederherstellung..."
    tar -xzf "$BACKUP_FILE" -C "${INSTALL_DIR}/"
    echo "✅ Dateien wiederhergestellt"

elif [[ "$BACKUP_FILE" == *.bak ]]; then
    echo "🔧 Konfigurations-Wiederherstellung..."
    cp "$BACKUP_FILE" "${INSTALL_DIR}/.env"
    echo "✅ Konfiguration wiederhergestellt"
    echo "⚠️  Container müssen neu gestartet werden: docker compose down && docker compose up -d"
fi
