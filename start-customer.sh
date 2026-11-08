#!/bin/bash

# ============================================
# SMS - Customer Quick Start (Mac/Linux)
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  SMS - Server starten"
echo "========================================"
echo ""

cd SMS-Server

echo -e "${BLUE}Starte SMS Server...${NC}"
docker-compose up -d

if [ $? -ne 0 ]; then
    echo ""
    echo -e "\033[0;31mFEHLER: Server konnte nicht gestartet werden.\033[0m"
    echo "Bitte pruefen Sie ob Docker laeuft."
    exit 1
fi

echo ""
echo "Warte bis Server bereit ist..."
sleep 15

echo ""
echo "========================================"
echo "  SMS Server gestartet!"
echo "========================================"
echo ""
echo "Zugriff: http://localhost:5173"
echo ""

read -p "Browser oeffnen? (j/N): " openBrowser
if [[ "$openBrowser" =~ ^[jJ]$ ]]; then
    open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null
fi

echo ""
