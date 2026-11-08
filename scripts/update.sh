#!/bin/bash
# SMS Update-Skript
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/sms}"
cd "$INSTALL_DIR"

echo "📦 SMS Update gestartet..."
echo "Datum: $(date)"

# Backup vor dem Update
if [ -f scripts/backup/backup.sh ]; then
    echo "📋 Erstelle Backup vor Update..."
    bash scripts/backup/backup.sh || echo "⚠️ Backup fehlgeschlagen, fahre trotzdem fort"
fi

# Neuesten Code holen
echo "📥 Lade neuesten Code..."
git pull origin main

# Container neu bauen und starten
echo "🐳 Baue Container neu..."
docker compose up -d --build

# Datenbank-Migrationen ausführen
echo "🗄️ Führe Datenbank-Migrationen aus..."
docker compose exec -T backend npx prisma migrate deploy

# Aufräumen
echo "🧹 Räume alte Images auf..."
docker image prune -f

echo "✅ Update abgeschlossen!"
echo "Status:"
docker compose ps
