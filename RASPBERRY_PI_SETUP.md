# Kantine App - Raspberry Pi Installation

## Voraussetzungen

- Raspberry Pi 3 oder neuer
- Raspberry Pi OS (aktuell)
- Internetverbindung
- 2 Tablets im gleichen Netzwerk

## Schnellinstallation

1. **Download des Installationsskripts:**
   \`\`\`bash
   cd ~
   wget https://raw.githubusercontent.com/saschawenning/kantine/main/install-raspberry.sh
   chmod +x install-raspberry.sh
   \`\`\`

2. **Installation starten:**
   \`\`\`bash
   ./install-raspberry.sh
   \`\`\`

3. **Warten bis fertig** (ca. 5-10 Minuten)

4. **Fertig!** Die App läuft auf `http://[RASPBERRY-PI-IP]:3000`

## Zugriff von Tablets

1. Finden Sie die IP-Adresse des Raspberry Pi:
   \`\`\`bash
   hostname -I
   \`\`\`

2. Öffnen Sie auf beiden Tablets im Browser:
   \`\`\`
   http://[RASPBERRY-PI-IP]:3000
   \`\`\`

3. Beispiel: `http://192.168.1.100:3000`

## Verwaltungsbefehle

### App-Status prüfen
\`\`\`bash
pm2 status
\`\`\`

### Logs ansehen
\`\`\`bash
pm2 logs kantineapp
\`\`\`

### App neu starten
\`\`\`bash
pm2 restart kantineapp
\`\`\`

### App stoppen
\`\`\`bash
pm2 stop kantineapp
\`\`\`

### App starten
\`\`\`bash
pm2 start kantineapp
\`\`\`

## App aktualisieren

\`\`\`bash
cd ~/kantine
./update.sh
\`\`\`

## Umgebungsvariablen ändern

\`\`\`bash
nano ~/kantine/.env.local
pm2 restart kantineapp
\`\`\`

## Datenbackup

Die Daten werden gespeichert in:
\`\`\`
~/kantine/data/kantine-data.json
\`\`\`

Backup erstellen:
\`\`\`bash
cp ~/kantine/data/kantine-data.json ~/kantine-backup-$(date +%Y%m%d).json
\`\`\`

## Fehlerbehebung

### App startet nicht
\`\`\`bash
cd ~/kantine
pm2 logs kantineapp
\`\`\`

### Port 3000 bereits belegt
\`\`\`bash
# Port ändern (z.B. auf 3001)
nano ~/kantine/package.json
# Ändern Sie: "start": "next start -p 3001"
pm2 restart kantineapp
\`\`\`

### Keine Verbindung von Tablets
1. Firewall prüfen:
   \`\`\`bash
   sudo ufw allow 3000
   \`\`\`

2. IP-Adresse prüfen:
   \`\`\`bash
   hostname -I
   \`\`\`

3. Ping vom Tablet zum Pi testen

## Autostart beim Neustart

Der Autostart wurde bereits durch PM2 eingerichtet. Die App startet automatisch nach einem Neustart des Raspberry Pi.

Prüfen:
\`\`\`bash
pm2 list
\`\`\`

## Netzwerk-Tipps

- Verwenden Sie eine **statische IP** für den Raspberry Pi
- Verbinden Sie alle Geräte mit dem **gleichen WLAN/Netzwerk**
- Bei Problemen: Router neu starten

## Performance-Optimierung

Für bessere Performance auf Raspberry Pi 3:
\`\`\`bash
# Swap-Speicher erhöhen
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Ändern Sie: CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
\`\`\`

## Support

Bei Problemen:
1. Logs prüfen: `pm2 logs kantineapp`
2. App neu starten: `pm2 restart kantineapp`
3. System neu starten: `sudo reboot`
