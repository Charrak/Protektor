#!/bin/bash
# SMS Backup-Skript
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/sms}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sms}"
DATE=$(date +%Y-%m-%d_%H%M%S)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

echo "📋 SMS Backup gestartet: ${DATE}"

mkdir -p "${BACKUP_DIR}/db" "${BACKUP_DIR}/files"

# ─── Datenbank-Backup ───
echo "  Datenbank sichern..."
docker exec sms-postgres pg_dump \
    -U "${POSTGRES_USER:-sms_user}" \
    -d "${POSTGRES_DB:-sms}" \
    --clean --if-exists \
    | gzip > "${BACKUP_DIR}/db/sms_${DATE}.sql.gz"

echo "  ✓ Datenbank gesichert: sms_${DATE}.sql.gz ($(du -h "${BACKUP_DIR}/db/sms_${DATE}.sql.gz" | cut -f1))"

# ─── Datei-Backup (Uploads) ───
if [ -d "${INSTALL_DIR}/uploads" ]; then
    echo "  Upload-Dateien sichern..."
    tar -czf "${BACKUP_DIR}/files/sms_files_${DATE}.tar.gz" \
        -C "${INSTALL_DIR}" \
        uploads/ 2>/dev/null || true
    echo "  ✓ Dateien gesichert"
fi

# ─── Konfigurations-Backup ───
if [ -f "${INSTALL_DIR}/.env" ]; then
    cp "${INSTALL_DIR}/.env" "${BACKUP_DIR}/files/sms_env_${DATE}.bak"
    echo "  ✓ Konfiguration gesichert"
fi

# ─── Aufräumen ───
echo "  Alte Backups aufräumen (älter als ${RETENTION_DAYS} Tage)..."
find "${BACKUP_DIR}/db" -name "sms_*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}/files" -name "sms_files_*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}/files" -name "sms_env_*.bak" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

echo "✅ Backup abgeschlossen: ${DATE}"
