import { type NextRequest, NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getDebtReportHTML } from "@/lib/report-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Read the main data file
    const dataPath = join(process.cwd(), "data", "kantine-data.json")
    const rawData = await readFile(dataPath, "utf-8")
    const data = JSON.parse(rawData)

    const employees = data.employees || []
    const transactions = data.transactions || []
    const manualTransactions = data.manualTransactions || []
    const allTransactions = [...transactions, ...manualTransactions]

    // Group employees by userId (Kantine)
    const kantineGroups = new Map<string, any[]>()
    for (const emp of employees) {
      if (!kantineGroups.has(emp.userId)) {
        kantineGroups.set(emp.userId, [])
      }
      kantineGroups.get(emp.userId)!.push(emp)
    }

    // Create backup for each Kantine
    const reportDate = new Date()
    const reportsDir = join(process.cwd(), "reports")
    await mkdir(reportsDir, { recursive: true })

    const backups = []
    for (const [userId, kantineEmployees] of kantineGroups) {
      try {
        const kantineTransactions = allTransactions.filter(
          (t: any) => t.userId === userId || (!t.userId && kantineEmployees.some((e: any) => e.id === t.employeeId))
        )

        // Calculate balances für diese Kantine (mit GetProductCategory-Logik)
        const balancedEmployees = kantineEmployees.map((employee: any) => {
          const employeeTransactions = kantineTransactions
            .filter((t: any) => t.employeeId === employee.id)
            .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

          // Find last payment
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

        // Only create backup if there are open balances
        const hasOpenBalances = balancedEmployees.some((e) => e.balance !== 0)
        if (hasOpenBalances) {
          const totalDebt = balancedEmployees
            .filter((e) => e.balance > 0)
            .reduce((s, e) => s + e.balance, 0)

          // Direkt HTML generieren (nicht über API)
          const htmlContent = getDebtReportHTML(balancedEmployees, totalDebt, reportDate, userId)
          const filename = `schulden-report-${reportDate.toISOString().split("T")[0]}-${userId}-${Date.now()}.html`
          const filepath = join(reportsDir, filename)
          await writeFile(filepath, htmlContent)

          backups.push({
            kantine: userId,
            success: true,
            filename,
            totalDebt,
            employeeCount: balancedEmployees.filter((e: any) => e.balance !== 0).length,
          })
        } else {
          backups.push({
            kantine: userId,
            success: true,
            message: "No open balances, backup skipped",
          })
        }
      } catch (kantineError) {
        // Fehler bei einer Kantine sollte nicht den ganzen Backup stoppen
        backups.push({
          kantine: userId,
          success: false,
          error: kantineError instanceof Error ? kantineError.message : "Unknown error",
        })
        console.error(`Backup failed for Kantine ${userId}:`, kantineError)
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
