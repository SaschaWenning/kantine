import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const USERS_FILE = path.join(DATA_DIR, "users.json")

// Sicherstellen dass das Datenverzeichnis existiert
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Auto-Migration: falls users.json nicht existiert aber kantine-data.json schon
const OLD_DATA_FILE = path.join(DATA_DIR, "kantine-data.json")
if (!fs.existsSync(USERS_FILE) && fs.existsSync(OLD_DATA_FILE)) {
  try {
    console.log("[v0] Starting auto-migration from kantine-data.json to separate files...")
    const rawData = fs.readFileSync(OLD_DATA_FILE, "utf-8")
    const data = JSON.parse(rawData)

    const users = data.users || []
    const employees = data.employees || []
    const products = data.products || []
    const transactions = data.transactions || []
    const manualTransactions = data.manualTransactions || []
    const dailyStats = data.dailyStats || {}
    const employeesWithLunch = data.employeesWithLunch || {}

    // Users-Datei erstellen
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
    console.log(`[v0] Created users.json with ${users.length} users`)

    // Für jeden User eine separate Kantine-Datei erstellen
    for (const user of users) {
      const userId = user.id
      const safeId = userId.replace(/[^a-zA-Z0-9]/g, "_")
      const kantineFile = path.join(DATA_DIR, `kantine-${safeId}.json`)

      const kantineEmployees = employees.filter((e: any) => e.userId === userId)
      const kantineProducts = products.filter((p: any) => p.userId === userId)
      const kantineEmployeeIds = new Set(kantineEmployees.map((e: any) => e.id))
      const kantineTransactions = transactions.filter((t: any) =>
        t.userId === userId || (!t.userId && kantineEmployeeIds.has(t.employeeId))
      )
      const kantineManualTransactions = manualTransactions.filter((t: any) =>
        t.userId === userId || (!t.userId && kantineEmployeeIds.has(t.employeeId))
      )

      const kantineData = {
        employees: kantineEmployees,
        products: kantineProducts,
        transactions: kantineTransactions,
        manualTransactions: kantineManualTransactions,
        dailyStats: dailyStats[userId] || { mittagessen: 0, broetchen: 0, eier: 0, kaffee: 0, gesamtbetrag: 0, date: null },
        employeesWithLunch: employeesWithLunch[userId] || [],
      }

      fs.writeFileSync(kantineFile, JSON.stringify(kantineData, null, 2))
      console.log(`[v0] Created ${kantineFile} with ${kantineEmployees.length} employees, ${kantineTransactions.length} transactions`)
    }

    // Alte Datei umbenennen
    const backupFile = path.join(DATA_DIR, `kantine-data-migrated-${Date.now()}.json`)
    fs.renameSync(OLD_DATA_FILE, backupFile)
    console.log(`[v0] Migration complete. Old file backed up to ${backupFile}`)
  } catch (error) {
    console.error("[v0] Auto-migration failed:", error)
  }
} else if (!fs.existsSync(USERS_FILE)) {
  // Keine alte Datei vorhanden, leere users.json erstellen
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2))
}

// Dateipfad für eine bestimmte Kantine
function getKantineFilePath(oderId: string): string {
  // Sicherer Dateiname: nur alphanumerische Zeichen und Unterstriche
  const safeId = oderId.replace(/[^a-zA-Z0-9]/g, "_")
  return path.join(DATA_DIR, `kantine-${safeId}.json`)
}

// Users laden (Array-Format)
function readUsers(): any[] {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8")
    const parsed = JSON.parse(data)
    // Unterstützt sowohl { users: [] } als auch [] Format
    return Array.isArray(parsed) ? parsed : (parsed.users || [])
  } catch (error) {
    return []
  }
}

// Users speichern (Array-Format)
function writeUsers(users: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
}

// Kantine-Daten laden
function readKantineData(userId: string): any {
  const filePath = getKantineFilePath(userId)
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8")
      return JSON.parse(data)
    }
  } catch (error) {
    console.error(`Error reading kantine data for ${userId}:`, error)
  }
  // Default-Struktur für neue Kantine
  return {
    employees: [],
    products: [],
    transactions: [],
    manualTransactions: [],
    dailyStats: {},
    employeesWithLunch: [],
  }
}

// Kantine-Daten speichern
function writeKantineData(userId: string, data: any) {
  const filePath = getKantineFilePath(userId)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    // Wenn userId angegeben: nur Daten dieser Kantine laden
    if (userId) {
      const kantineData = readKantineData(userId)
      const users = readUsers()
      return NextResponse.json({
        users,
        ...kantineData,
      })
    }

    // Ohne userId: nur Users zurückgeben (für Login)
    const users = readUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error("GET /api/data error:", error)
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...updates } = body

    // Users aktualisieren (global)
    if (updates.users !== undefined) {
      writeUsers(updates.users)

      // Bei neuer Registrierung: leere Kantine-Datei erstellen
      for (const user of updates.users) {
        const filePath = getKantineFilePath(user.id)
        if (!fs.existsSync(filePath)) {
          writeKantineData(user.id, {
            employees: [],
            products: [],
            transactions: [],
            manualTransactions: [],
            dailyStats: {},
            employeesWithLunch: [],
          })
        }
      }
    }

    // Kantine-spezifische Daten aktualisieren
    if (userId) {
      const currentData = readKantineData(userId)
      const newData = {
        employees: updates.employees !== undefined ? updates.employees : currentData.employees,
        products: updates.products !== undefined ? updates.products : currentData.products,
        transactions: updates.transactions !== undefined ? updates.transactions : currentData.transactions,
        manualTransactions: updates.manualTransactions !== undefined ? updates.manualTransactions : currentData.manualTransactions,
        dailyStats: updates.dailyStats !== undefined ? updates.dailyStats : currentData.dailyStats,
        employeesWithLunch: updates.employeesWithLunch !== undefined ? updates.employeesWithLunch : currentData.employeesWithLunch,
      }
      writeKantineData(userId, newData)
      
      return NextResponse.json({ success: true, data: newData })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/data error:", error)
    return NextResponse.json({ error: "Failed to write data" }, { status: 500 })
  }
}
