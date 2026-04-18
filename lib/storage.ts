export interface KantineUser {
  id: string
  username: string
  password: string
  paypalEmail: string
  groupNames: {
    group1: string
    group2: string
    group3: string
  }
}

export interface Employee {
  id: string
  name: string
  balance: number
  group: string
  hideCoffee?: boolean
  userId: string
}

export interface Product {
  id: string
  name: string
  price: number
  category: string
  userId: string
}

export interface Transaction {
  id: string
  employeeId: string
  employeeName: string
  productId: string
  productName: string
  price: number
  quantity: number
  timestamp: Date
  userId: string
}

export interface ManualTransaction {
  id: string
  employeeId: string
  employeeName: string
  amount: number
  description: string
  timestamp: Date
  userId: string
}

class StorageAPI {
  private cache: any = null
  private cacheTimestamp: number = 0
  private writeQueue: Promise<void> = Promise.resolve()
  private readonly CACHE_MAX_AGE = 5000 // Cache nur 5 Sekunden gültig

  private async fetchData(forceRefresh = false) {
    const now = Date.now()
    // Cache invalidieren wenn zu alt oder forceRefresh
    if (forceRefresh || !this.cache || (now - this.cacheTimestamp) > this.CACHE_MAX_AGE) {
      const response = await fetch("/api/data", { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to fetch data")
      this.cache = await response.json()
      this.cacheTimestamp = now
    }
    return this.cache
  }

  private async updateData(updates: any) {
    // KRITISCH: Immer frische Daten vom Server holen vor dem Schreiben
    // um Überschreiben von Daten anderer Kantinen zu verhindern
    const freshData = await this.fetchFreshFromServer()
    
    // Updates in frische Daten mergen
    const merged = { ...freshData, ...updates }
    this.cache = merged
    this.cacheTimestamp = Date.now()

    // Queue the write so concurrent calls don't race
    this.writeQueue = this.writeQueue.then(async () => {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.cache),
      })
      if (!response.ok) throw new Error("Failed to update data")
    })

