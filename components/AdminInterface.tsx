"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Users, Package, BarChart3, Mail, Download, Upload, Trash2, Edit, Plus } from "lucide-react"

type Employee = {
  id: string
  name: string
  balance: number
  group: "group1" | "group2" | "group3"
  hideCoffee?: boolean
  userId: string
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: "süßigkeiten" | "getränke" | "snacks" | "essen" | "sonstige"
  userId: string
}

interface Transaction {
  id: string
  employeeId: string
  employeeName: string
  productId: string
  productName: string
  price: number
  timestamp: Date
  category?: string
  userId: string
}

type AdminInterfaceProps = {
  employees: Employee[]
  products: Product[]
  transactions: Transaction[]
  onClose: () => void
  onUpdateEmployees: (employees: Employee[]) => void
  onUpdateProducts: (products: Product[]) => void
  onUpdateTransactions: (transactions: Transaction[]) => void
  userId: string
  userEmail: string
  groupNames: {
    group1: string
    group2: string
    group3: string
  }
  onUpdateGroupNames: (groupNames: { group1: string; group2: string; group3: string }) => void
}

export default function AdminInterface({
  employees,
  products,
  transactions,
  onClose,
  onUpdateEmployees,
  onUpdateProducts,
  onUpdateTransactions,
  userId,
  userEmail,
  groupNames,
  onUpdateGroupNames,
}: AdminInterfaceProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newEmployee, setNewEmployee] = useState({ name: "", group: "group1" as const })
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "essen" as "süßigkeiten" | "getränke" | "snacks" | "essen" | "sonstige",
    stock: 0,
  })
  const [testEmailStatus, setTestEmailStatus] = useState<string>("")
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [editingGroupNames, setEditingGroupNames] = useState(groupNames)

  const totalDebt = employees.reduce((sum, emp) => sum + emp.balance, 0)
  const totalTransactions = transactions.length
  const lowStockProducts = products.filter((p) => p.stock < 5).length

  const sortEmployeesByGroup = (employees: Employee[]) => {
    const groupOrder = { group1: 1, group2: 2, group3: 3 }

    return employees.sort((a, b) => {
      const groupComparison = groupOrder[a.group] - groupOrder[b.group]
      if (groupComparison !== 0) {
        return groupComparison
      }
      return a.name.localeCompare(b.name)
    })
  }

  const addEmployee = () => {
    if (!newEmployee.name.trim()) return

    const employee: Employee = {
      id: Date.now().toString(),
      name: newEmployee.name.trim(),
      balance: 0,
      group: newEmployee.group,
      hideCoffee: false,
      userId: userId,
    }

    const updatedEmployees = sortEmployeesByGroup([...employees, employee])
    onUpdateEmployees(updatedEmployees)
    setNewEmployee({ name: "", group: "group1" })
  }

  const removeEmployee = (id: string) => {
    if (confirm("Mitarbeiter wirklich löschen?")) {
      onUpdateEmployees(employees.filter((emp) => emp.id !== id))
    }
  }

  const updateEmployee = (updatedEmployee: Employee) => {
    onUpdateEmployees(employees.map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp)))
    setEditingEmployee(null)
  }

  const clearEmployeeBalance = (id: string) => {
    const employee = employees.find((emp) => emp.id === id)
    if (!employee) return

    const employeeTransactions = transactions.filter((t) => t.employeeId === id)
    const currentDebt = employeeTransactions.reduce((sum, transaction) => sum + transaction.price, 0)

    if (confirm(`Bezahlung für ${employee.name} verbuchen? Aktueller Schuldenstand: €${currentDebt.toFixed(2)}`)) {
      if (currentDebt > 0) {
        const paymentTransaction: Transaction = {
          id: Date.now().toString(),
          employeeId: id,
          employeeName: employee.name,
          productId: "payment",
          productName: "Bezahlung",
          price: -currentDebt, // Use calculated debt instead of stored balance
          timestamp: new Date(),
          category: "payment",
          userId: userId,
        }

        // Add payment transaction to history
        const updatedTransactions = [...transactions, paymentTransaction]

        // Update transactions
        onUpdateTransactions(updatedTransactions)
      }
    }
  }

  const addProduct = () => {
    if (!newProduct.name.trim() || !newProduct.price) return

    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name.trim(),
      price: Number.parseFloat(newProduct.price) || 0,
      stock: newProduct.stock || 0,
      category: newProduct.category,
      userId: userId,
    }

    onUpdateProducts([...products, product])
    setNewProduct({ name: "", price: "", category: "essen", stock: 0 })
  }

  const removeProduct = (id: string) => {
    if (confirm("Produkt wirklich löschen?")) {
      onUpdateProducts(products.filter((prod) => prod.id !== id))
    }
  }

  const updateProduct = (updatedProduct: Product) => {
    onUpdateProducts(products.map((prod) => (prod.id === updatedProduct.id ? updatedProduct : prod)))
    setEditingProduct(null)
  }

  const sendManualDebtReport = async () => {
    try {
      const response = await fetch("/api/send-debt-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
        }),
      })

      if (response.ok) {
        alert("E-Mail erfolgreich versendet!")
      } else {
        const error = await response.text()
        alert(`Fehler beim E-Mail-Versand: ${error}`)
      }
    } catch (error) {
      alert(`Fehler: ${error}`)
    }
  }

  const testEmailSystem = async () => {
    setTestEmailLoading(true)
    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
        }),
      })

      const result = await response.json()
      if (response.ok) {
        setTestEmailStatus(`Test erfolgreich: ${result.message}`)
      } else {
        setTestEmailStatus(`Test-Fehler: ${result.error}`)
      }
    } catch (error) {
      setTestEmailStatus(`Test-Fehler: ${error}`)
    } finally {
      setTestEmailLoading(false)
    }
  }

  const downloadCSVBackup = async () => {
    try {
      const response = await fetch("/api/export-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employees,
          transactions,
          products,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `kantine-daten-${userEmail}-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        alert("CSV-Backup erfolgreich heruntergeladen!")
      } else {
        alert("Fehler beim CSV-Export")
      }
    } catch (error) {
      alert(`CSV-Export-Fehler: ${error}`)
    }
  }

  const exportData = () => {
    const data = {
      employees,
      products,
      transactions,
      exportDate: new Date().toISOString(),
    }

    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `kantine-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target?.result as string
      const data = JSON.parse(content)

      onUpdateEmployees(data.employees)
      onUpdateProducts(data.products)
      onUpdateTransactions(data.transactions)
    }
    reader.readAsText(file)
  }

  const saveGroupNames = () => {
    onUpdateGroupNames(editingGroupNames)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={onClose} variant="outline" size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Admin-Dashboard</h1>
          <div className="w-32" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="employees">Mitarbeiter</TabsTrigger>
            <TabsTrigger value="products">Produkte</TabsTrigger>
            <TabsTrigger value="transactions">Transaktionen</TabsTrigger>
            <TabsTrigger value="settings">Einstellungen</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gesamtschulden</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">€{totalDebt.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{employees.length} Mitarbeiter</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transaktionen</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTransactions}</div>
                  <p className="text-xs text-muted-foreground">Gesamt</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Niedrige Bestände</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{lowStockProducts}</div>
                  <p className="text-xs text-muted-foreground">unter 5 Stück</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  E-Mail & Backup-System
                </CardTitle>
                <CardDescription>Automatische E-Mail-Reports und CSV-Backups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button onClick={testEmailSystem} variant="outline" className="w-full bg-transparent">
                    Test E-Mail senden
                  </Button>
                  <Button onClick={sendManualDebtReport} className="w-full">
                    Schulden-Report senden
                  </Button>
                  <Button onClick={downloadCSVBackup} variant="outline" className="w-full bg-transparent">
                    CSV-Backup herunterladen
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatische E-Mails und CSV-Backups werden täglich um 8:00 Uhr versendet.
                </p>
                {testEmailStatus && (
                  <div className="text-sm text-red-600">
                    {testEmailStatus}
                    {testEmailLoading && " (wird getestet...)"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Neuer Mitarbeiter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Input
                    placeholder="Name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  />
                  <select
                    value={newEmployee.group}
                    onChange={(e) => setNewEmployee({ ...newEmployee, group: e.target.value as Employee["group"] })}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="group1">{groupNames.group1}</option>
                    <option value="group2">{groupNames.group2}</option>
                    <option value="group3">{groupNames.group3}</option>
                  </select>
                  <Button onClick={addEmployee}>Hinzufügen</Button>
                </div>
              </CardContent>
            </Card>

            {["group1", "group2", "group3"].map((groupKey) => {
              const groupEmployees = employees.filter((e) => e.group === groupKey)
              if (groupEmployees.length === 0) return null

              const displayName = groupNames[groupKey as keyof typeof groupNames]

              return (
                <Card key={groupKey}>
                  <CardHeader>
                    <CardTitle>{displayName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {groupEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border"
                        >
                          {editingEmployee?.id === employee.id ? (
                            <Input
                              value={editingEmployee.name}
                              onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                            />
                          ) : (
                            employee.name
                          )}
                          {editingEmployee?.id === employee.id ? (
                            <select
                              value={editingEmployee.group}
                              onChange={(e) =>
                                setEditingEmployee({ ...editingEmployee, group: e.target.value as Employee["group"] })
                              }
                              className="px-3 py-2 border rounded-md"
                            >
                              <option value="group1">{groupNames.group1}</option>
                              <option value="group2">{groupNames.group2}</option>
                              <option value="group3">{groupNames.group3}</option>
                            </select>
                          ) : (
                            groupNames[employee.group as keyof typeof groupNames]
                          )}
                          {editingEmployee?.id === employee.id ? (
                            <Input
                              type="number"
                              value={editingEmployee.balance || ""}
                              onChange={(e) =>
                                setEditingEmployee({
                                  ...editingEmployee,
                                  balance: Number.parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          ) : (
                            <Badge variant={employee.balance > 0 ? "destructive" : "secondary"}>
                              €{employee.balance.toFixed(2)}
                            </Badge>
                          )}
                          {editingEmployee?.id === employee.id ? (
                            <Checkbox
                              checked={editingEmployee.hideCoffee || false}
                              onCheckedChange={(checked) =>
                                setEditingEmployee({ ...editingEmployee, hideCoffee: checked as boolean })
                              }
                            />
                          ) : (
                            <Checkbox
                              checked={employee.hideCoffee || false}
                              onCheckedChange={(checked) => {
                                const updatedEmployee = { ...employee, hideCoffee: checked as boolean }
                                updateEmployee(updatedEmployee)
                              }}
                            />
                          )}
                          {editingEmployee?.id === employee.id ? (
                            <>
                              <Button size="sm" onClick={() => updateEmployee(editingEmployee)}>
                                Speichern
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingEmployee(null)}>
                                Abbrechen
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditingEmployee(employee)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => clearEmployeeBalance(employee.id)}>
                                Bezahlung verbuchen
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => removeEmployee(employee.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Neues Produkt hinzufügen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Produktname"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Preis"
                    value={newProduct.price || ""}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Bestand"
                    value={newProduct.stock || ""}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number.parseInt(e.target.value) || 0 })}
                  />
                  <Select
                    value={newProduct.category}
                    onValueChange={(value: "süßigkeiten" | "getränke" | "snacks" | "essen" | "sonstige") =>
                      setNewProduct({ ...newProduct, category: value })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="essen">Essen</SelectItem>
                      <SelectItem value="getränke">Getränke</SelectItem>
                      <SelectItem value="süßigkeiten">Süßigkeiten</SelectItem>
                      <SelectItem value="snacks">Snacks</SelectItem>
                      <SelectItem value="sonstige">Sonstige</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addProduct}>
                    <Plus className="h-4 w-4 mr-2" />
                    Hinzufügen
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produkte verwalten</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Preis</TableHead>
                      <TableHead>Bestand</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {editingProduct?.id === product.id ? (
                            <Input
                              value={editingProduct.name}
                              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                            />
                          ) : (
                            product.name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProduct?.id === product.id ? (
                            <Select
                              value={editingProduct.category}
                              onValueChange={(value: "süßigkeiten" | "getränke" | "snacks" | "essen" | "sonstige") =>
                                setEditingProduct({ ...editingProduct, category: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="essen">Essen</SelectItem>
                                <SelectItem value="getränke">Getränke</SelectItem>
                                <SelectItem value="süßigkeiten">Süßigkeiten</SelectItem>
                                <SelectItem value="snacks">Snacks</SelectItem>
                                <SelectItem value="sonstige">Sonstige</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            product.category
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProduct?.id === product.id ? (
                            <Input
                              type="number"
                              value={editingProduct.price}
                              onChange={(e) =>
                                setEditingProduct({ ...editingProduct, price: Number.parseFloat(e.target.value) || 0 })
                              }
                            />
                          ) : (
                            `€${product.price.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell>
                          {editingProduct?.id === product.id ? (
                            <Input
                              type="number"
                              value={editingProduct.stock}
                              onChange={(e) =>
                                setEditingProduct({ ...editingProduct, stock: Number.parseInt(e.target.value) || 0 })
                              }
                            />
                          ) : (
                            <Badge variant={product.stock < 5 ? "destructive" : "secondary"}>{product.stock}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingProduct?.id === product.id ? (
                              <>
                                <Button size="sm" onClick={() => updateProduct(editingProduct)}>
                                  Speichern
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingProduct(null)}>
                                  Abbrechen
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setEditingProduct(product)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => removeProduct(product.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaktionshistorie</CardTitle>
                <CardDescription>Alle Käufe und manuellen Einträge</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Betrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 100)
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{new Date(transaction.timestamp).toLocaleDateString("de-DE")}</TableCell>
                          <TableCell>{transaction.employeeName}</TableCell>
                          <TableCell>{transaction.productName}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.price > 0 ? "destructive" : "secondary"}>
                              €{transaction.price.toFixed(2)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Daten exportieren
                </CardTitle>
                <CardDescription>Backup der gesamten Kantine-Daten</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={exportData} variant="outline" className="w-full bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    JSON-Backup herunterladen
                  </Button>
                  <Button onClick={downloadCSVBackup} variant="outline" className="w-full bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    CSV-Export herunterladen
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Daten importieren
                </CardTitle>
                <CardDescription>Backup-Datei wiederherstellen</CardDescription>
              </CardHeader>
              <CardContent>
                <Input type="file" accept=".json" onChange={importData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Gruppennamen anpassen
                </CardTitle>
                <CardDescription>Benennen Sie die Mitarbeitergruppen nach Ihren Wünschen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Gruppe 1</label>
                    <Input
                      value={editingGroupNames.group1}
                      onChange={(e) => setEditingGroupNames({ ...editingGroupNames, group1: e.target.value })}
                      placeholder="z.B. 4te Tour"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Gruppe 2</label>
                    <Input
                      value={editingGroupNames.group2}
                      onChange={(e) => setEditingGroupNames({ ...editingGroupNames, group2: e.target.value })}
                      placeholder="z.B. 2Tour"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Gruppe 3</label>
                    <Input
                      value={editingGroupNames.group3}
                      onChange={(e) => setEditingGroupNames({ ...editingGroupNames, group3: e.target.value })}
                      placeholder="z.B. Gäste"
                    />
                  </div>
                </div>
                <Button onClick={saveGroupNames} className="w-full">
                  Gruppennamen speichern
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
