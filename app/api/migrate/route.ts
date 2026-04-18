import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const OLD_FILE = path.join(DATA_DIR, "kantine-data.json")
const USERS_FILE = path.join(DATA_DIR, "users.json")

function getKantineFilePath(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9]/g, "_")
  return path.join(DATA_DIR, `kantine-${safeId}.json`)
}

export async function GET() {
  try {
    // Prüfen ob Migration schon gelaufen ist
    if (fs.existsSync(USERS_FILE)) {
      return NextResponse.json({ 
        success: true, 
        message: "Migration already completed. users.json exists." 
      })
    }

    // Alte Datei lesen
    if (!fs.existsSync(OLD_FILE)) {
      return NextResponse.json({ 
        success: false, 
        message: "No kantine-data.json found" 
      })
    }

    const rawData = fs.readFileSync(OLD_FILE, "utf-8")
    const data = JSON.parse(rawData)

    const users = data.users || []
    const employees = data.employees || []
    const products = data.products || []
    const transactions = data.transactions || []
    const manualTransactions = data.manualTransactions || []
    const dailyStats = data.dailyStats || {}
    const employeesWithLunch = data.employeesWithLunch || {}

    // 1. Users-Datei erstellen (nur Array, ohne Wrapper-Objekt)
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))

    const results: any[] = []

    // 2. Für jeden User eine separate Kantine-Datei erstellen
    for (const user of users) {
      const userId = user.id

      const kantineEmployees = employees.filter((e: any) => e.userId === userId)
      const kantineProducts = products.filter((p: any) => p.userId === userId)

      const kantineEmployeeIds = new Set(kantineEmployees.map((e: any) => e.id))
      const kantineTransactions = transactions.filter((t: any) =>
        t.userId === userId || (!t.userId && kantineEmployeeIds.has(t.employeeId))
      )
      const kantineManualTransactions = manualTransactions.filter((t: any) =>
        t.userId === userId || (!t.userId && kantineEmployeeIds.has(t.employeeId))
      )

      const kantineDailyStats = dailyStats[userId] || {
        mittagessen: 0,
        broetchen: 0,
        eier: 0,
        kaffee: 0,
        gesamtbetrag: 0,
        date: null,
      }

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

      results.push({
        username: user.username,
        userId: userId,
        employees: kantineEmployees.length,
        products: kantineProducts.length,
        transactions: kantineTransactions.length,
        manualTransactions: kantineManualTransactions.length,
      })
    }

    // 3. Alte Datei umbenennen (Backup)
    const backupFile = path.join(DATA_DIR, `kantine-data-backup-${Date.now()}.json`)
    fs.renameSync(OLD_FILE, backupFile)

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      usersFile: "users.json",
      backupFile: path.basename(backupFile),
      kantinen: results,
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      { error: "Migration failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
