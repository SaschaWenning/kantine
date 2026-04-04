import fs from "fs"

const data = JSON.parse(fs.readFileSync("/home/user/data/kantine-data.json", "utf8"))

const employees = data.employees || []
const transactions = data.transactions || []
const manualTransactions = data.manualTransactions || []

const karney = employees.find(e => e.name.toLowerCase().includes("karney"))
if (!karney) {
  console.log("Karney nicht gefunden. Mitarbeiterliste:")
  const kantine4User = data.users.find(u => u.username.includes("4 Tour"))
  employees.filter(e => e.userId === kantine4User?.id).forEach(e => console.log(`  - ${e.name} (id: ${e.id})`))
} else {
  console.log(`Karney: ${karney.name}, id: ${karney.id}, gespeicherte balance: ${karney.balance}`)

  const karneyPurchases = transactions.filter(t => t.employeeId === karney.id)
  const karneyManuals = manualTransactions.filter(t => t.employeeId === karney.id)

  console.log(`\n=== Käufe (${karneyPurchases.length}) ===`)
  karneyPurchases.forEach(t => console.log(`  ${t.productName}: price=${t.price}  [${t.timestamp}]`))

  console.log(`\n=== ManualTransactions (${karneyManuals.length}) ===`)
  karneyManuals.forEach(t => console.log(`  ${t.productName}: amount=${t.amount}  [${t.timestamp}]`))

  const purchaseSum = karneyPurchases.reduce((s, t) => s + t.price, 0)
  const manualSum = karneyManuals.reduce((s, t) => s + t.amount, 0)
  const total = Math.round((purchaseSum + manualSum) * 100) / 100

  console.log(`\nKäufe Summe:   ${purchaseSum.toFixed(2)}`)
  console.log(`Manual Summe:  ${manualSum.toFixed(2)}`)
  console.log(`TOTAL:         ${total.toFixed(2)}  (positiv = Schulden, negativ = Guthaben)`)
  console.log(`Erwartet:      +33.30 (Schulden)`)
}
