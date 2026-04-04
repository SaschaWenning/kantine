import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getDebtReportHTML } from "@/lib/report-service"

export async function POST(request: NextRequest) {
  try {
    const { employees, transactions, userId, kantineName } = await request.json()

    const employeesList = Array.isArray(employees) ? employees : []
    const transactionsList = Array.isArray(transactions) ? transactions : []

    const employeesWithDebts = employeesList
      .map((employee: any) => {
        const employeeTransactions = transactionsList.filter((t: any) => t.employeeId === employee.id)
        const totalDebt = employeeTransactions.reduce((sum: number, t: any) => sum + (t.price || 0), 0)
        return { ...employee, balance: totalDebt }
      })
      .filter((employee: any) => employee.balance > 0)

    const totalDebt = employeesWithDebts.reduce((sum: number, emp: any) => sum + emp.balance, 0)
    const reportDate = new Date()

    const htmlContent = getDebtReportHTML(employeesWithDebts, totalDebt, reportDate, kantineName)

    const reportsDir = join(process.cwd(), "reports")
    await mkdir(reportsDir, { recursive: true })

    const filename = `schulden-report-${reportDate.toISOString().split("T")[0]}-${Date.now()}.html`
    const filepath = join(reportsDir, filename)
    await writeFile(filepath, htmlContent)

    return NextResponse.json({
      success: true,
      message: "Schulden-Report erfolgreich gespeichert",
      filepath: filename,
      employeesWithDebt: employeesWithDebts.length,
      totalDebt,
    })
  } catch (error) {
    console.error("Error saving debt report:", error)
    return NextResponse.json(
      { error: "Fehler beim Speichern des Reports", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
