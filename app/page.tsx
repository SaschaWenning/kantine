"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingCart, BarChart3, Settings, Trash2, Plus, History, ArrowLeft, Package } from "lucide-react"

export interface Employee {
  id: string
  name: string
  balance: number
  group: "4te Tour" | "2Tour" | "Gäste"
}

export interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: "süßigkeiten" | "getränke" | "snacks" | "essen"
}

export interface Transaction {
  id: string
  employeeId: string
  employeeName: string
  productId: string
  productName: string
  price: number
  timestamp: Date
  category?: string
}

const STORAGE_KEYS = {
  employees: "kantine_employees",
  products: "kantine_products",
  transactions: "kantine_transactions",
}

export const storage = {
  getEmployees: (): Employee[] => {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(STORAGE_KEYS.employees)
    return data ? JSON.parse(data) : []
  },

  setEmployees: (employees: Employee[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(employees))
  },

  getProducts: (): Product[] => {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(STORAGE_KEYS.products)
    return data
      ? JSON.parse(data)
      : [
          { id: "1", name: "Mittagessen", price: 6.0, stock: 10, category: "essen" },
          { id: "2", name: "Brötchen", price: 1.0, stock: 20, category: "essen" },
          { id: "3", name: "Kaffee", price: 1.5, stock: 25, category: "getränke" },
          { id: "4", name: "Ei", price: 0.3, stock: 30, category: "essen" },
          { id: "5", name: "1 Weingummi", price: 0.1, stock: 100, category: "süßigkeiten" },
          { id: "6", name: "Kinderriegel/Duplo", price: 0.3, stock: 25, category: "süßigkeiten" },
          { id: "7", name: "Wasser", price: 0.6, stock: 40, category: "getränke" },
          { id: "8", name: "Eis", price: 0.8, stock: 15, category: "süßigkeiten" },
          { id: "9", name: "Cola/Fanta/Iso/Apfelschorle", price: 1.5, stock: 30, category: "getränke" },
          { id: "10", name: "Erdnüsse", price: 1.5, stock: 20, category: "snacks" },
          { id: "11", name: "Mars/Snickers/Kitkat", price: 0.8, stock: 25, category: "süßigkeiten" },
        ]
  },

  setProducts: (products: Product[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products))
  },

  getTransactions: (): Transaction[] => {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(STORAGE_KEYS.transactions)
    if (!data) return []
    const transactions = JSON.parse(data)
    return transactions.map((t: any) => ({
      ...t,
      timestamp: new Date(t.timestamp),
    }))
  },

  setTransactions: (transactions: Transaction[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions))
  },
}

