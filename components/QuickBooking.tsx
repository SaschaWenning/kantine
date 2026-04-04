"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save } from "lucide-react"
import type { Employee, Product, Transaction } from "@/lib/storage"

interface QuickBookingProps {
  employees: Employee[]
  products: Product[]
  onAddTransaction: (transaction: Omit<Transaction, "id" | "timestamp">) => Promise<void> | void
  addEmployeeToMealList: (employeeId: string) => void
  onBack: () => void
}

interface BookingSelection {
  [employeeId: string]: {
    mittagessen: boolean
    broetchen: number
    eier: number
    kaffee: boolean
  }
}

export default function QuickBooking({
  employees,
  products,
  onAddTransaction,
  updateDailyStats,
  addEmployeeToMealList,
  onBack,
}: QuickBookingProps) {
  const [selections, setSelections] = useState<BookingSelection>({})
  const [saving, setSaving] = useState(false)

  // Produkte finden
  const mittagessen = products.find((p) => p.name.toLowerCase().includes("mittagessen"))
  const broetchen = products.find((p) => p.name.toLowerCase().includes("brötchen"))
  const eier = products.find((p) => p.name.toLowerCase().includes("ei"))
  const kaffee = products.find((p) => p.name.toLowerCase().includes("kaffee"))

  const toggleCheckbox = (employeeId: string, productType: "mittagessen" | "kaffee") => {
    setSelections((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || { mittagessen: false, broetchen: 0, eier: 0, kaffee: false }),
        [productType]: !(prev[employeeId]?.[productType] || false),
      },
    }))
  }

  const updateQuantity = (employeeId: string, productType: "broetchen" | "eier", value: number) => {
    setSelections((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || { mittagessen: false, broetchen: 0, eier: 0, kaffee: false }),
        [productType]: Math.max(0, value),
      },
    }))
  }

  const handleSaveAll = async () => {
    setSaving(true)
    let transactionCount = 0

    for (const [employeeId, selection] of Object.entries(selections)) {
      const employee = employees.find((e) => e.id === employeeId)
      if (!employee) continue

      // Mittagessen buchen
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

      // Brötchen buchen
      if (selection.broetchen > 0 && broetchen) {
        await onAddTransaction({
          employeeId,
          employeeName: employee.name,
          productId: broetchen.id,
          productName: broetchen.name,
          price: broetchen.price * selection.broetchen,
          quantity: selection.broetchen,
          userId: employee.userId,
        })
        transactionCount++
      }

      // Eier buchen
      if (selection.eier > 0 && eier) {
        await onAddTransaction({
          employeeId,
          employeeName: employee.name,
          productId: eier.id,
          productName: eier.name,
          price: eier.price * selection.eier,
          quantity: selection.eier,
          userId: employee.userId,
        })
        transactionCount++
      }

      // Kaffee buchen
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

  const totalSelections = Object.values(selections).reduce((acc, sel) => {
    return acc + (sel.mittagessen ? 1 : 0) + sel.broetchen + sel.eier + (sel.kaffee ? 1 : 0)
  }, 0)

  const toggleSelection = (employeeId: string, productType: "mittagessen" | "broetchen" | "eier" | "kaffee") => {
    if (productType === "mittagessen" || productType === "kaffee") {
      toggleCheckbox(employeeId, productType)
    } else {
      updateQuantity(employeeId, productType, selections[employeeId]?.[productType] ? 0 : 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack} className="gap-2 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <Button onClick={handleSaveAll} disabled={totalSelections === 0 || saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Wird gespeichert..." : `Alle Buchen (${totalSelections})`}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Schnellbuchung</CardTitle>
            <CardDescription>Wählen Sie für jeden Mitarbeiter die Produkte aus, die gebucht werden sollen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b pb-2 font-semibold">
                <div>Mitarbeiter</div>
                <div className="text-center">Mittagessen</div>
                <div className="text-center">Brötchen</div>
                <div className="text-center">Eier</div>
                <div className="text-center">Kaffee</div>
              </div>

              {/* Mitarbeiter Liste */}
              {employees
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((employee) => (
                  <div key={employee.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b py-3 items-center">
                    <div className="font-medium">{employee.name}</div>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={selections[employee.id]?.mittagessen || false}
                        onCheckedChange={() => toggleCheckbox(employee.id, "mittagessen")}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Input
                        type="number"
                        min="0"
                        className="w-16 text-center"
                        value={selections[employee.id]?.broetchen || ""}
                        onChange={(e) => updateQuantity(employee.id, "broetchen", parseInt(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex justify-center">
                      <Input
                        type="number"
                        min="0"
                        className="w-16 text-center"
                        value={selections[employee.id]?.eier || ""}
                        onChange={(e) => updateQuantity(employee.id, "eier", parseInt(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex justify-center">
                      {employee.hideCoffee ? (
                        <span className="text-xs text-gray-400">Ausgeblendet</span>
                      ) : (
                        <Checkbox
                          checked={selections[employee.id]?.kaffee || false}
                          onCheckedChange={() => toggleCheckbox(employee.id, "kaffee")}
                        />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
