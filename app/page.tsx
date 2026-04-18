"use client"
import { useState, useEffect, useMemo, useCallback } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import AdminInterface from "@/components/AdminInterface"
import EmployeeInterface from "@/components/EmployeeInterface"
import QuickBooking from "@/components/QuickBooking"
import storage from "@/lib/storage"
import { useToast } from "@/components/ui/use-toast"
import type { KantineUser, Employee, Product, Transaction, ManualTransaction } from "@/lib/storage"
import { Toaster } from "@/components/ui/toaster"

const initialProducts: Omit<Product, "id" | "userId">[] = [
  { name: "Brötchen", price: 1.0, stock: 100, category: "essen" },
  { name: "Mittagessen", price: 4.5, stock: 50, category: "essen" },
  { name: "Frühstück ausgegeben", price: 40.0, stock: 50, category: "essen" },
  { name: "Kaffee", price: 1.5, stock: 100, category: "essen" },
  { name: "Ei", price: 0.3, stock: 200, category: "essen" },
  { name: "Wasser 0,5l", price: 0.5, stock: 100, category: "getränke" },
  { name: "Cola 0,5l", price: 1.0, stock: 50, category: "getränke" },
  { name: "Sirup 0,5l", price: 0.3, stock: 50, category: "getränke" },
  { name: "Sirup 1l", price: 0.6, stock: 50, category: "getränke" },
  { name: "Schokoriegel", price: 1.2, stock: 200, category: "süßigkeiten" },
  { name: "Gummibärchen", price: 0.8, stock: 150, category: "süßigkeiten" },
  { name: "Chips", price: 1.5, stock: 100, category: "snacks" },
  { name: "Nüsse", price: 2.0, stock: 80, category: "snacks" },
  { name: "Sonstiges 5€", price: 5.0, stock: 100, category: "sonstige" },
  { name: "Sonstiges 10€", price: 10.0, stock: 100, category: "sonstige" },
]

// Zentrale Hilfsfunktion für Produktkategorie-Erkennung - verhindert doppelte Logik
function getProductCategory(productName: string): "mittagessen" | "fruehstueck" | "kaffee" | "bezahlung" | "sonstiges" {
  const name = productName.toLowerCase()
  if (name.includes("mittagessen")) return "mittagessen"
  if (name.includes("bezahlung") || name.includes("payment")) return "bezahlung"
  if (name.includes("kaffee")) return "kaffee"
  if ((name.includes("brötchen") || name === "frühstück") && !name.includes("ausgegeben") && !name.includes("abschied")) return "fruehstueck"
  return "sonstiges"
}

