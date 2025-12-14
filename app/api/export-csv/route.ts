import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { employees, transactions, products } = await request.json()

    if (!employees || !transactions) {
      return NextResponse.json({ error: "No data available" }, { status: 400 })
    }

    // Create CSV content
    const csvContent = generateCSV(employees, transactions, products || [])

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="kantine-daten-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error generating CSV:", error)
    return NextResponse.json(
      { error: "Failed to generate CSV", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

function generateCSV(employees: any[], transactions: any[], products: any[]): string {
  const lines: string[] = []

  // Header
  lines.push("Typ,Mitarbeiter ID,Mitarbeiter Name,Produkt,Menge,Einzelpreis,Gesamtpreis,Datum,Aktuelles Guthaben")

  // Calculate current balances
  const employeesWithBalances = employees.map((employee) => {
    const employeeTransactions = transactions.filter((t) => t.employeeId === employee.id)
    const balance = employeeTransactions.reduce((sum, t) => sum + t.price, 0)
    return { ...employee, balance }
  })

  // Add transaction data
  transactions.forEach((transaction) => {
    const employee = employees.find((e) => e.id === transaction.employeeId)
    const employeeBalance = employeesWithBalances.find((e) => e.id === transaction.employeeId)?.balance || 0

    lines.push(
      [
        "Transaktion",
        transaction.employeeId,
        employee?.name || "Unbekannt",
        transaction.productName,
        transaction.quantity,
        (transaction.price / transaction.quantity).toFixed(2),
        transaction.price.toFixed(2),
        new Date(transaction.timestamp).toLocaleString("de-DE"),
        employeeBalance.toFixed(2),
      ]
        .map((field) => `"${field}"`)
        .join(","),
    )
  })

  // Add summary section
  lines.push("") // Empty line
  lines.push("ZUSAMMENFASSUNG")
  lines.push("Mitarbeiter,Aktuelles Guthaben")

  employeesWithBalances.forEach((employee) => {
    lines.push([employee.name, employee.balance.toFixed(2)].map((field) => `"${field}"`).join(","))
  })

  const totalDebt = employeesWithBalances.reduce((sum, emp) => sum + emp.balance, 0)
  lines.push("")
  lines.push(`"Gesamtschuld","${totalDebt.toFixed(2)}"`)
  lines.push(`"Export Datum","${new Date().toLocaleString("de-DE")}"`)

  return lines.join("\n")
}
