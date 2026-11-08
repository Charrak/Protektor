#!/bin/bash

# SMS Stoppen - Mac

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SMS - Security Management System - Stoppen              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ! -d "Protektor" ]; then
    echo -e "${RED}❌ Protektor Verzeichnis nicht gefunden!${NC}"
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi

cd Protektor

echo -e "${RED}⏹️  Stoppe SMS...${NC}"
docker-compose down

echo ""
echo -e "${GREEN}✅ SMS wurde gestoppt${NC}"
echo ""
echo "Zum erneuten Starten: ./start.sh ausführen"
echo ""
read -p "Drücke Enter zum Beenden..."