export default function KantineApp() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [showAdmin, setShowAdmin] = useState(false)

  const calculateEmployeeBalances = (employees: Employee[], transactions: Transaction[]): Employee[] => {
    return employees.map((employee) => {
      const employeeTransactions = transactions.filter((t) => t.employeeId === employee.id)
      const balance = employeeTransactions.reduce((sum, transaction) => sum + transaction.price, 0)
      return { ...employee, balance }
    })
  }

  useEffect(() => {
    const loadedEmployees = storage.getEmployees()
    const loadedProducts = storage.getProducts()
    const loadedTransactions = storage.getTransactions()

    const employeesWithCalculatedBalances = calculateEmployeeBalances(loadedEmployees, loadedTransactions)

    setEmployees(employeesWithCalculatedBalances)
    setProducts(loadedProducts)
    setTransactions(loadedTransactions)
  }, [])

  const [currentView, setCurrentView] = useState<"home" | "employee" | "admin">("home")
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [importData, setImportData] = useState<(event: React.ChangeEvent<HTMLInputElement>) => void>(() => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (data.employees && data.products && data.transactions) {
            setEmployees(data.employees)
            setProducts(data.products)
            setTransactions(data.transactions)
            alert("Daten erfolgreich importiert!")
          } else {
            alert("Ungültiges Backup-Format!")
          }
        } catch (error) {
          alert("Fehler beim Importieren der Daten!")
        }
      }
      reader.readAsText(file)
    }
  })

  const updateEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees)
    storage.setEmployees(newEmployees)
  }

  const updateProducts = (newProducts: Product[]) => {
    setProducts(newProducts)
    storage.setProducts(newProducts)
  }

  useEffect(() => {
    if (employees.length === 0) {
      const defaultEmployees: Employee[] = [
        // 4te Tour (alphabetically sorted)
        { id: "1", name: "Barth", balance: 0, group: "4te Tour" },
        { id: "2", name: "Braun", balance: 0, group: "4te Tour" },
        { id: "3", name: "Decka", balance: 0, group: "4te Tour" },
        { id: "4", name: "Ehrenfried", balance: 0, group: "4te Tour" },
        { id: "5", name: "Hamplewski", balance: 0, group: "4te Tour" },
        { id: "6", name: "Karney", balance: 0, group: "4te Tour" },
        { id: "7", name: "Kehnen", balance: 0, group: "4te Tour" },
        { id: "8", name: "Lindemann", balance: 0, group: "4te Tour" },
        { id: "9", name: "Lipka", balance: 0, group: "4te Tour" },
        { id: "10", name: "Manders", balance: 0, group: "4te Tour" },
        { id: "11", name: "Minta", balance: 0, group: "4te Tour" },
        { id: "12", name: "Pahlmeyer", balance: 0, group: "4te Tour" },
        { id: "13", name: "Paul", balance: 0, group: "4te Tour" },
        { id: "14", name: "Rautenberg", balance: 0, group: "4te Tour" },
        { id: "15", name: "Roßmöller", balance: 0, group: "4te Tour" },
        { id: "16", name: "Schmatz", balance: 0, group: "4te Tour" },
        { id: "17", name: "Spelleken", balance: 0, group: "4te Tour" },
        { id: "18", name: "Sperlich", balance: 0, group: "4te Tour" },
        { id: "19", name: "Szymkowiak", balance: 0, group: "4te Tour" },
        { id: "20", name: "Wenning", balance: 0, group: "4te Tour" },
        { id: "21", name: "Zinser", balance: 0, group: "4te Tour" },

        // 2Tour (alphabetically sorted)
        { id: "22", name: "Boegner", balance: 0, group: "2Tour" },
        { id: "23", name: "Casaccia", balance: 0, group: "2Tour" },
        { id: "24", name: "Frisson", balance: 0, group: "2Tour" },
        { id: "25", name: "Füllgraf", balance: 0, group: "2Tour" },
        { id: "26", name: "Geue", balance: 0, group: "2Tour" },
        { id: "27", name: "Groh", balance: 0, group: "2Tour" },
        { id: "28", name: "Grüneis", balance: 0, group: "2Tour" },
        { id: "29", name: "Honermann", balance: 0, group: "2Tour" },
        { id: "30", name: "Kahlert", balance: 0, group: "2Tour" },
        { id: "31", name: "Käufer", balance: 0, group: "2Tour" },
        { id: "32", name: "Knott", balance: 0, group: "2Tour" },
        { id: "33", name: "Kohl", balance: 0, group: "2Tour" },
        { id: "34", name: "Ludewig", balance: 0, group: "2Tour" },
        { id: "35", name: "Röthel", balance: 0, group: "2Tour" },
        { id: "36", name: "Schmitz", balance: 0, group: "2Tour" },
        { id: "37", name: "Tataro", balance: 0, group: "2Tour" },
        { id: "38", name: "Wortelkamp", balance: 0, group: "2Tour" },

        // Gäste (alphabetically sorted)
        { id: "39", name: "Bieling", balance: 0, group: "Gäste" },
        { id: "40", name: "Omraie", balance: 0, group: "Gäste" },
      ]
      setEmployees(defaultEmployees)
      storage.setEmployees(defaultEmployees)
    }
  }, [employees.length])

  useEffect(() => {
    const autoBackup = () => {
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
      link.download = `kantine-auto-backup-${new Date().toISOString().split("T")[0]}-${new Date().getHours()}-${new Date().getMinutes()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    const interval = setInterval(autoBackup, 8 * 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [employees, products, transactions])

  useEffect(() => {
    const checkDailyReset = () => {
      const now = new Date()
      const today = now.toDateString()
      const hour = now.getHours()

      // Prüfe ob es 8 Uhr oder später ist und ob heute noch nicht zurückgesetzt wurde
      const lastResetDate = localStorage.getItem("lastStatsReset")

      if (hour >= 8 && lastResetDate !== today) {
        // Filtere alle Transaktionen von heute heraus (nur Mittagessen, Brötchen, Kaffee)
        const updatedTransactions = transactions.filter((transaction) => {
          const transactionDate = new Date(transaction.timestamp).toDateString()
          const isToday = transactionDate === today
          const isTargetProduct = ["Mittagessen", "Brötchen", "Kaffee"].includes(transaction.productName)

          // Behalte Transaktionen, die NICHT heute UND NICHT die Zielprodukte sind
          return !(isToday && isTargetProduct)
        })

        // Speichere die gefilterten Transaktionen
        localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(updatedTransactions))
        localStorage.setItem("lastStatsReset", today)

        // Aktualisiere den State
        setTransactions(updatedTransactions)

        console.log("[v0] Tägliche Statistiken um 8 Uhr zurückgesetzt")
      }
    }

    // Prüfe sofort beim Laden
    checkDailyReset()

    // Prüfe alle 30 Minuten
    const interval = setInterval(checkDailyReset, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [transactions])

  const totalDebt = employees.reduce((sum, emp) => sum + emp.balance, 0)
  const totalTransactions = transactions.length
  const lowStockProducts = products.filter((p) => p.stock < 5).length

  const handleAdminLogin = () => {
    const ADMIN_PASSWORD = "kantinewache4"
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true)
      setAdminPassword("")
    } else {
      alert("Falsches Passwort!")
      setAdminPassword("")
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

  if (currentView === "employee") {
    const employee = employees.find((emp) => emp.id === selectedEmployee)
    if (!employee) return <div>No employee selected</div>

    return (
      <EmployeeInterface
        employee={employee}
        products={products}
        onBack={() => setCurrentView("home")}
        onTransaction={(transaction) => {
          const newTransactions = [...transactions, transaction]
          setTransactions(newTransactions)
          storage.setTransactions(newTransactions)

          // Mitarbeiter-Schulden aktualisieren
          const updatedEmployees = employees.map((emp) =>
            emp.id === transaction.employeeId ? { ...emp, balance: emp.balance + transaction.price } : emp,
          )
          setEmployees(updatedEmployees)
          storage.setEmployees(updatedEmployees)

          // Bestand reduzieren
          const updatedProducts = products.map((prod) =>
            prod.id === transaction.productId ? { ...prod, stock: prod.stock - transaction.price / prod.price } : prod,
          )
          setProducts(updatedProducts)
          storage.setProducts(updatedProducts)
        }}
      />
    )
  }

  if (currentView === "admin") {
    if (!isAdminAuthenticated) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Admin-Anmeldung</CardTitle>
              <CardDescription>Bitte geben Sie das Admin-Passwort ein</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Passwort"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
              />
              <div className="flex gap-2">
                <Button onClick={handleAdminLogin} className="flex-1">
                  Anmelden
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentView("home")
                    setAdminPassword("")
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <AdminInterface
        employees={employees}
        products={products}
        transactions={transactions}
        onBack={() => {
          setCurrentView("home")
          setIsAdminAuthenticated(false)
        }}
        onUpdateEmployees={updateEmployees}
        onUpdateProducts={updateProducts}
        importData={importData}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Kantine Wache 4 2/4 Tour</h1>
          <p className="text-lg text-gray-600">Zentrale Verwaltung für Süßigkeiten, Getränke & Snacks</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Gesamtschulden</CardTitle>
              <BarChart3 className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-red-600">€{totalDebt.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{employees.length} Mitarbeiter</p>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Transaktionen</CardTitle>
              <ShoppingCart className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                heute:{" "}
                {transactions.filter((t) => new Date(t.timestamp).toDateString() === new Date().toDateString()).length}
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Niedrige Bestände</CardTitle>
              <Settings className="h-3 w-3 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-orange-600">{lowStockProducts}</div>
              <p className="text-xs text-muted-foreground">unter 5 Stück</p>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Mittagessen</CardTitle>
              <span className="text-lg">🍽️</span>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-blue-600">
                {transactions.filter((t) => t.productName === "Mittagessen").length}
              </div>
              <p className="text-xs text-muted-foreground">heute gebucht</p>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Brötchen</CardTitle>
              <span className="text-lg">🥨</span>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-green-600">
                {transactions.filter((t) => t.productName === "Brötchen").length}
              </div>
              <p className="text-xs text-muted-foreground">heute gebucht</p>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Kaffee</CardTitle>
              <span className="text-lg">☕</span>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-amber-600">
                {transactions.filter((t) => t.productName === "Kaffee").length}
              </div>
              <p className="text-xs text-muted-foreground">heute gebucht</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 mb-8">
          {["4te Tour", "2Tour", "Gäste"].map((group) => {
            const groupEmployees = employees.filter((emp) => emp.group === group)
            return (
              <Card key={group}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{group}</CardTitle>
                      <CardDescription>Klicken Sie auf einen Namen um Produkte einzutragen</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const name = prompt(`Neuen Mitarbeiter zu ${group} hinzufügen:`)
                        if (name && name.trim()) {
                          const newEmployee = {
                            id: Date.now().toString(),
                            name: name.trim(),
                            balance: 0,
                            group: group,
                          }
                          setEmployees([...employees, newEmployee])
                          storage.setEmployees([...employees, newEmployee])
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      + Neuer Mitarbeiter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {groupEmployees.map((employee) => (
                      <Button
                        key={employee.id}
                        variant="outline"
                        className="flex items-center justify-between p-4 h-auto hover:bg-blue-50 bg-transparent"
                        onClick={() => {
                          setSelectedEmployee(employee.id)
                          setCurrentView("employee")
                        }}
                      >
                        <span className="font-medium">{employee.name}</span>
                        <Badge variant={employee.balance > 0 ? "destructive" : "secondary"}>
                          €{employee.balance.toFixed(2)}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCurrentView("admin")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              Administrator-Bereich
            </CardTitle>
            <CardDescription>Verwaltung, Bestände und Abrechnungen</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-transparent" variant="outline" size="lg">
              Admin-Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>

      {isAdminAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Aktion bestätigen</CardTitle>
              <CardDescription>Bitte geben Sie das Admin-Passwort ein</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Passwort"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
              />
              <div className="flex gap-2">
                <Button onClick={handleAdminLogin} className="flex-1">
                  Bestätigen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdminAuthenticated(false)
                    setAdminPassword("")
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function EmployeeInterface({
  employee,
  products,
  onBack,
  onTransaction,
}: {
  employee: Employee
  products: Product[]
  onBack: () => void
  onTransaction: (transaction: Transaction) => void
}) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [employeeTransactions, setEmployeeTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const allTransactions = storage.getTransactions()
    const employeeHistory = allTransactions
      .filter((t) => t.employeeId === employee.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100)
    setEmployeeTransactions(employeeHistory)
  }, [employee.id])

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
    setSelectedQuantity(1)
    setShowConfirmation(true)
  }

  const handleConfirmedTransaction = () => {
    if (!selectedProduct) return

    const transaction: Transaction = {
      id: Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      price: selectedProduct.price * selectedQuantity,
      timestamp: new Date(),
    }

    onTransaction(transaction)
    setShowConfirmation(false)
    setSelectedProduct(null)
    setSelectedQuantity(1)

    setTimeout(() => {
      onBack()
    }, 10000)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "süßigkeiten":
        return "🍬"
      case "getränke":
        return "🥤"
      case "snacks":
        return "🥨"
      case "essen":
        return "🍽️"
      default:
        return "🛒"
    }
  }

  const groupedProducts = products.reduce(
    (acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = []
      }
      acc[product.category].push(product)
      return acc
    },
    {} as Record<string, Product[]>,
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={onBack} variant="outline" size="lg">
            ← Zurück zur Übersicht
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Kantine Tablet</h1>
          <div className="w-32" />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Mitarbeiter ausgewählt
            </CardTitle>
            <CardDescription>
              Eingeloggt als: <strong>{employee.name}</strong> (Aktueller Stand: €{employee.balance.toFixed(2)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categoryProducts.map((product) => (
                      <Button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300 transition-colors"
                      >
                        <span className="text-3xl">{getCategoryIcon(product.category)}</span>
                        <div className="text-center">
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-lg font-bold text-green-600">€{product.price.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">Bestand: {product.stock}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Meine letzten Eintragungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {employeeTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <div className="font-medium">{transaction.productName}</div>
                      <div className="text-gray-500">
                        {new Date(transaction.timestamp).toLocaleDateString("de-DE")} um{" "}
                        {new Date(transaction.timestamp).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <Badge variant={transaction.price < 0 ? "default" : "secondary"}>
                    {transaction.price < 0 ? "+" : ""}€{Math.abs(transaction.price).toFixed(2)}
                  </Badge>
                </div>
              ))}
              {employeeTransactions.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-500">Noch keine Eintragungen vorhanden.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {showConfirmation && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Bestätigung</CardTitle>
              <CardDescription>Möchten Sie dieses Produkt wirklich hinzufügen?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{getCategoryIcon(selectedProduct.category)}</div>
                <h3 className="text-xl font-semibold">{selectedProduct.name}</h3>
                <p className="text-lg text-gray-600">€{selectedProduct.price.toFixed(2)} pro Stück</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Anzahl:</label>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setSelectedQuantity(selectedQuantity - 1)}>
                    -
                  </Button>
                  <span className="text-xl font-bold w-12 text-center">{selectedQuantity}</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedQuantity(selectedQuantity + 1)}>
                    +
                  </Button>
                </div>
                <div className="text-center mt-2">
                  {selectedQuantity < 0 && <p className="text-sm text-red-600 mb-1">⚠️ Stornierung/Korrektur</p>}
                  <p className={`text-lg font-bold ${selectedQuantity >= 0 ? "text-green-600" : "text-red-600"}`}>
                    Gesamt: €{(selectedProduct.price * selectedQuantity).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                  Abbrechen
                </Button>
                <Button onClick={handleConfirmedTransaction} className="flex-1">
                  Bestätigen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function AdminInterface({
  employees,
  products,
  transactions,
  onBack,
  onUpdateEmployees,
  onUpdateProducts,
  importData,
}: {
  employees: Employee[]
  products: Product[]
  transactions: Transaction[]
  onBack: () => void
  onUpdateEmployees: (employees: Employee[]) => void
  onUpdateProducts: (products: Product[]) => void
  importData: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [activeTab, setActiveTab] = useState("overview")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState({ name: "", price: 0, stock: 0, category: "getränke" as const })
  const [newEmployee, setNewEmployee] = useState({ name: "", group: "4te Tour" as const })

  const markEmployeePaid = (employeeId: string) => {
    const employee = employees.find((emp) => emp.id === employeeId)
    if (!employee) return

    // Erstelle eine "Bezahlt"-Transaktion für die Historie
    const paymentTransaction: Transaction = {
      id: Date.now().toString(),
      employeeId: employeeId,
      employeeName: employee.name,
      productId: "payment",
      productName: `Zahlung erhalten (€${employee.balance.toFixed(2)})`,
      price: -employee.balance, // Negativer Betrag für Zahlung
      timestamp: new Date(),
      category: "payment",
    }

    const newTransactions = [...transactions, paymentTransaction]
    storage.setTransactions(newTransactions)

    // Schulden auf 0 setzen
    const updatedEmployees = employees.map((emp) => (emp.id === employeeId ? { ...emp, balance: 0 } : emp))
    onUpdateEmployees(updatedEmployees)
  }

  const updateProductStock = (productId: string, newStock: number) => {
    const updatedProducts = products.map((prod) => (prod.id === productId ? { ...prod, stock: newStock } : prod))
    onUpdateProducts(updatedProducts)
  }

  const addProduct = () => {
    if (!newProduct.name.trim() || newProduct.price <= 0) return

    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name.trim(),
      price: newProduct.price,
      stock: newProduct.stock,
      category: newProduct.category,
    }

    const updatedProducts = [...products, product]
    onUpdateProducts(updatedProducts)
    setNewProduct({ name: "", price: 0, stock: 0, category: "getränke" })
  }

  const updateProduct = () => {
    if (!editingProduct) return

    const updatedProducts = products.map((prod) => (prod.id === editingProduct.id ? editingProduct : prod))
    onUpdateProducts(updatedProducts)
    setEditingProduct(null)
  }

  const deleteProduct = (productId: string) => {
    const updatedProducts = products.filter((prod) => prod.id !== productId)
    onUpdateProducts(updatedProducts)
  }

  const addEmployee = () => {
    if (!newEmployee.name.trim()) return

    const employee: Employee = {
      id: Date.now().toString(),
      name: newEmployee.name.trim(),
      balance: 0,
      group: newEmployee.group,
    }

    const updatedEmployees = [...employees, employee]
    onUpdateEmployees(updatedEmployees)
    setNewEmployee({ name: "", group: "4te Tour" })
  }

  const removeEmployee = (employeeId: string) => {
    const updatedEmployees = employees.filter((emp) => emp.id !== employeeId)
    onUpdateEmployees(updatedEmployees)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Administrator-Dashboard</h1>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </div>

        <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1">
          {[
            { id: "overview", label: "Übersicht" },
            { id: "employees", label: "Mitarbeiter" },
            { id: "products", label: "Produkte" },
            { id: "transactions", label: "Transaktionen" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gesamtschulden</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    €{employees.reduce((sum, emp) => sum + emp.balance, 0).toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-600">von {employees.length} Mitarbeitern</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Heute</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    €
                    {transactions
                      .filter((t) => new Date(t.timestamp).toDateString() === new Date().toDateString())
                      .reduce((sum, t) => sum + t.price, 0)
                      .toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-600">
                    {
                      transactions.filter((t) => new Date(t.timestamp).toDateString() === new Date().toDateString())
                        .length
                    }{" "}
                    Transaktionen
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Niedrige Bestände</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{products.filter((p) => p.stock < 5).length}</div>
                  <p className="text-sm text-gray-600">Produkte unter 5 Stück</p>
                </CardContent>
              </Card>
            </div>

            {/* Datensicherungs-Bereich */}
            <Card>
              <CardHeader>
                <CardTitle>Datensicherung</CardTitle>
                <CardDescription>Automatische Backups alle 8 Stunden. Manuelle Sicherung auch möglich.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
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
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Manuelles Backup
                  </Button>
                  <div>
                    <input type="file" accept=".json" id="import-file" className="hidden" onChange={importData} />
                    <Button variant="outline" onClick={() => document.getElementById("import-file")?.click()}>
                      Daten importieren
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-green-600">✓ Automatische Backups sind aktiviert (alle 8 Stunden)</p>
              </CardContent>
            </Card>

            {/* Aktuelle Schulden Übersicht */}
            <Card>
              <CardHeader>
                <CardTitle>Aktuelle Schulden</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employees
                    .filter((emp) => emp.balance > 0)
                    .sort((a, b) => b.balance - a.balance)
                    .map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <span className="font-medium">{employee.name}</span>
                          <Badge className="ml-2" variant="secondary">
                            {employee.group}
                          </Badge>
                        </div>
                        <div className="flex gap-3">
                          <Badge variant="destructive" className="text-lg">
                            €{employee.balance.toFixed(2)}
                          </Badge>
                          {/* Als bezahlt markieren */}
                          <Button
                            size="sm"
                            onClick={() => markEmployeePaid(employee.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Als bezahlt markieren
                          </Button>
                        </div>
                      </div>
                    ))}
                  {employees.filter((emp) => emp.balance > 0).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Keine offenen Schulden vorhanden.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "employees" && (
          <div className="space-y-6">
            {["4te Tour", "2Tour", "Gäste"].map((group) => {
              const groupEmployees = employees.filter((emp) => emp.group === group)
              return (
                <Card key={group}>
                  <CardHeader>
                    <CardTitle>
                      {group} ({groupEmployees.length} Mitarbeiter)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {groupEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{employee.name}</span>
                            <Badge className="ml-2" variant={employee.balance > 0 ? "destructive" : "secondary"}>
                              €{employee.balance.toFixed(2)}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            {/* Als bezahlt markieren */}
                            <Button size="sm" variant="outline" onClick={() => markEmployeePaid(employee.id)}>
                              Als bezahlt markieren
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const name = prompt(`Mitarbeiter ${employee.name} entfernen:`)
                                if (name && name.trim() === employee.name) {
                                  removeEmployee(employee.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {activeTab === "products" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Neues Produkt hinzufügen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Input
                    placeholder="Produktname"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Preis (€)"
                    step="0.01"
                    value={newProduct.price || ""}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number.parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    type="number"
                    placeholder="Bestand"
                    value={newProduct.stock || ""}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number.parseInt(e.target.value) || 0 })}
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as any })}
                  >
                    <option value="getränke">Getränke</option>
                    <option value="süßigkeiten">Süßigkeiten</option>
                    <option value="snacks">Snacks</option>
                    <option value="essen">Essen</option>
                  </select>
                  <Button onClick={addProduct}>
                    <Plus className="h-4 w-4 mr-2" />
                    Hinzufügen
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produktbestand verwalten</CardTitle>
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
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="capitalize">{product.category}</TableCell>
                        <TableCell>€{product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={product.stock <= 0 ? "destructive" : product.stock <= 5 ? "secondary" : "default"}
                          >
                            {product.stock} Stück
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="Neuer Bestand"
                              className="w-24 px-2 py-1 border rounded text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const newStock = Number.parseInt((e.target as HTMLInputElement).value)
                                  if (!isNaN(newStock) && newStock >= 0) {
                                    updateProductStock(product.id, newStock)
                                    ;(e.target as HTMLInputElement).value = ""
                                  }
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const input = document.querySelector(
                                  `input[placeholder="Neuer Bestand"]`,
                                ) as HTMLInputElement
                                const newStock = Number.parseInt(input?.value || "0")
                                if (!isNaN(newStock) && newStock >= 0) {
                                  updateProductStock(product.id, newStock)
                                  if (input) input.value = ""
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                            {/* Löschen-Button für Produkte */}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Möchten Sie das Produkt "${product.name}" wirklich löschen?`)) {
                                  deleteProduct(product.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {products.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Noch keine Produkte vorhanden.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaktionshistorie</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum/Zeit</TableHead>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Preis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.timestamp.toLocaleString()}</TableCell>
                        <TableCell>{transaction.employeeName}</TableCell>
                        <TableCell>{transaction.productName}</TableCell>
                        <TableCell>€{transaction.price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
