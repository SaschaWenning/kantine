import { type NextRequest, NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import { getDebtReportHTML } from "@/lib/report-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DATA_DIR = join(process.cwd(), "data")
const USERS_FILE = join(DATA_DIR, "users.json")

function getKantineFilePath(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9]/g, "_")
  return join(DATA_DIR, `kantine-${safeId}.json`)
}

export async function GET(request: NextRequest) {
  try {
    // Users laden
    let users: any[] = []
    try {
      const usersData = await readFile(USERS_FILE, "utf-8")
      users = JSON.parse(usersData).users || []
    } catch (e) {
      return NextResponse.json({ error: "No users.json found" }, { status: 404 })
    }

    const reportDate = new Date()
    const reportsDir = join(process.cwd(), "reports")
    await mkdir(reportsDir, { recursive: true })

    const backups = []

    // Für jede Kantine einen separaten Report erstellen
    for (const user of users) {
      try {
        const filePath = getKantineFilePath(user.id)
        let kantineData: any
        
        try {
          const rawData = await readFile(filePath, "utf-8")
          kantineData = JSON.parse(rawData)
        } catch (e) {
          backups.push({
            kantine: user.username,
            success: false,
            error: "Kantine data file not found",
          })
          continue
        }

        const employees = kantineData.employees || []
        const transactions = kantineData.transactions || []
        const manualTransactions = kantineData.manualTransactions || []
        const allTransactions = [...transactions, ...manualTransactions]

        // Balances berechnen
        const balancedEmployees = employees.map((employee: any) => {
          const employeeTransactions = allTransactions
            .filter((t: any) => t.employeeId === employee.id)
            .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

          // Letzte Bezahlung finden
          let lastPaymentIndex = -1
          for (let i = employeeTransactions.length - 1; i >= 0; i--) {
            const name = (employeeTransactions[i] as any).productName ?? ""
            if (name.toLowerCase().includes("bezahlung") || name.toLowerCase().includes("payment")) {
              lastPaymentIndex = i
              break
            }
          }

          const relevantTransactions = lastPaymentIndex >= 0
            ? employeeTransactions.slice(lastPaymentIndex + 1)
            : employeeTransactions

          const balance = relevantTransactions.reduce((sum: number, t: any) => {
            const val = "price" in t ? (t as any).price : (t as any).amount
            return sum + val
          }, 0)

          return {
            id: employee.id,
            name: employee.name,
            balance: Math.round(balance * 100) / 100,
          }
        })

        // Nur Report erstellen wenn offene Beträge vorhanden
        const hasOpenBalances = balancedEmployees.some((e: any) => e.balance !== 0)
        if (hasOpenBalances) {
          const totalDebt = balancedEmployees
            .filter((e: any) => e.balance > 0)
            .reduce((s: number, e: any) => s + e.balance, 0)

          const htmlContent = getDebtReportHTML(balancedEmployees, totalDebt, reportDate, user.username)
          const safeUsername = user.username.replace(/[^a-zA-Z0-9]/g, "_")
          const filename = `schulden-report-${reportDate.toISOString().split("T")[0]}-${safeUsername}.html`
          const filepath = join(reportsDir, filename)
          await writeFile(filepath, htmlContent)

          backups.push({
            kantine: user.username,
            success: true,
            filename,
            totalDebt,
            employeeCount: balancedEmployees.filter((e: any) => e.balance !== 0).length,
          })
        } else {
          backups.push({
            kantine: user.username,
            success: true,
            message: "No open balances, backup skipped",
          })
        }
      } catch (kantineError) {
        backups.push({
          kantine: user.username,
          success: false,
          error: kantineError instanceof Error ? kantineError.message : "Unknown error",
        })
        console.error(`Backup failed for ${user.username}:`, kantineError)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Daily backup completed for all Kantinen",
      backups,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Daily backup cron job error:", error)
    return NextResponse.json(
      { error: "Daily backup failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
