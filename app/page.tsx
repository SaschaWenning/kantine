"use client"
import { useState, useEffect } from "react"

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

function calculateEmployeeBalances(
  employees: Employee[],
  transactions: (Transaction | ManualTransaction)[],
): Employee[] {
  return employees.map((employee) => {
    const employeeTransactions = transactions.filter((t) => t.employeeId === employee.id)
    const balance = employeeTransactions.reduce((sum, t) => {
      if ("price" in t) {
        return sum + t.price
      }
      return sum + t.amount
    }, 0)
    return { ...employee, balance }
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
  const [dailyStats, setDailyStats] = useState({
    mittagessen: 0,
    broetchen: 0,
    eier: 0,
    kaffee: 0,
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

    const loadData = async () => {
      console.log("[v0] Loading data for user:", currentUser.username, currentUser.id)

      const allEmployees = await storage.getEmployees()
      const allProducts = await storage.getProducts()
      const allTransactions = await storage.getTransactions()

      console.log("[v0] Total employees:", allEmployees.length)
      console.log("[v0] Total products:", allProducts.length)
      console.log("[v0] Total transactions:", allTransactions.length)

      const userEmployees = allEmployees.filter((e) => e.userId === currentUser.id)
      const userProducts = allProducts.filter((p) => p.userId === currentUser.id)
      const userTransactions = allTransactions.filter((t) => t.userId === currentUser.id)

      console.log("[v0] User employees:", userEmployees.length)
      console.log("[v0] User products:", userProducts.length)
      console.log("[v0] User transactions:", userTransactions.length)

      if (userProducts.length === 0) {
        console.log("[v0] Creating initial products for new user")
        const newProducts = initialProducts.map((p) => ({
          ...p,
          id: Date.now().toString() + Math.random(),
          userId: currentUser.id,
        }))
        await storage.setProducts([...allProducts, ...newProducts])
        setProducts(newProducts)
      } else {
        setProducts(userProducts)
      }

      setEmployees(calculateEmployeeBalances(userEmployees, userTransactions as Transaction[]))
      setTransactions(userTransactions as Transaction[])
    }

    loadData()

    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return

    const loadDailyStats = async () => {
      const stats = await storage.getDailyStats(currentUser.id)
      const today = new Date().toDateString()

      if (stats.date === today) {
        setDailyStats({
          mittagessen: stats.mittagessen,
          broetchen: stats.broetchen,
          eier: stats.eier,
          kaffee: stats.kaffee,
          date: today,
        })
      } else {
        const newStats = { mittagessen: 0, broetchen: 0, eier: 0, kaffee: 0, date: today }
        setDailyStats(newStats)
        await storage.setDailyStats(currentUser.id, newStats)
        await storage.setEmployeesWithLunch(currentUser.id, [])
      }
    }

    loadDailyStats()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return

    const loadEmployeesWithLunch = async () => {
      const employees = await storage.getEmployeesWithLunch(currentUser.id)
      setEmployeesWithLunch(employees)
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
    if (!registerUsername || !registerPassword || !registerPaypalEmail) {
      alert("Bitte füllen Sie alle Felder aus.")
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

    const allEmployees = await storage.getEmployees()
    await storage.setEmployees([...allEmployees, newEmployee])
    setEmployees([...employees, newEmployee])
  }

  const updateEmployees = async (updatedEmployees: Employee[]) => {
    setEmployees(updatedEmployees)
    const allEmployees = await storage.getEmployees()
    const otherEmployees = allEmployees.filter((e) => e.userId !== currentUser?.id)
    await storage.setEmployees([...otherEmployees, ...updatedEmployees])
  }

  const addTransaction = async (transaction: Transaction) => {
    const transactionWithUserId = {
      ...transaction,
      userId: currentUser!.id,
    }

    const allTransactions = await storage.getTransactions()
    await storage.setTransactions([...allTransactions, transactionWithUserId])
    setTransactions((prev) => [...prev, transactionWithUserId])

    const newStats = { ...dailyStats }
    if (transaction.productName === "Mittagessen") {
      newStats.mittagessen += transaction.quantity
    } else if (transaction.productName.toLowerCase().includes("brötchen")) {
      newStats.broetchen += transaction.quantity
    } else if (transaction.productName === "Ei" || transaction.productName.toLowerCase().includes("eier")) {
      newStats.eier += transaction.quantity
    } else if (transaction.productName.toLowerCase().includes("kaffee")) {
      newStats.kaffee += transaction.quantity
    }
    setDailyStats(newStats)
    await storage.setDailyStats(currentUser!.id, { ...newStats, date: new Date().toDateString() })

    if (transaction.productName === "Mittagessen") {
      const newList = [...employeesWithLunch, transaction.employeeName]
      setEmployeesWithLunch(newList)
      await storage.setEmployeesWithLunch(currentUser!.id, newList)
    }
  }

  const updateDailyStats = (productName: string, quantity: number) => {
    setDailyStats((prev) => {
      const updated = { ...prev }
      if (productName === "Mittagessen") {
        updated.mittagessen += quantity
      }
      if (productName.toLowerCase().includes("brötchen")) {
        updated.broetchen += quantity
      }
      if (productName.toLowerCase().includes("eier") || productName.toLowerCase() === "ei") {
        updated.eier += quantity
      }
      if (productName.toLowerCase().includes("kaffee")) {
        updated.kaffee += quantity
      }
      storage.setDailyStats(currentUser!.id, { ...updated, date: new Date().toDateString() })
      return updated
    })
  }

  const updateTransactions = async (newTransactions: (Transaction | ManualTransaction)[]) => {
    setTransactions(newTransactions as Transaction[])
    const allTransactions = await storage.getTransactions()
    const otherTransactions = allTransactions.filter((t) => t.userId !== currentUser?.id)
    await storage.setTransactions([...otherTransactions, ...newTransactions])
  }

  const handleUpdateProducts = async (updatedProducts: Product[]) => {
    setProducts(updatedProducts)

    const allProducts = await storage.getProducts()
    const otherProducts = allProducts.filter((p) => p.userId !== currentUser.id)
    await storage.setProducts([...otherProducts, ...updatedProducts])
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
      const result = await storage.sendDebtReport(currentUser.id, currentUser.paypalEmail)

      toast({
        title: "Schulden-Report erfolgreich gesendet",
        description: `${result.employeesWithDebts} Mitarbeiter mit Schulden (${result.totalDebt.toFixed(2)}€). Report wurde auch lokal gespeichert.`,
      })
    } catch (error) {
      toast({
        title: "Fehler",
        description: `Fehler beim Senden: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoadingReport(false)
    }
  }

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
          updateDailyStats={updateDailyStats}
          addEmployeeToMealList={(employeeName) => {
            const newList = [...employeesWithLunch, employeeName]
            setEmployeesWithLunch(newList)
            storage.setEmployeesWithLunch(currentUser!.id, newList)
          }}
          onUpdateProducts={handleUpdateProducts}
        />
      )
    }
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
                Geben Sie Ihre Unternehmensdaten ein, um eine neue Kantine anzulegen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Unternehmensname</Label>
                <Input
                  id="username"
                  placeholder="z.B. Wache 4 2/4 Tour"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paypal">PayPal-Adresse</Label>
                <Input
                  id="paypal"
                  type="email"
                  placeholder="kantinewache4@hotmail.com"
                  value={registerPaypalEmail}
                  onChange={(e) => setRegisterPaypalEmail(e.target.value)}
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
              <CardTitle className="text-sm font-medium">Transaktionen</CardTitle>
              <CardDescription className="text-xs">heute: {transactions.length}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions.length}</div>
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
              <CardTitle className="text-sm font-medium">Brötchen</CardTitle>
              <CardDescription className="text-xs">heute gebucht</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailyStats.broetchen}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Eier</CardTitle>
              <CardDescription className="text-xs">heute gebucht</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dailyStats.eier}</div>
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
            <CardTitle>Schulden-Report</CardTitle>
            <CardDescription>Aktuellen Schulden-Report per E-Mail versenden</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSendDebtReport}
              disabled={isLoadingReport}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoadingReport ? "Wird gesendet..." : "Schulden-Report jetzt senden"}
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
