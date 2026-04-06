"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save } from "lucide-react"
import type { Employee, Product, Transaction } from "@/lib/storage"

interface QuickBookingProps {
  employees: Employee[]
  products: Product[]
  onAddTransaction: (transaction: Omit<Transaction, "id" | "timestamp">) => Promise<void> | void
  addEmployeeToMealList: (employeeId: string) => void
  onBack: () => void
  groupNames?: { group1: string; group2: string; group3: string }
}

interface BookingSelection {
  [employeeId: string]: {
    mittagessen: boolean
    fruehstueck: boolean
    kaffee: boolean
  }
}

export default function QuickBooking({
  employees,
  products,
  onAddTransaction,
  addEmployeeToMealList,
  onBack,
  groupNames,
}: QuickBookingProps) {
  const [selections, setSelections] = useState<BookingSelection>({})
  const [saving, setSaving] = useState(false)

  // Produkte exakt suchen - "Frühstück ausgegeben" (40€ Ausgabe) darf NICHT getroffen werden
  const mittagessen = products.find((p) => p.name.toLowerCase() === "mittagessen")
    ?? products.find((p) => p.name.toLowerCase().includes("mittagessen"))
  const fruehstueck = products.find((p) => p.name.toLowerCase() === "brötchen")
    ?? products.find((p) => p.name.toLowerCase() === "frühstück")
    ?? products.find((p) => p.name.toLowerCase().includes("brötchen") && !p.name.toLowerCase().includes("ausgegeben") && !p.name.toLowerCase().includes("abschied"))
  const kaffee = products.find((p) => p.name.toLowerCase() === "kaffee")
    ?? products.find((p) => p.name.toLowerCase().includes("kaffee"))

  const toggle = (employeeId: string, field: "mittagessen" | "fruehstueck" | "kaffee") => {
    setSelections((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || { mittagessen: false, fruehstueck: false, kaffee: false }),
        [field]: !(prev[employeeId]?.[field] || false),
      },
    }))
  }

  const handleSaveAll = async () => {
    setSaving(true)
    let transactionCount = 0

    for (const [employeeId, selection] of Object.entries(selections)) {
      const employee = employees.find((e) => e.id === employeeId)
      if (!employee) continue

      if (selection.mittagessen && mittagessen) {
        await onAddTransaction({
          employeeId,
          employeeName: employee.name,
          productId: mittagessen.id,
          productName: mittagessen.name,
          price: mittagessen.price,
          quantity: 1,
          userId: employee.userId,
        })
        addEmployeeToMealList(employeeId)
        transactionCount++
      }

      if (selection.fruehstueck && fruehstueck) {
        await onAddTransaction({
          employeeId,
          employeeName: employee.name,
          productId: fruehstueck.id,
          productName: fruehstueck.name,
          price: fruehstueck.price,
          quantity: 1,
          userId: employee.userId,
        })
        transactionCount++
      }

      if (selection.kaffee && kaffee && !employee.hideCoffee) {
        await onAddTransaction({
          employeeId,
          employeeName: employee.name,
          productId: kaffee.id,
          productName: kaffee.name,
          price: kaffee.price,
          quantity: 1,
          userId: employee.userId,
        })
        transactionCount++
      }
    }

    setSaving(false)
    setSelections({})
    alert(`${transactionCount} Buchungen erfolgreich gespeichert!`)
  }

  const totalSelections = Object.values(selections).reduce(
    (acc, sel) => acc + (sel.mittagessen ? 1 : 0) + (sel.fruehstueck ? 1 : 0) + (sel.kaffee ? 1 : 0),
    0
  )

  // Mitarbeiter nach Gruppe aufteilen
  const groups = [
    { key: "group1", label: groupNames?.group1 || "Tour 1" },
    { key: "group2", label: groupNames?.group2 || "Tour 2" },
    { key: "group3", label: groupNames?.group3 || "Gäste" },
  ]

  const getGroupEmployees = (groupKey: string) =>
    employees.filter((e) => e.group === groupKey).sort((a, b) => a.name.localeCompare(b.name))

  const employeeRow = (employee: Employee) => (
    <div key={employee.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 border-b py-2 items-center">
      <div className="font-medium text-sm">{employee.name}</div>
      <div className="flex justify-center">
        <Checkbox
          checked={selections[employee.id]?.mittagessen || false}
          onCheckedChange={() => toggle(employee.id, "mittagessen")}
        />
      </div>
      <div className="flex justify-center">
        <Checkbox
          checked={selections[employee.id]?.fruehstueck || false}
          onCheckedChange={() => toggle(employee.id, "fruehstueck")}
          disabled={!fruehstueck}
        />
      </div>
      <div className="flex justify-center">
        {employee.hideCoffee ? (
          <span className="text-xs text-muted-foreground">-</span>
        ) : (
          <Checkbox
            checked={selections[employee.id]?.kaffee || false}
            onCheckedChange={() => toggle(employee.id, "kaffee")}
            disabled={!kaffee}
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack} className="gap-2 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <Button onClick={handleSaveAll} disabled={totalSelections === 0 || saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Wird gespeichert..." : `Alle buchen (${totalSelections})`}
          </Button>
        </div>

        {groups.map((group) => {
          const groupEmployees = getGroupEmployees(group.key)
          if (groupEmployees.length === 0) return null
          return (
            <Card key={group.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{group.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 border-b pb-2 text-sm font-semibold text-muted-foreground">
                  <div>Mitarbeiter</div>
                  <div className="text-center">Mittagessen</div>
                  <div className="text-center">Frühstück</div>
                  <div className="text-center">Kaffee</div>
                </div>
                {groupEmployees.map(employeeRow)}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
