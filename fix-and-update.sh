#!/bin/bash

echo "======================================"
echo "Kantine App - Fix und Update"
echo "======================================"
echo ""

# Zum App-Verzeichnis wechseln
cd /home/pi/kantine

echo "Schritt 1/5: Alte Dependencies löschen..."
rm -rf node_modules
rm -f package-lock.json

echo "Schritt 2/5: Neue Dependencies installieren..."
npm install --legacy-peer-deps

echo "Schritt 3/5: App bauen..."
npm run build

echo "Schritt 4/5: PM2 neu starten..."
pm2 restart kantineapp

echo "Schritt 5/5: Status prüfen..."
pm2 status

echo ""
echo "======================================"
echo "Update abgeschlossen!"
echo "======================================"
echo ""
echo "Die App läuft auf:"
echo "http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Logs anzeigen: pm2 logs kantineapp"
echo ""
