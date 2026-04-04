#!/bin/bash

# Kantine App - Raspberry Pi Installation Script
# Dieses Script installiert die Kantine-App auf einem Raspberry Pi

echo "======================================"
echo "Kantine App - Installation"
echo "======================================"
echo ""

# Farben für Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Prüfen ob als root ausgeführt
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}Bitte führen Sie dieses Script NICHT als root aus!${NC}"
    echo "Verwenden Sie: bash install-raspberry.sh"
    exit 1
fi

# 1. System aktualisieren
echo -e "${YELLOW}Schritt 1/8: System aktualisieren...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# 2. Node.js installieren (falls nicht vorhanden)
echo -e "${YELLOW}Schritt 2/8: Node.js installieren...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}Node.js ist bereits installiert: $NODE_VERSION${NC}"
else
    echo "Node.js wird installiert..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}Node.js installiert: $(node -v)${NC}"
fi

# 3. Git installieren (falls nicht vorhanden)
echo -e "${YELLOW}Schritt 3/8: Git prüfen...${NC}"
if ! command -v git &> /dev/null; then
    echo "Git wird installiert..."
    sudo apt-get install -y git
fi
echo -e "${GREEN}Git ist verfügbar${NC}"

# 4. Repository klonen
echo -e "${YELLOW}Schritt 4/8: Repository klonen...${NC}"
INSTALL_DIR="$HOME/kantine"

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Verzeichnis existiert bereits. Wird aktualisiert...${NC}"
    cd "$INSTALL_DIR"
    git pull
else
    git clone https://github.com/saschawenning/kantine.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi
echo -e "${GREEN}Repository erfolgreich geladen${NC}"

# 5. Dependencies installieren
echo -e "${YELLOW}Schritt 5/8: Dependencies installieren...${NC}"
npm install
echo -e "${GREEN}Dependencies installiert${NC}"

# 6. Umgebungsvariablen einrichten
echo -e "${YELLOW}Schritt 6/8: Umgebungsvariablen einrichten...${NC}"
if [ ! -f ".env.local" ]; then
    echo "Bitte geben Sie Ihren RESEND_API_KEY ein (oder Enter für später):"
    read RESEND_KEY
    
    echo "Bitte geben Sie ein CRON_SECRET ein (oder Enter für Standard):"
    read CRON_SEC
    
    if [ -z "$CRON_SEC" ]; then
        CRON_SEC=$(openssl rand -base64 32)
    fi
    
    cat > .env.local << EOF
RESEND_API_KEY=${RESEND_KEY}
CRON_SECRET=${CRON_SEC}
EOF
    echo -e "${GREEN}.env.local Datei erstellt${NC}"
else
    echo -e "${GREEN}.env.local existiert bereits${NC}"
fi

# 7. App bauen
echo -e "${YELLOW}Schritt 7/8: App bauen...${NC}"
npm run build
echo -e "${GREEN}Build erfolgreich${NC}"

# 8. PM2 für Autostart einrichten
echo -e "${YELLOW}Schritt 8/8: PM2 für Autostart einrichten...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "PM2 wird installiert..."
    sudo npm install -g pm2
fi

# PM2 Prozess stoppen falls vorhanden
pm2 delete kantineapp 2>/dev/null || true

# App mit PM2 starten
pm2 start npm --name "kantineapp" -- start

# PM2 beim Systemstart aktivieren
pm2 startup systemd -u $USER --hp $HOME
pm2 save

echo -e "${GREEN}PM2 konfiguriert${NC}"

# Raspberry Pi IP-Adresse anzeigen
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo ""
echo "======================================"
echo -e "${GREEN}Installation abgeschlossen!${NC}"
echo "======================================"
echo ""
echo "Die Kantine-App läuft jetzt auf:"
echo -e "${GREEN}http://localhost:3000${NC}"
echo -e "${GREEN}http://$IP_ADDRESS:3000${NC}"
echo ""
echo "Nützliche Befehle:"
echo "  pm2 status          - Status anzeigen"
echo "  pm2 logs kantineapp - Logs anzeigen"
echo "  pm2 restart kantineapp - App neu starten"
echo "  pm2 stop kantineapp - App stoppen"
echo ""
echo "Umgebungsvariablen bearbeiten:"
echo "  nano $INSTALL_DIR/.env.local"
echo "  pm2 restart kantineapp (nach Änderungen)"
echo ""
echo "Verbinden Sie Ihre Tablets mit:"
echo -e "${YELLOW}http://$IP_ADDRESS:3000${NC}"
echo ""