function calculateEmployeeBalances(
  employees: Employee[],
  transactions: (Transaction | ManualTransaction)[],
): Employee[] {
  // Transaktionen einmal sortieren und nach employeeId gruppieren - O(n log n) statt O(n² log n)
  const sorted = [...transactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const byEmployee = new Map<string, (Transaction | ManualTransaction)[]>()
  for (const t of sorted) {
    if (!byEmployee.has(t.employeeId)) byEmployee.set(t.employeeId, [])
    byEmployee.get(t.employeeId)!.push(t)
  }

  return employees.map((employee) => {
    const employeeTransactions = byEmployee.get(employee.id) || []

    // Letzten Bezahlungszeitpunkt finden
    let lastPaymentIndex = -1
    for (let i = employeeTransactions.length - 1; i >= 0; i--) {
      const name = (employeeTransactions[i] as any).productName ?? ""
      if (getProductCategory(name) === "bezahlung") {
        lastPaymentIndex = i
        break
      }
    }

    const relevantTransactions = lastPaymentIndex >= 0
      ? employeeTransactions.slice(lastPaymentIndex + 1)
      : employeeTransactions

    const balance = relevantTransactions.reduce((sum, t) => {
      const val = "price" in t ? (t as Transaction).price : (t as ManualTransaction).amount
      return sum + val
    }, 0)

    return { ...employee, balance: Math.round(balance * 100) / 100 }
  })
}

export default function KantineApp() {
  const { toast } = useToast()

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<KantineUser | null>(null)
  const [allUsers, setAllUsers] = useState<KantineUser[]>([])
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<KantineUser | null>(null)
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPasswordDialog, setShowLoginPasswordDialog] = useState(false)
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordDialogAction, setPasswordDialogAction] = useState<"admin" | "newEmployee" | null>(null)
  const [registerUsername, setRegisterUsername] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerPaypalEmail, setRegisterPaypalEmail] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showAdminInterface, setShowAdminInterface] = useState(false)
  const [showQuickBooking, setShowQuickBooking] = useState(false)
  const [dailyStats, setDailyStats] = useState({
    mittagessen: 0,
    broetchen: 0,
    eier: 0,
    kaffee: 0,
    gesamtbetrag: 0,
    date: null as string | null,
  })
  const [employeesWithLunch, setEmployeesWithLunch] = useState<string[]>([])
  const [isLoadingReport, setIsLoadingReport] = useState(false) // Added state for loading report

  useEffect(() => {
    const loadUser = async () => {
      const user = await storage.getCurrentUser()
      if (user) {
        setCurrentUser(user)
        setIsLoggedIn(true)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    const loadUsers = async () => {
      const users = await storage.getUsers()
      setAllUsers(users)
    }
    loadUsers()
  }, [])

  useEffect(() => {
    if (!currentUser) return

    // UserId für Storage setzen
    storage.setCurrentUserId(currentUser.id)

    const loadData = async () => {
      // Jetzt laden wir nur noch die Daten DIESER Kantine (separate Datei)
      const userEmployees = await storage.getEmployees()
      const userProducts = await storage.getProducts()
      const userTransactions = await storage.getTransactions()

      if (userProducts.length === 0) {
        const newProducts = initialProducts.map((p) => ({
          ...p,
          id: Date.now().toString() + Math.random(),
          userId: currentUser.id,
        }))
        await storage.setProducts(newProducts)
        setProducts(newProducts)
      } else {
        setProducts(userProducts)
      }

      setEmployees(calculateEmployeeBalances(userEmployees, userTransactions))
      setTransactions(userTransactions)
    }

    loadData()

    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [currentUser])

  // Gibt den aktuellen "Tag" zurück - wechselt um 8:00 Uhr morgens
  const getDayKey = () => {
    const now = new Date()
    // Vor 8 Uhr gilt noch der Vortag
    if (now.getHours() < 8) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday.toDateString()
    }
    return now.toDateString()
  }

  useEffect(() => {
    if (!currentUser) return

    const loadDailyStats = async () => {
      const stats = await storage.getDailyStats()
      const today = getDayKey()

      if (stats.date === today) {
        setDailyStats({
          mittagessen: stats.mittagessen || 0,
          broetchen: stats.broetchen || 0,
          eier: stats.eier || 0,
          kaffee: stats.kaffee || 0,
          gesamtbetrag: stats.gesamtbetrag || 0,
          date: today,
        })
      } else {
        // Tageswechsel: nur die Tagesstatistik zurücksetzen, nicht die Schulden
        // Der Backup für alle Kantinen erfolgt durch Cron-Job um 8:00 Uhr
        const newStats = { mittagessen: 0, broetchen: 0, eier: 0, kaffee: 0, gesamtbetrag: 0, date: today }
        setDailyStats(newStats)
        await storage.setDailyStats(newStats)
        await storage.setEmployeesWithLunch([])
      }
    }

    loadDailyStats()

    // Jede Minute prüfen ob es 8:00 Uhr ist und ein Reset nötig wird
    const interval = setInterval(loadDailyStats, 60 * 1000)
    return () => clearInterval(interval)
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return

    const loadEmployeesWithLunch = async () => {
      const loadedEmployees = await storage.getEmployeesWithLunch()
      setEmployeesWithLunch(loadedEmployees)
    }

    loadEmployeesWithLunch()
  }, [currentUser])

  const handleUserButtonClick = (user: KantineUser) => {
    setSelectedUserForLogin(user)
    setLoginPassword("")
    setShowLoginPasswordDialog(true)
  }

  const handleLoginWithPassword = async () => {
    if (!selectedUserForLogin) return

    if (selectedUserForLogin.password === loginPassword) {
      storage.invalidateCache() // Frische Daten beim Login laden
      await storage.setCurrentUser(selectedUserForLogin)
      setIsLoggedIn(true)
      setCurrentUser(selectedUserForLogin)
      setShowLoginPasswordDialog(false)
      setLoginPassword("")
      setSelectedUserForLogin(null)
    } else {
      alert("Falsches Passwort.")
    }
  }

  const handleRegister = async () => {
    if (!registerUsername || !registerPassword) {
      alert("Bitte Benutzername und Passwort eingeben.")
      return
    }

    const newUser: KantineUser = {
      id: Date.now().toString() + Math.random(),
      username: registerUsername,
      password: registerPassword,
      paypalEmail: registerPaypalEmail,
      groupNames: {
        group1: "4te Tour",
        group2: "2Tour",
        group3: "Gäste",
      },
    }

    const users = await storage.getUsers()
    const updatedUsers = [...users, newUser]
    await storage.setUsers(updatedUsers)
    setAllUsers(updatedUsers)
    setRegisterUsername("")
    setRegisterPassword("")
    setRegisterPaypalEmail("")
    setShowRegisterDialog(false)
  }

  const handleLogout = async () => {
    storage.invalidateCache()
    await storage.setCurrentUser(null)
    setIsLoggedIn(false)
    setCurrentUser(null)
    setShowAdminInterface(false)
  }

  const addEmployee = async (name: string, group: string) => {
    const newEmployee: Employee = {
      id: Date.now().toString() + Math.random(),
      name,
      balance: 0,
      group,
      hideCoffee: false,
      userId: currentUser!.id,
    }

    await storage.setEmployees([...employees, newEmployee])
    setEmployees([...employees, newEmployee])
  }

  const updateEmployees = async (updatedEmployees: Employee[]) => {
    setEmployees(updatedEmployees)
    await storage.setEmployees(updatedEmployees)
  }

  const addTransaction = async (transaction: Transaction) => {
    const transactionWithUserId: Transaction = {
      ...transaction,
      userId: currentUser!.id,
    }

    setTransactions((prev) => [...prev, transactionWithUserId])

    const category = getProductCategory(transaction.productName)
    setDailyStats((prevStats) => {
      const newStats = { ...prevStats }
      if (category === "mittagessen") newStats.mittagessen += transaction.quantity
      else if (category === "fruehstueck") newStats.broetchen += transaction.quantity
      else if (category === "kaffee") newStats.kaffee += transaction.quantity
      if (category !== "bezahlung") {
        newStats.gesamtbetrag = Math.round(((newStats.gesamtbetrag || 0) + transaction.price) * 100) / 100
      }
      storage.setDailyStats({ ...newStats, date: getDayKey() })
      return newStats
    })

    if (category === "mittagessen") {
      const newList = [...employeesWithLunch, transaction.employeeName]
      setEmployeesWithLunch(newList)
      await storage.setEmployeesWithLunch(newList)
    }

    await storage.appendTransaction(transactionWithUserId)
  }

  const updateDailyStats = useCallback((productName: string, quantity: number) => {
    const category = getProductCategory(productName)
    setDailyStats((prev) => {
      const updated = { ...prev }
      if (category === "mittagessen") updated.mittagessen += quantity
      else if (category === "fruehstueck") updated.broetchen += quantity
      else if (category === "kaffee") updated.kaffee += quantity
      // gesamtbetrag wird ausschliesslich in addTransaction gesetzt
      storage.setDailyStats({ ...updated, date: getDayKey() })
      return updated
    })
  }, [currentUser])

  const updateTransactions = async (newTransactions: (Transaction | ManualTransaction)[]) => {
    setTransactions(newTransactions)
    setEmployees(calculateEmployeeBalances(employees, newTransactions))

    // Alle Transaktionen speichern mit userId um andere Kantinen nicht zu überschreiben
    await storage.setTransactions(newTransactions)
  }

  const handleUpdateProducts = async (updatedProducts: Product[]) => {
    setProducts(updatedProducts)
    await storage.setProducts(updatedProducts)
  }

  const handleGroupNamesUpdate = async (groupNames: { group1: string; group2: string; group3: string }) => {
    if (!currentUser) return

    const updatedUser = { ...currentUser, groupNames }
    setCurrentUser(updatedUser)
    await storage.setCurrentUser(updatedUser)

    const users = await storage.getUsers()
    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u))
    await storage.setUsers(updatedUsers)
  }

  const groupedEmployees = currentUser
    ? {
        [currentUser.groupNames.group1]: employees
          .filter((e) => e.group === "group1")
          .sort((a, b) => a.name.localeCompare(b.name)),
        [currentUser.groupNames.group2]: employees
          .filter((e) => e.group === "group2")
          .sort((a, b) => a.name.localeCompare(b.name)),
        [currentUser.groupNames.group3]: employees
          .filter((e) => e.group === "group3")
          .sort((a, b) => a.name.localeCompare(b.name)),
      }
    : {}

  const openNewEmployeeDialog = () => {
    setPasswordDialogAction("newEmployee")
    setShowPasswordDialog(true)
  }

  const openAdminDashboard = () => {
    setPasswordDialogAction("admin")
    setShowPasswordDialog(true)
  }

  const handlePasswordSubmit = () => {
    if (!currentUser) return

    if (loginPassword !== currentUser.password) {
      alert("Falsches Passwort!")
      return
    }

    setShowPasswordDialog(false)
    setLoginPassword("")

    if (passwordDialogAction === "admin") {
      setShowAdminInterface(true)
    } else if (passwordDialogAction === "newEmployee") {
      // Open AdminInterface with focus on adding new employee
      setShowAdminInterface(true)
    }

    setPasswordDialogAction(null)
  }

  const handleSendDebtReport = async () => {
    setIsLoadingReport(true)
    try {
      const response = await fetch("/api/send-debt-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser!.id,
          kantineName: currentUser!.username,
          employees,
        }),
      })
      const result = await response.json()
      if (response.ok) {
        alert(`Schulden gespeichert: ${result.filename}`)
      } else {
        alert(`Fehler: ${result.error}`)
      }
    } catch (error) {
      alert(`Fehler beim Speichern: ${error}`)
    } finally {
      setIsLoadingReport(false)
    }
  }

  const loadUserData = async () => {}

  if (selectedEmployee) {
    const employee = employees.find((e) => e.id === selectedEmployee)
    if (employee) {
      return (
        <EmployeeInterface
          employee={employee}
          products={products}
          onBack={() => setSelectedEmployee(null)}
          onTransaction={(transaction) => {
            addTransaction(transaction)
          }}
          transactions={transactions}
          addEmployeeToMealList={(employeeName) => {
            const newList = [...employeesWithLunch, employeeName]
            setEmployeesWithLunch(newList)
            storage.setEmployeesWithLunch(newList)
          }}
          onUpdateProducts={handleUpdateProducts}
        />
      )
    }
  }

  if (showQuickBooking) {
    return (
      <QuickBooking
        employees={employees}
        products={products}
        groupNames={currentUser?.groupNames}
        onAddTransaction={async (transaction) => {
          const fullTransaction = {
            ...transaction,
            id: Date.now().toString() + Math.random(),
            timestamp: new Date(),
          }
          await addTransaction(fullTransaction)
        }}
        addEmployeeToMealList={(employeeId) => {
          const employee = employees.find((e) => e.id === employeeId)
          if (employee) {
            const newList = [...employeesWithLunch, employee.name]
            setEmployeesWithLunch(newList)
            storage.setEmployeesWithLunch(newList)
          }
        }}
        onBack={() => {
          setShowQuickBooking(false)
        }}
      />
    )
  }

  if (showAdminInterface) {
    return (
      <AdminInterface
        employees={employees}
        products={products}
        transactions={transactions}
        onClose={() => setShowAdminInterface(false)}
        onUpdateEmployees={updateEmployees}
        onUpdateProducts={handleUpdateProducts}
        onUpdateTransactions={updateTransactions}
        userId={currentUser.id}
        userEmail={currentUser.paypalEmail}
        groupNames={currentUser.groupNames}
        onUpdateGroupNames={handleGroupNamesUpdate}
      />
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Kantine Management System</CardTitle>
            <CardDescription>Wählen Sie Ihre Kantine oder registrieren Sie eine neue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Bestehende Kantinen:</Label>
                <div className="grid gap-2">
                  {allUsers.map((user) => (
                    <Button
                      key={user.id}
                      onClick={() => handleUserButtonClick(user)}
                      className="w-full"
                      variant="outline"
                    >
                      {user.username}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={() => setShowRegisterDialog(true)} className="w-full">
              Neue Kantine registrieren
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showLoginPasswordDialog} onOpenChange={setShowLoginPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Anmeldung</DialogTitle>
              <DialogDescription>Geben Sie das Passwort für {selectedUserForLogin?.username} ein</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginPassword">Passwort</Label>
                <Input
                  id="loginPassword"
                  type="password"
                  placeholder="Passwort eingeben"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLoginWithPassword()
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLoginPasswordDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleLoginWithPassword}>Anmelden</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Kantine registrieren</DialogTitle>
              <DialogDescription>
                Geben Sie Ihre Kantinendaten ein, um eine neue Kantine anzulegen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kantinenname</Label>
                <Input
                  id="username"
                  placeholder="z.B. Wache 4 2/4 Tour"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRegister()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paypal">E-Mail-Adresse</Label>
                <Input
                  id="paypal"
                  type="email"
                  placeholder="ihre-email@hotmail.com"
                  value={registerPaypalEmail}
                  onChange={(e) => setRegisterPaypalEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRegister()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Passwort eingeben"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRegister()
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleRegister}>Kantine erstellen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Toaster />

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex-1"></div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Kantine {currentUser.username}</h1>
            <div className="flex-1 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Abmelden
              </Button>
            </div>
          </div>
          <p className="text-slate-600">Paypal {currentUser.paypalEmail}</p>
        </div>

        <div className="flex justify-center gap-4 mb-4">
          <Button onClick={() => setShowQuickBooking(true)} size="lg" className="gap-2">
            Schnellbuchung
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Gesamtschulden</CardTitle>
              <CardDescription className="text-xs">{employees.length} Mitarbeiter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {employees.reduce((sum, emp) => sum + Math.max(0, emp.balance), 0).toFixed(2)} €
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Gesamtbetrag heute</CardTitle>
              <CardDescription className="text-xs">Reset um 8:00 Uhr</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(dailyStats.gesamtbetrag || 0).toFixed(2)} €
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Mittagessen</CardTitle>
              <CardDescription className="text-xs">heute gebucht</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{dailyStats.mittagessen}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Frühstück</CardTitle>
              <CardDescription className="text-xs">heute gebucht</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailyStats.broetchen}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Kaffee</CardTitle>
              <CardDescription className="text-xs">heute gebucht</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailyStats.kaffee}</div>
            </CardContent>
          </Card>
        </div>

        {Object.entries(groupedEmployees).map(([groupName, groupEmployees]) => (
          <Card key={groupName}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{groupName}</CardTitle>
                  <CardDescription>Klicken Sie auf einen Namen um Produkte einzutragen</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {groupEmployees.map((employee) => (
                  <Button
                    key={employee.id}
                    variant="outline"
                    className="justify-between bg-transparent"
                    onClick={() => setSelectedEmployee(employee.id)}
                  >
                    <span>{employee.name}</span>
                    <span className={employee.balance >= 0 ? "text-red-600" : "text-green-600"}>
                      {employee.balance >= 0 ? "-" : "+"} {Math.abs(employee.balance).toFixed(2)} €
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              Administrator-Bereich
            </CardTitle>
            <CardDescription>Verwaltung, Buchungen und Abrechnungen</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openAdminDashboard} className="w-full">
              Admin-Dashboard
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schulden speichern</CardTitle>
            <CardDescription>Offene Schulden als HTML-Datei speichern</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSendDebtReport}
              disabled={isLoadingReport}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoadingReport ? "Wird gespeichert..." : "Schulden jetzt speichern"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{passwordDialogAction === "admin" ? "Admin-Dashboard" : "Neuer Mitarbeiter"}</DialogTitle>
            <DialogDescription>Bitte geben Sie Ihr Passwort ein, um fortzufahren.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handlePasswordSubmit()
                  }
                }}
                placeholder="Passwort eingeben"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false)
                setLoginPassword("")
                setPasswordDialogAction(null)
              }}
            >
              Abbrechen
            </Button>
            <Button onClick={handlePasswordSubmit}>Bestätigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
