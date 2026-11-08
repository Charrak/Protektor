#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# SMS - Security Management System
# One-Click Installation für Mac
# ═══════════════════════════════════════════════════════════════

# Farben definieren
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║   SMS - Security Management System                        ║${NC}"
echo -e "${BLUE}║   One-Click Installation für Mac                          ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Prüfen ob Docker installiert ist
echo -e "${BLUE}[1/6]${NC} Prüfe Docker Installation..."
if ! command -v docker &> /dev/null; then
    echo ""
    echo -e "${RED}❌ FEHLER: Docker ist nicht installiert!${NC}"
    echo ""
    echo "Bitte installiere Docker Desktop zuerst:"
    echo ""
    echo "Für Intel Mac:"
    echo "  curl -L -o Docker.dmg \"https://desktop.docker.com/mac/main/amd64/Docker.dmg\""
    echo "  hdiutil attach Docker.dmg"
    echo "  cp -R /Volumes/Docker/Docker.app /Applications/"
    echo "  hdiutil detach /Volumes/Docker"
    echo ""
    echo "Für Apple Silicon (M1/M2/M3):"
    echo "  curl -L -o Docker.dmg \"https://desktop.docker.com/mac/main/arm64/Docker.dmg\""
    echo "  hdiutil attach Docker.dmg"
    echo "  cp -R /Volumes/Docker/Docker.app /Applications/"
    echo "  hdiutil detach /Volumes/Docker"
    echo ""
    echo "Oder besuche: https://www.docker.com/products/docker-desktop/"
    echo ""
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
echo -e "${GREEN}✅ Docker ist installiert${NC}"
docker --version
echo ""

# Prüfen ob Docker läuft
echo -e "${BLUE}[2/6]${NC} Prüfe ob Docker läuft..."
if ! docker ps &> /dev/null; then
    echo ""
    echo -e "${RED}❌ FEHLER: Docker läuft nicht!${NC}"
    echo ""
    echo "Bitte starte Docker Desktop:"
    echo "  1. Öffne Docker Desktop aus Applications"
    echo "  2. Warte bis Docker vollständig gestartet ist"
    echo "  3. Starte dieses Script erneut"
    echo ""
    echo "Oder starte Docker über Terminal:"
    echo "  open /Applications/Docker.app"
    echo ""
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
echo -e "${GREEN}✅ Docker läuft${NC}"
echo ""

# Prüfen ob Git installiert ist
echo -e "${BLUE}[3/6]${NC} Prüfe Git Installation..."
if ! command -v git &> /dev/null; then
    echo ""
    echo -e "${RED}❌ FEHLER: Git ist nicht installiert!${NC}"
    echo ""
    echo "Bitte installiere Git:"
    echo ""
    echo "Option A: Über Homebrew (empfohlen)"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "  brew install git"
    echo ""
    echo "Option B: Über Xcode Command Line Tools"
    echo "  xcode-select --install"
    echo ""
    echo "Oder besuche: https://git-scm.com/download/mac"
    echo ""
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
echo -e "${GREEN}✅ Git ist installiert${NC}"
git --version
echo ""

# Repository klonen falls nötig
echo -e "${BLUE}[4/6]${NC} Prüfe Repository..."
if [ ! -d "Protektor" ]; then
    echo -e "${YELLOW}📥 Klone Repository...${NC}"
    git clone https://github.com/Charrak/Protektor.git
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ FEHLER: Repository konnte nicht geklont werden!${NC}"
        echo ""
        read -p "Drücke Enter zum Beenden..."
        exit 1
    fi
    echo -e "${GREEN}✅ Repository geklont${NC}"
else
    echo -e "${GREEN}✅ Repository existiert bereits${NC}"
fi
cd Protektor
echo ""

# Docker Compose starten
echo -e "${BLUE}[5/6]${NC} Starte Docker Container..."
echo -e "${YELLOW}⚠️  Dies kann beim ersten Mal 2-5 Minuten dauern...${NC}"
echo ""
docker-compose up -d
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ FEHLER: Docker Container konnten nicht gestartet werden!${NC}"
    echo ""
    docker-compose logs
    echo ""
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
echo -e "${GREEN}✅ Docker Container gestartet${NC}"
echo ""

# Warten bis Services ready sind
echo -e "${YELLOW}⏳ Warte bis alle Services bereit sind...${NC}"
sleep 30
echo -e "${GREEN}✅ Services sollten jetzt bereit sein${NC}"
echo ""

# Database Migration
echo -e "${BLUE}[6/6]${NC} Initialisiere Datenbank..."
docker-compose exec -T backend npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  WARNUNG: Database Migration fehlgeschlagen${NC}"
    echo "   (Möglicherweise läuft der Container noch nicht)"
    echo ""
else
    echo -e "${GREEN}✅ Datenbank initialisiert${NC}"
fi
echo ""

# Demo-Daten einspielen
echo -e "${YELLOW}🎭 Spiele Demo-Daten ein...${NC}"
docker-compose exec -T backend npm run seed:demo
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  WARNUNG: Demo-Daten konnten nicht eingespielt werden${NC}"
    echo ""
else
    echo -e "${GREEN}✅ Demo-Daten eingespielt${NC}"
fi
echo ""

# Erfolgsmeldung
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║   ✅ INSTALLATION ERFOLGREICH!                             ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}ZUGANGSDATEN${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📊 PLATFORM ADMIN (Software-Betreiber):${NC}"
echo "   URL: http://localhost:5173/platform"
echo "   Email: admin@sms-platform.com"
echo "   Password: Admin123!"
echo ""
echo -e "${YELLOW}🏢 TENANT 1: Security Nord GmbH (Premium)${NC}"
echo "   URL: http://localhost:5173"
echo "   License Key: lic_security-nord_premium"
echo "   Email: admin@security-nord.de"
echo "   Password: Password123!"
echo ""
echo -e "${YELLOW}🏢 TENANT 2: Schutz & Dienstleistungen AG (Enterprise)${NC}"
echo "   URL: http://localhost:5173"
echo "   License Key: lic_schutz-ag_enterprise"
echo "   Email: info@schutz-ag.de"
echo "   Password: Password123!"
echo ""
echo -e "${YELLOW}🏢 TENANT 3: Secure Solutions UG (Test)${NC}"
echo "   URL: http://localhost:5173"
echo "   License Key: lic_secure-solutions_test"
echo "   Email: kontakt@secure-solutions.de"
echo "   Password: Password123!"
echo ""
echo -e "${YELLOW}📚 API DOKUMENTATION:${NC}"
echo "   URL: http://localhost:5000/api-docs"
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""

# Browser öffnen
read -p "🌐 Browser öffnen? (j/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Jj]$ ]]; then
    open http://localhost:5173
fi

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}WICHTIGE BEFEHLE${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "SMS stoppen:     docker-compose down"
echo "SMS starten:     docker-compose up -d"
echo "Logs anzeigen:   docker-compose logs -f"
echo "Status prüfen:   docker-compose ps"
echo ""
echo "Bei Problemen: DOCKER-INSTALL-GUIDE.md lesen"
echo ""
read -p "Drücke Enter zum Beenden..."
