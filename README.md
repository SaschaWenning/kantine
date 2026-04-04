# Kantine Verwaltung - Wache 4 2/4 Tour

Eine moderne Web-Anwendung zur Verwaltung der Kantine mit automatischen E-Mail-Reports über Mitarbeiterschulden.

## Features

- 📊 **Mitarbeiterverwaltung** - Verwaltung von Mitarbeitern in verschiedenen Gruppen (4te Tour, 2Tour, Gäste)
- 🛒 **Produktkatalog** - Verwaltung von Süßigkeiten, Getränken, Snacks und Essen
- 💰 **Schuldentracking** - Automatische Berechnung und Verfolgung von Mitarbeiterschulden
- 📧 **Automatische E-Mail-Reports** - Täglich um 8:00 Uhr automatischer Versand der aktuellen Schulden
- 📱 **Responsive Design** - Funktioniert auf Desktop, Tablet und Smartphone
- 💾 **Automatische Backups** - Täglich automatische CSV-Datensicherung
- 🔐 **Admin-Bereich** - Geschützter Administrationsbereich

## Automatische E-Mail-Reports

Das System sendet automatisch täglich um 8:00 Uhr einen detaillierten Report über die aktuellen Mitarbeiterschulden an `kantinewache4@hotmail.com`.

### E-Mail-Report enthält:
- Zusammenfassung der Gesamtschulden
- Auflistung aller Mitarbeiter mit offenen Schulden
- Gruppierung nach Teams (4te Tour, 2Tour, Gäste)
- Sortierung nach Schuldenhöhe
- Zeitstempel der Generierung

## Installation & Setup

### 1. Repository klonen
\`\`\`bash
git clone <repository-url>
cd kantineapp
npm install
\`\`\`

### 2. Umgebungsvariablen konfigurieren

Erstellen Sie eine `.env.local` Datei im Projektverzeichnis:

\`\`\`env
# Erforderlich für Cron-Jobs (beliebiger sicherer String)
CRON_SECRET=ihr-sicherer-cron-secret

# Erforderlich für E-Mail-Versand (Resend API Key)
RESEND_API_KEY=re_ihr-resend-api-key

# Optional: Wird automatisch von Vercel gesetzt
VERCEL_URL=https://ihre-app.vercel.app
\`\`\`

### 3. Resend E-Mail-Service einrichten

1. Registrieren Sie sich bei [Resend](https://resend.com)
2. Erstellen Sie einen API-Key
3. Fügen Sie den API-Key als `RESEND_API_KEY` in Ihre Umgebungsvariablen ein
4. Verifizieren Sie Ihre Domain (oder nutzen Sie die Sandbox für Tests)

### 4. Deployment auf Vercel

\`\`\`bash
# Mit Vercel CLI
vercel --prod

# Oder pushen Sie zu GitHub und verbinden Sie mit Vercel
\`\`\`

### 5. Umgebungsvariablen in Vercel setzen

Gehen Sie zu Ihrem Vercel-Dashboard → Project Settings → Environment Variables und fügen Sie hinzu:
- `CRON_SECRET`
- `RESEND_API_KEY`

## Verwendung

### Für Mitarbeiter
1. Öffnen Sie die App
2. Klicken Sie auf Ihren Namen
3. Wählen Sie Produkte aus dem Katalog
4. Bestätigen Sie Ihre Auswahl

### Für Administratoren
1. Klicken Sie auf "Administrator-Bereich"
2. Geben Sie das Passwort ein: `kantinewache4`
3. Verwalten Sie Mitarbeiter, Produkte und Bestände
4. Markieren Sie Schulden als bezahlt
5. Exportieren/Importieren Sie Daten

## Technische Details

### Architektur
- **Frontend**: Next.js 14 mit React
- **Styling**: Tailwind CSS + shadcn/ui
- **Datenspeicherung**: localStorage (client-seitig)
- **E-Mail-Service**: Resend
- **Deployment**: Vercel
- **Cron-Jobs**: Vercel Cron

### Automatisierung
- **Cron-Schedule**: `0 8 * * *` (täglich um 8:00 Uhr)
- **Datensynchronisation**: Stündlich zwischen Client und Server
- **Backups**: Täglich automatisch

### Sicherheit
- Admin-Bereich passwortgeschützt
- Cron-Jobs durch Secret authentifiziert
- Keine sensiblen Daten in localStorage

### Vercel Plan Limitierungen
- **Hobby Plan**: Nur tägliche Cron-Jobs möglich
- **Pro Plan**: Für häufigere Cron-Jobs (alle 8 Stunden) erforderlich
- **Aktuelle Konfiguration**: Täglich um 8:00 Uhr (Hobby-Plan kompatibel)

## Fehlerbehebung

### E-Mails werden nicht gesendet
1. Überprüfen Sie den `RESEND_API_KEY`
2. Stellen Sie sicher, dass die Domain verifiziert ist
3. Prüfen Sie die Vercel-Logs auf Fehler

### Cron-Jobs funktionieren nicht
1. Überprüfen Sie den `CRON_SECRET`
2. Stellen Sie sicher, dass die `vercel.json` korrekt deployed wurde
3. Prüfen Sie die Vercel-Funktions-Logs

### Daten gehen verloren
1. Nutzen Sie die Export-Funktion für manuelle Backups
2. Automatische Backups werden täglich erstellt
3. Importieren Sie Daten über den Admin-Bereich

## Support

Bei Problemen oder Fragen wenden Sie sich an die Kantine-Verwaltung oder erstellen Sie ein Issue in diesem Repository.

## Lizenz

Dieses Projekt ist für den internen Gebrauch der Wache 4 bestimmt.
