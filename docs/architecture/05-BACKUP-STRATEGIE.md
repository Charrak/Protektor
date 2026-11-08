# SMS – Backup-Strategie

**Version:** 1.0.0
**Datum:** 2026-11-08

---

## 1. Übersicht

### 1.1 Was wird gesichert

| Komponente         | Methode                    | Häufigkeit   |
|--------------------|----------------------------|--------------|
| PostgreSQL-Datenbank | pg_dump (Full Backup)    | Täglich 02:00 |
| Upload-Dateien     | tar + gzip                | Täglich 03:00 |
| Konfiguration      | Kopie .env, docker-compose | Bei Änderung |

### 1.2 Aufbewahrung

| Zeitraum       | Anzahl Backups   |
|----------------|------------------|
| Letzte 7 Tage  | Täglich          |
| Letzte 4 Wochen| Wöchentlich (Mo) |
| Letzte 12 Monate | Monatlich (1.) |

---

## 2. Backup-Skript

```bash
#!/bin/bash
# scripts/backup/backup.sh
# Erstellt ein vollständiges Backup von Datenbank und Dateien

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/sms}"
DATE=$(date +%Y-%m-%d_%H%M%S)
RETENTION_DAYS=7
RETENTION_WEEKS=28
RETENTION_MONTHS=365

# Datenbank-Backup
pg_backup() {
    local file="${BACKUP_DIR}/db/sms_${DATE}.sql.gz"
    docker exec sms-postgres pg_dump \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --clean --if-exists \
        | gzip > "${file}"
    echo "DB-Backup erstellt: ${file}"
}

# Datei-Backup (Uploads, Konfiguration)
file_backup() {
    local file="${BACKUP_DIR}/files/sms_files_${DATE}.tar.gz"
    tar -czf "${file}" \
        -C /opt/sms \
        uploads/ \
        .env \
        docker-compose.yml 2>/dev/null || true
    echo "Datei-Backup erstellt: ${file}"
}

# Alte Backups aufräumen
cleanup() {
    # Tägliche Backups älter als 7 Tage
    find "${BACKUP_DIR}/db" -name "sms_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}/files" -name "sms_files_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

    # Wöchentliche Backups behalten (jeder 7. Tag)
    for dir in "${BACKUP_DIR}/db" "${BACKUP_DIR}/files"; do
        local count=$(ls -1 "${dir}" | wc -l)
        if [ "$count" -gt 30 ]; then
            ls -1t "${dir}" | tail -n +31 | xargs -I {} rm -f "${dir}/{}"
        fi
    done
}

# Hauptablauf
mkdir -p "${BACKUP_DIR}/db" "${BACKUP_DIR}/files"
pg_backup
file_backup
cleanup
echo "Backup abgeschlossen: ${DATE}"
```

---

## 3. Wiederherstellung

```bash
#!/bin/bash
# scripts/backup/restore.sh
# Stellt ein Backup wieder her

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Verwendung: ./restore.sh <backup-datei>"
    echo "  Datenbank: sms_YYYY-MM-DD_HHMMSS.sql.gz"
    echo "  Dateien:   sms_files_YYYY-MM-DD_HHMMSS.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    echo "Datenbank-Wiederherstellung aus: $BACKUP_FILE"
    gunzip -c "$BACKUP_FILE" | docker exec -i sms-postgres \
        psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
    echo "Datenbank wiederhergestellt"

elif [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    echo "Datei-Wiederherstellung aus: $BACKUP_FILE"
    tar -xzf "$BACKUP_FILE" -C /opt/sms/
    echo "Dateien wiederhergestellt"
fi
```

---

## 4. Cron-Konfiguration

```cron
# Tägliches Backup um 02:00 Uhr
0 2 * * * /opt/sms/scripts/backup/backup.sh >> /var/log/sms-backup.log 2>&1
```

---

## 5. Verschlüsselung (Optional)

Für sensible Umgebungen können Backups mit GPG verschlüsselt werden:

```bash
# Backup verschlüsseln
gpg --symmetric --cipher-algo AES256 -o backup.sql.gz.gpg backup.sql.gz

# Backup entschlüsseln
gpg --decrypt -o backup.sql.gz backup.sql.gz.gpg
```

---

## 6. Remote-Backup

Optionale Konfiguration für externe Speicherung:

```bash
# Upload zu Remote-Server
rsync -avz "${BACKUP_DIR}/db/latest.sql.gz" user@backup-server:/backups/sms/
```
