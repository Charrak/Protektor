#!/bin/bash

# SMS Schnellstart - Mac
# Startet das SMS ohne Neuinstallation

# Farben
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SMS - Security Management System - Schnellstart         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Prüfen ob Docker läuft
if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ Docker läuft nicht!${NC}"
    echo "   Bitte starte Docker Desktop zuerst:"
    echo "   open /Applications/Docker.app"
    echo ""
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi

# In Protektor Verzeichnis wechseln
if [ ! -d "Protektor" ]; then
    echo -e "${RED}❌ Protektor Verzeichnis nicht gefunden!${NC}"
    echo "   Bitte erst install.sh ausführen."
    echo ""
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi

cd Protektor

# Container starten
echo -e "${YELLOW}🚀 Starte SMS...${NC}"
docker-compose up -d

# Warten
echo -e "${YELLOW}⏳ Warte bis Services bereit sind...${NC}"
sleep 10

# Erfolg
echo ""
echo -e "${GREEN}✅ SMS ist gestartet!${NC}"
echo ""
echo -e "${BLUE}🌐 Frontend:${NC} http://localhost:5173"
echo -e "${BLUE}🔧 Platform:${NC} http://localhost:5173/platform"
echo -e "${BLUE}📚 API Docs:${NC} http://localhost:5000/api-docs"
echo ""

# Browser öffnen
read -p "Browser öffnen? (j/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Jj]$ ]]; then
    open http://localhost:5173
fi

echo ""
echo "Zum Stoppen: docker-compose down"
echo ""
read -p "Drücke Enter zum Beenden..."
