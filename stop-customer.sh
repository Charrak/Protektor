#!/bin/bash

# ============================================
# SMS - Customer Stop Server (Mac/Linux)
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "========================================"
echo "  SMS - Server stoppen"
echo "========================================"
echo ""

cd SMS-Server

echo -e "${BLUE}Stoppe SMS Server...${NC}"
docker-compose down

if [ $? -ne 0 ]; then
    echo ""
    echo -e "\033[0;31mFEHLER: Server konnte nicht gestoppt werden.\033[0m"
    exit 1
fi

echo ""
echo "========================================"
echo "  SMS Server gestoppt!"
echo "========================================"
echo ""
echo "Zum erneuten Starten: ./start-customer.sh"
echo ""
