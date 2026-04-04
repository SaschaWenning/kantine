#!/bin/bash

# Kantine App - Update Script
# Aktualisiert die App auf die neueste Version

echo "======================================"
echo "Kantine App - Update"
echo "======================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

INSTALL_DIR="$HOME/kantine"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "Kantine-App nicht gefunden. Bitte zuerst installieren."
    exit 1
fi

cd "$INSTALL_DIR"

echo -e "${YELLOW}1. Repository aktualisieren...${NC}"
git pull

echo -e "${YELLOW}2. Dependencies aktualisieren...${NC}"
npm install

echo -e "${YELLOW}3. App neu bauen...${NC}"
npm run build

echo -e "${YELLOW}4. App neu starten...${NC}"
pm2 restart kantineapp

echo ""
echo -e "${GREEN}Update abgeschlossen!${NC}"
echo ""
pm2 logs kantineapp --lines 20
