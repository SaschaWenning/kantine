import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getDebtReportHTML } from "@/lib/report-service"

export async function POST(request: NextRequest) {
  try {
    const dataPath = path.join(process.cwd(), "data", "kantine-data.json")
    const fileContent = await fs.readFile(dataPath, "utf-8")
    const data = JSON.parse(fileContent)

    const { users, employees, transactions } = data

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "Keine Kantinen registriert" }, { status: 200 })
    }

    const results = []

    for (const user of users) {
      const userEmployees = employees.filter((e: any) => e.userId === user.id)
      const userTransactions = transactions.filter((t: any) => t.userId === user.id)

      const employeesWithDebts = userEmployees
        .map((employee: any) => {
          const employeeTransactions = userTransactions.filter((t: any) => t.employeeId === employee.id)
          const balance = employeeTransactions.reduce((sum: number, t: any) => sum + (t.price || 0), 0)
          return { ...employee, balance }
        })
        .filter((e: any) => e.balance > 0)

      const totalDebt = employeesWithDebts.reduce((sum: number, e: any) => sum + e.balance, 0)
      const reportDate = new Date()

      const htmlContent = getDebtReportHTML(employeesWithDebts, totalDebt, reportDate, user.username)

      const reportsDir = path.join(process.cwd(), "reports")
      await fs.mkdir(reportsDir, { recursive: true })

      const filename = `schulden-report-${user.username.replace(/\s+/g, "-")}-${reportDate.toISOString().split("T")[0]}-${Date.now()}.html`
      const reportPath = path.join(reportsDir, filename)
      await fs.writeFile(reportPath, htmlContent, "utf-8")

      results.push({
        username: user.username,
        employeesWithDebt: employeesWithDebts.length,
        totalDebt,
        filename,
      })
    }

    return NextResponse.json({
      message: "Alle Reports gespeichert",
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error saving reports:", error)
    return NextResponse.json(
      { error: "Fehler beim Speichern der Reports", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