    return this.writeQueue
  }

  // Immer frische Daten vom Server holen (kein Cache)
  private async fetchFreshFromServer() {
    const response = await fetch("/api/data", { cache: "no-store" })
    if (!response.ok) throw new Error("Failed to fetch fresh data")
    return response.json()
  }

  invalidateCache() {
    this.cache = null
    this.cacheTimestamp = 0
  }

  async getUsers(): Promise<KantineUser[]> {
    const data = await this.fetchData()
    return data.users || []
  }

  async setUsers(users: KantineUser[]) {
    await this.updateData({ users })
  }

  async getCurrentUser(): Promise<KantineUser | null> {
    if (typeof window === "undefined") return null
    const data = sessionStorage.getItem("currentKantineUser")
    return data ? JSON.parse(data) : null
  }

  async setCurrentUser(user: KantineUser | null) {
    if (user) {
      sessionStorage.setItem("currentKantineUser", JSON.stringify(user))
    } else {
      sessionStorage.removeItem("currentKantineUser")
    }
  }

  async getEmployees(): Promise<Employee[]> {
    const data = await this.fetchData()
    return data.employees || []
  }

  async setEmployees(employees: Employee[], userId?: string) {
    // KRITISCH: Bei userId nur die Mitarbeiter dieser Kantine ersetzen, andere behalten
    if (userId) {
      const freshData = await this.fetchFreshFromServer()
      const otherKantineEmployees = (freshData.employees || []).filter((e: Employee) => e.userId !== userId)
      await this.updateData({ employees: [...otherKantineEmployees, ...employees] })
    } else {
      // Ohne userId: direktes Überschreiben (für Lösch-Operationen)
      await this.updateData({ employees })
    }
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.fetchData()
    return data.products || []
  }

  async setProducts(products: Product[], userId?: string) {
    if (userId) {
      const freshData = await this.fetchFreshFromServer()
      const otherKantineProducts = (freshData.products || []).filter((p: Product) => p.userId !== userId)
      await this.updateData({ products: [...otherKantineProducts, ...products] })
    } else {
      await this.updateData({ products })
    }
  }

  async getTransactions(): Promise<(Transaction | ManualTransaction)[]> {
    const data = await this.fetchData()
    const transactions = (data.transactions || []).map((t: any) => ({
      ...t,
      timestamp: new Date(t.timestamp),
    }))
    const manualTransactions = (data.manualTransactions || []).map((t: any) => ({
      ...t,
      timestamp: new Date(t.timestamp),
    }))
    return [...transactions, ...manualTransactions]
  }

  // Einzelne Transaktion anhängen - holt IMMER frische Daten vom Server
  async appendTransaction(transaction: Transaction) {
    const freshData = await this.fetchFreshFromServer()
    const existing = freshData.transactions || []
    await this.updateData({ transactions: [...existing, transaction] })
  }

  async setTransactions(transactions: (Transaction | ManualTransaction)[], userId?: string) {
    // KRITISCH: Immer frische Daten vom Server holen um andere Kantinen nicht zu überschreiben
    const freshData = await this.fetchFreshFromServer()
    
    // Wenn userId übergeben: nur Transaktionen der aktuellen Kantine ersetzen, andere behalten
    // Wenn keine userId: direkter Überschreib (für Lösch-Operationen)
    if (userId) {
      const otherKantineTransactions = (freshData.transactions || []).filter((t: Transaction) => t.userId !== userId)
      const otherManualTransactions = (freshData.manualTransactions || []).filter((t: ManualTransaction) => t.userId !== userId)
      
      const purchases = transactions.filter((t) => "price" in t)
      const manual = transactions.filter((t) => !("price" in t))
      
      await this.updateData({
        transactions: [...otherKantineTransactions, ...purchases],
        manualTransactions: [...otherManualTransactions, ...manual],
      })
    } else {
      // Direkt überschreiben (für Lösch-Operationen)
      const purchases = transactions.filter((t) => "price" in t)
      const manual = transactions.filter((t) => !("price" in t))
      await this.updateData({
        transactions: purchases,
        manualTransactions: manual,
      })
    }
  }

  async setManualTransactions(manualTransactions: ManualTransaction[], userId: string) {
    const freshData = await this.fetchFreshFromServer()
    const otherManuals = (freshData.manualTransactions || []).filter((t: ManualTransaction) => t.userId !== userId)
    await this.updateData({ manualTransactions: [...otherManuals, ...manualTransactions] })
  }

  async getDailyStats(userId: string) {
    const data = await this.fetchData()
    return data.dailyStats?.[userId] || { mittagessen: 0, broetchen: 0, eier: 0, kaffee: 0, date: null }
  }

  async setDailyStats(userId: string, stats: any) {
    const data = await this.fetchData()
    const dailyStats = { ...(data.dailyStats || {}) }
    dailyStats[userId] = stats
    await this.updateData({ dailyStats })
  }

  async getEmployeesWithLunch(userId: string): Promise<string[]> {
    const data = await this.fetchData()
    return data.employeesWithLunch?.[userId] || []
  }

  async setEmployeesWithLunch(userId: string, employees: string[]) {
    const data = await this.fetchData()
    const employeesWithLunch = { ...(data.employeesWithLunch || {}) }
    employeesWithLunch[userId] = employees
    await this.updateData({ employeesWithLunch })
  }

  async sendDebtReport(userId: string, paypalEmail: string) {
    const data = await this.fetchData()
    const employees = data.employees?.filter((e: Employee) => e.userId === userId) || []
    const transactions = data.transactions?.filter((t: Transaction) => t.userId === userId) || []

    if (!paypalEmail) throw new Error("PayPal email is required")

    const response = await fetch("/api/send-debt-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employees, transactions, userId, paypalEmail }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || error.error || "Failed to send debt report")
    }

    return response.json()
  }
}

export const storage = new StorageAPI()

export default storage
