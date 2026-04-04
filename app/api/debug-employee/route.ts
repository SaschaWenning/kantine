import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name") || "karney"

  const filePath = path.join(process.cwd(), "data", "kantine-data.json")
  const raw = fs.readFileSync(filePath, "utf8")
  const data = JSON.parse(raw)

  const employee = data.employees?.find((e: any) =>
    e.name?.toLowerCase().includes(name.toLowerCase())
  )

  if (!employee) {
    return NextResponse.json({ error: "Employee not found", employees: data.employees?.map((e: any) => e.name) })
  }

  const purchases = (data.transactions || []).filter((t: any) => t.employeeId === employee.id)
  const manuals = (data.manualTransactions || []).filter((t: any) => t.employeeId === employee.id)

  const purchaseSum = purchases.reduce((s: number, t: any) => s + t.price, 0)
  const manualSum = manuals.reduce((s: number, t: any) => s + t.amount, 0)
  const total = Math.round((purchaseSum + manualSum) * 100) / 100

  return NextResponse.json({
    employee: { name: employee.name, id: employee.id, storedBalance: employee.balance },
    purchases: purchases.map((t: any) => ({ name: t.productName, price: t.price, date: t.timestamp })),
    manuals: manuals.map((t: any) => ({ name: t.productName, amount: t.amount, date: t.timestamp })),
    purchaseSum: Math.round(purchaseSum * 100) / 100,
    manualSum: Math.round(manualSum * 100) / 100,
    calculatedBalance: total,
    interpretation: total > 0 ? `SCHULDEN: €${total}` : `GUTHABEN: €${Math.abs(total)}`,
  })
}
