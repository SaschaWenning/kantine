# Automatische Schulden-Reports auf dem Raspberry Pi einrichten

## Zweimal täglich automatische E-Mails (8:00 und 20:00 Uhr)

Diese Anleitung richtet lokale Cron-Jobs auf dem Raspberry Pi ein.

## Einrichtung

**1. Skript ausführbar machen:**

```bash
cd /home/pi/kantine
chmod +x scripts/send-all-reports.sh
```

**2. Cron-Job Editor öffnen:**

```bash
crontab -e
```

**3. Folgende Zeilen am Ende hinzufügen:**

```bash
# Kantine Schulden-Reports - täglich um 8:00 und 20:00 Uhr
0 8 * * * /home/pi/kantine/scripts/send-all-reports.sh >> /home/pi/kantine/logs/cron.log 2>&1
0 20 * * * /home/pi/kantine/scripts/send-all-reports.sh >> /home/pi/kantine/logs/cron.log 2>&1
```

**4. Speichern und beenden:**
- Drücken Sie `Ctrl+O`, dann `Enter`
- Drücken Sie `Ctrl+X`

**5. Log-Verzeichnis erstellen:**

```bash
mkdir -p /home/pi/kantine/logs
```

**6. Cron-Jobs überprüfen:**

```bash
crontab -l
```

Sie sollten die beiden Zeilen sehen.

**7. Test - Manuell ausführen:**

```bash
/home/pi/kantine/scripts/send-all-reports.sh
```

## Logs anschauen

```bash
# Letzte Cron-Ausführungen
tail -f /home/pi/kantine/logs/cron.log

# Nur heutige Logs
grep "$(date +%Y-%m-%d)" /home/pi/kantine/logs/cron.log
```

## Cron-Jobs deaktivieren

Falls Sie die automatischen E-Mails stoppen möchten:

```bash
crontab -e
```

Kommentieren Sie die Zeilen aus (mit `#` am Anfang) oder löschen Sie sie.

## Zeitplan

- **08:00 Uhr morgens:** Täglicher Schulden-Report
- **20:00 Uhr abends:** Täglicher Schulden-Report

Die Reports werden:
1. Als HTML-Dateien in `/home/pi/kantine/reports/` gespeichert
2. Per E-Mail an die jeweilige PayPal-Adresse versendet

## Troubleshooting

**Cron läuft nicht:**
```bash
# Cron-Service prüfen
sudo systemctl status cron

# Cron-Service neustarten
sudo systemctl restart cron
```

**E-Mails werden nicht versendet:**
```bash
# Logs prüfen
tail -50 /home/pi/kantine/logs/cron.log

# App-Logs prüfen
pm2 logs kantineapp
```

**Manueller Test:**
```bash
curl -X POST http://localhost:3000/api/send-all-reports
```
