import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getDebtReportHTML } from "@/lib/report-service"

export async function POST(request: NextRequest) {
  try {
    const { employees, userId, kantineName } = await request.json()

    const employeesList = Array.isArray(employees) ? employees : []

    // Mitarbeiter mit offenem Saldo (positiv = Schulden, negativ = Guthaben)
    const employeesWithBalance = employeesList
      .filter((emp: any) => emp.balance !== 0)
      .map((emp: any) => ({ id: emp.id, name: emp.name, balance: emp.balance }))

    const totalDebt = employeesWithBalance
      .filter((emp: any) => emp.balance > 0)
      .reduce((sum: number, emp: any) => sum + emp.balance, 0)

    const reportDate = new Date()
    const htmlContent = getDebtReportHTML(employeesWithBalance, totalDebt, reportDate, kantineName)

    const reportsDir = join(process.cwd(), "reports")
    await mkdir(reportsDir, { recursive: true })

    const filename = `schulden-report-${reportDate.toISOString().split("T")[0]}-${Date.now()}.html`
    const filepath = join(reportsDir, filename)
    await writeFile(filepath, htmlContent)

    return NextResponse.json({
      success: true,
      message: "Schulden-Report erfolgreich gespeichert",
      filename,
      employeesWithBalance: employeesWithBalance.length,
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
