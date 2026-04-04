// Skript zum Bereinigen der kantine-data.json
// Behebt Floating-Point-Fehler in den Balance-Werten

import fs from "fs"

const DATA_FILE = "/home/user/data/kantine-data.json"

const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))

// Alle Transaktionen pro Mitarbeiter neu berechnen
const employees = data.employees.map((emp) => {
  const empTransactions = (data.transactions || []).filter((t) => t.employeeId === emp.id)

  const balance = empTransactions.reduce((sum, t) => {
    const val = "price" in t ? t.price : t.amount
    return sum + val
  }, 0)

  // Floating-Point-Fehler bereinigen (auf 2 Dezimalstellen runden)
  const roundedBalance = Math.round(balance * 100) / 100

  if (emp.balance !== roundedBalance) {
    console.log(`${emp.name}: alte Balance=${emp.balance} → neue Balance=${roundedBalance}`)
  }

  return { ...emp, balance: roundedBalance }
})

data.employees = employees
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
console.log("Fertig! Balances wurden neu berechnet und gespeichert.")
