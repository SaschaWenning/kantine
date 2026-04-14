import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    // Verify Cron Secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Read the main data file
    const dataPath = join(process.cwd(), "data", "kantine-data.json")
    const rawData = await readFile(dataPath, "utf-8")
    const data = JSON.parse(rawData)

    // Get all employees and group by userId (Kantine)
    const employees = data.employees || []
    const transactions = data.transactions || []
    const manualTransactions = data.manualTransactions || []

    const allTransactions = [...transactions, ...manualTransactions]

    // Group employees by userId
    const kantineGroups = new Map<string, any[]>()
    for (const emp of employees) {
      if (!kantineGroups.has(emp.userId)) {
        kantineGroups.set(emp.userId, [])
      }
      kantineGroups.get(emp.userId)!.push(emp)
    }

    // Create backup for each Kantine
    const backups = []
    for (const [userId, kantineEmployees] of kantineGroups) {
      const kantineTransactions = allTransactions.filter(
        (t: any) => t.userId === userId || (!t.userId && kantineEmployees.some((e: any) => e.id === t.employeeId))
      )

      // Calculate balances for this Kantine
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

        const response = await fetch(`${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/send-debt-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            kantineName: kantineEmployees[0]?.userId,
            employees: balancedEmployees,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          backups.push({
            kantine: kantineEmployees[0]?.userId,
            success: true,
            filename: result.filename,
            totalDebt,
            employeeCount: balancedEmployees.filter((e: any) => e.balance !== 0).length,
          })
        } else {
          backups.push({
            kantine: kantineEmployees[0]?.userId,
            success: false,
            error: "API call failed",
          })
        }
      } else {
        backups.push({
          kantine: kantineEmployees[0]?.userId,
          success: true,
          message: "No open balances, backup skipped",
        })
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
