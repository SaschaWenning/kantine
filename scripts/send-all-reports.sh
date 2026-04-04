#!/bin/bash

# Kantine Schulden-Report - Automatisches Speichern
# Dieses Skript speichert täglich Schulden-Reports für alle Kantinen als HTML-Dateien
#
# Einrichtung Cron-Job auf dem Raspberry Pi (täglich um 8:00 Uhr):
#   crontab -e
#   0 8 * * * /home/pi/kantine/scripts/send-all-reports.sh >> /home/pi/kantine/logs/reports.log 2>&1

echo "[$(date)] Starte automatisches Speichern der Schulden-Reports..."

# API URL (lokaler Server)
API_URL="http://localhost:3000/api/send-all-reports"

# Sende Request an die API
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo "[$(date)] Reports erfolgreich gespeichert unter /home/pi/kantine/reports/"
  echo "$body"
else
  echo "[$(date)] Fehler beim Speichern der Reports (HTTP $http_code)"
  echo "$body"
fi

echo "[$(date)] Fertig."
