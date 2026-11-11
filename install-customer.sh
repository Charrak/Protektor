#!/bin/bash

# ============================================
# SMS - Customer Installation (Mac/Linux)
# Production Build - No Source Code
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  SMS - Security Management System"
echo "  Kunden-Installation (Production)"
echo "========================================"
echo ""
echo "Diese Installation enthaelt:"
echo "  - Fertige Docker-Images (kein Source-Code)"
echo "  - Einfache Konfiguration"
echo "  - Produktionseinsatz bereit"
echo ""
echo "Voraussetzungen:"
echo "  - Docker Desktop installiert und gestartet"
echo "  - Mindestens 4GB RAM frei"
echo "  - 10GB Festplattenspeicher"
echo ""
read -p "Fortfahren? (Enter druecken)"

# Check Docker
echo ""
echo -e "${BLUE}[1/6]${NC} Pruefe Docker-Installation..."
if ! command -v docker &> /dev/null; then
    echo ""
    echo -e "${RED}FEHLER: Docker ist nicht installiert!${NC}"
    echo ""
    echo "Bitte installieren Sie Docker Desktop:"
    echo "https://www.docker.com/products/docker-desktop"
    echo ""
    echo "Oder via Homebrew:"
    echo "  brew install --cask docker"
    echo ""
    exit 1
fi
echo -e "  ${GREEN}[OK]${NC} Docker ist installiert"

# Check Docker running
echo ""
echo -e "${BLUE}[2/6]${NC} Pruefe ob Docker laeuft..."
if ! docker ps &> /dev/null; then
    echo ""
    echo -e "${RED}FEHLER: Docker Desktop ist nicht gestartet!${NC}"
    echo ""
    echo "Bitte starten Sie Docker Desktop und versuchen Sie es erneut."
    echo ""
    exit 1
fi
echo -e "  ${GREEN}[OK]${NC} Docker laeuft"

# Create installation directory
echo ""
echo -e "${BLUE}[3/6]${NC} Erstelle Installationsverzeichnis..."
mkdir -p SMS-Server
cd SMS-Server
echo -e "  ${GREEN}[OK]${NC} Verzeichnis erstellt: $(pwd)"

# Download Docker Compose file
echo ""
echo -e "${BLUE}[4/6]${NC} Lade Docker-Konfiguration..."
if ! curl -fsSL https://raw.githubusercontent.com/Charrak/Protektor/main/docker-compose.prod.yml -o docker-compose.yml; then
    echo -e "${RED}FEHLER: Konnte Docker-Konfiguration nicht herunterladen.${NC}"
    echo "Bitte pruefen Sie Ihre Internetverbindung."
    exit 1
fi
echo -e "  ${GREEN}[OK]${NC} Docker-Konfiguration geladen"

# Create .env file
echo ""
echo -e "${BLUE}[5/6]${NC} Erstelle Konfigurationsdatei..."
if [ ! -f .env ]; then
    cat > .env << EOF
# SMS Server Konfiguration

# Datenbank Passwort (AENDERN!)
POSTGRES_PASSWORD=sms_password_$RANDOM

# JWT Secret (AENDERN!)
JWT_SECRET=change-this-secret-$RANDOM-$RANDOM-$RANDOM

# Admin Email
PLATFORM_ADMIN_EMAIL=admin@sms-platform.com

# Admin Password (AENDERN!)
PLATFORM_ADMIN_PASSWORD=Admin123!
EOF
    echo -e "  ${GREEN}[OK]${NC} Konfigurationsdatei erstellt: .env"
    echo -e "  ${YELLOW}[WICHTIG]${NC} Bitte .env oeffnen und Passwoerter aendern!"
else
    echo -e "  [INFO] .env existiert bereits, wird uebersprungen"
fi

# Start containers
echo ""
echo -e "${BLUE}[6/6]${NC} Starte SMS Server..."
docker-compose pull
docker-compose up -d

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}FEHLER: Container konnten nicht gestartet werden.${NC}"
    echo "Bitte pruefen Sie die Logs: docker-compose logs"
    exit 1
fi

# Wait for services
echo ""
echo "Warte bis alle Services bereit sind..."
sleep 30

# Initialize database
echo ""
echo "Initialisiere Datenbank..."
docker-compose exec -T backend npx prisma db push --skip-generate > /dev/null 2>&1

# Show success message
echo ""
echo "========================================"
echo "  INSTALLATION ABGESCHLOSSEN!"
echo "========================================"
echo ""
echo "Ihr SMS Server laeuft jetzt!"
echo ""
echo "Zugriff:"
echo "  Webseite: http://localhost:5173"
echo "  API: http://localhost:5000/api"
echo ""
echo "Admin-Zugangsdaten:"
echo "  Email: admin@sms-platform.com"
echo "  Passwort: Admin123!"
echo "  [WICHTIG] Bitte sofort aendern!"
echo ""
echo "Naechste Schritte:"
echo "  1. .env oeffnen und Passwoerter aendern"
echo "  2. Browser oeffnen: http://localhost:5173"
echo "  3. Mit Admin-Zugangsdaten anmelden"
echo "  4. Tenant anlegen fuer ersten Kunden"
echo ""
echo "Hilfe:"
echo "  Logs anzeigen: docker-compose logs -f"
echo "  Server stoppen: docker-compose down"
echo "  Server starten: docker-compose up -d"
echo ""

# Offer to open browser
read -p "Browser jetzt oeffnen? (j/N): " openBrowser
if [[ "$openBrowser" =~ ^[jJ]$ ]]; then
    open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || echo "Bitte oeffnen Sie http://localhost:5173 manuell"
fi

echo ""
echo "Installation abgeschlossen."
