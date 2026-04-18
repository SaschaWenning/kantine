/**
 * Migration Script: Splittet kantine-data.json in separate Dateien pro Kantine
 * 
 * Führe aus mit: node scripts/migrate-to-separate-files.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'data')
const OLD_FILE = path.join(DATA_DIR, 'kantine-data.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

function getKantineFilePath(userId) {
  const safeId = userId.replace(/[^a-zA-Z0-9]/g, '_')
  return path.join(DATA_DIR, `kantine-${safeId}.json`)
}

function migrate() {
  console.log('Starting migration...')
  
  // Alte Datei lesen
  if (!fs.existsSync(OLD_FILE)) {
    console.log('No kantine-data.json found. Nothing to migrate.')
    return
  }

  const rawData = fs.readFileSync(OLD_FILE, 'utf-8')
  const data = JSON.parse(rawData)

  const users = data.users || []
  const employees = data.employees || []
  const products = data.products || []
  const transactions = data.transactions || []
  const manualTransactions = data.manualTransactions || []
  const dailyStats = data.dailyStats || {}
  const employeesWithLunch = data.employeesWithLunch || {}

  console.log(`Found ${users.length} users`)
  console.log(`Found ${employees.length} employees`)
  console.log(`Found ${products.length} products`)
  console.log(`Found ${transactions.length} transactions`)
  console.log(`Found ${manualTransactions.length} manual transactions`)

  // 1. Users-Datei erstellen
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2))
  console.log(`Created ${USERS_FILE}`)

  // 2. Für jeden User eine separate Kantine-Datei erstellen
  for (const user of users) {
    const userId = user.id
    
    const kantineEmployees = employees.filter(e => e.userId === userId)
    const kantineProducts = products.filter(p => p.userId === userId)
    
    // Transaktionen: nach userId oder employeeId (für alte Daten ohne userId)
    const kantineEmployeeIds = new Set(kantineEmployees.map(e => e.id))
    const kantineTransactions = transactions.filter(t => 
      t.userId === userId || (!t.userId && kantineEmployeeIds.has(t.employeeId))
    )
    const kantineManualTransactions = manualTransactions.filter(t =>
      t.userId === userId || (!t.userId && kantineEmployeeIds.has(t.employeeId))
    )

    // DailyStats für diese Kantine
    const kantineDailyStats = dailyStats[userId] || { 
      mittagessen: 0, 
      broetchen: 0, 
      eier: 0, 
      kaffee: 0, 
      gesamtbetrag: 0,
      date: null 
    }

    // EmployeesWithLunch für diese Kantine
    const kantineEmployeesWithLunch = employeesWithLunch[userId] || []

    const kantineData = {
      employees: kantineEmployees,
      products: kantineProducts,
      transactions: kantineTransactions,
      manualTransactions: kantineManualTransactions,
      dailyStats: kantineDailyStats,
      employeesWithLunch: kantineEmployeesWithLunch,
    }

    const filePath = getKantineFilePath(userId)
    fs.writeFileSync(filePath, JSON.stringify(kantineData, null, 2))
    
    console.log(`Created ${filePath}`)
    console.log(`  - ${kantineEmployees.length} employees`)
    console.log(`  - ${kantineProducts.length} products`)
    console.log(`  - ${kantineTransactions.length} transactions`)
    console.log(`  - ${kantineManualTransactions.length} manual transactions`)
  }

  // 3. Alte Datei umbenennen (Backup)
  const backupFile = path.join(DATA_DIR, `kantine-data-backup-${Date.now()}.json`)
  fs.renameSync(OLD_FILE, backupFile)
  console.log(`\nBackup created: ${backupFile}`)

  console.log('\nMigration completed successfully!')
}

migrate()
