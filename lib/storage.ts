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
  private currentUserId: string | null = null
  private cache: any = null
  private cacheTimestamp: number = 0
  private writeQueue: Promise<void> = Promise.resolve()
  private readonly CACHE_MAX_AGE = 5000

  // UserId setzen wenn User eingeloggt ist
  setCurrentUserId(userId: string | null) {
    if (this.currentUserId !== userId) {
      this.currentUserId = userId
      this.invalidateCache()
    }
  }

  getCurrentUserId(): string | null {
    return this.currentUserId
  }

  private async fetchData(forceRefresh = false) {
    const now = Date.now()
    if (forceRefresh || !this.cache || (now - this.cacheTimestamp) > this.CACHE_MAX_AGE) {
      const url = this.currentUserId 
        ? `/api/data?userId=${encodeURIComponent(this.currentUserId)}`
        : "/api/data"
      const response = await fetch(url, { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to fetch data")
      this.cache = await response.json()
      this.cacheTimestamp = now
    }
    return this.cache
  }

  private async fetchFreshFromServer() {
    const url = this.currentUserId 
      ? `/api/data?userId=${encodeURIComponent(this.currentUserId)}`
      : "/api/data"
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) throw new Error("Failed to fetch fresh data")
    const data = await response.json()
    this.cache = data
    this.cacheTimestamp = Date.now()
    return data
  }

  private async updateData(updates: any) {
    const payload = this.currentUserId 
      ? { userId: this.currentUserId, ...updates }
      : updates

    // Cache sofort aktualisieren
    if (this.cache) {
      this.cache = { ...this.cache, ...updates }
    }
    this.cacheTimestamp = Date.now()

    this.writeQueue = this.writeQueue.then(async () => {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to update data")
    })

    return this.writeQueue
  }

  invalidateCache() {
    this.cache = null
    this.cacheTimestamp = 0
  }

  // === Users (global, nicht pro Kantine) ===
  async getUsers(): Promise<KantineUser[]> {
    const response = await fetch("/api/data", { cache: "no-store" })
    if (!response.ok) throw new Error("Failed to fetch users")
    const data = await response.json()
    return data.users || []
  }

  async setUsers(users: KantineUser[]) {
    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users }),
    })
    if (!response.ok) throw new Error("Failed to update users")
  }

  async getCurrentUser(): Promise<KantineUser | null> {
    if (typeof window === "undefined") return null
    const data = sessionStorage.getItem("currentKantineUser")
    return data ? JSON.parse(data) : null
  }

  async setCurrentUser(user: KantineUser | null) {
    if (user) {
      sessionStorage.setItem("currentKantineUser", JSON.stringify(user))
      this.setCurrentUserId(user.id)
    } else {
      sessionStorage.removeItem("currentKantineUser")
      this.setCurrentUserId(null)
    }
  }

  // === Employees (pro Kantine) ===
  async getEmployees(): Promise<Employee[]> {
    const data = await this.fetchData()
    return data.employees || []
  }

  async setEmployees(employees: Employee[]) {
    await this.updateData({ employees })
  }

  // === Products (pro Kantine) ===
  async getProducts(): Promise<Product[]> {
    const data = await this.fetchData()
    return data.products || []
  }

  async setProducts(products: Product[]) {
    await this.updateData({ products })
  }

  // === Transactions (pro Kantine) ===
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

  async appendTransaction(transaction: Transaction) {
    const freshData = await this.fetchFreshFromServer()
    const existing = freshData.transactions || []
    await this.updateData({ transactions: [...existing, transaction] })
  }

  async setTransactions(transactions: (Transaction | ManualTransaction)[]) {
    const purchases = transactions.filter((t) => "price" in t)
    const manual = transactions.filter((t) => !("price" in t))
    await this.updateData({
      transactions: purchases,
      manualTransactions: manual,
    })
  }

  async setManualTransactions(manualTransactions: ManualTransaction[]) {
    await this.updateData({ manualTransactions })
  }

  // === Daily Stats (pro Kantine) ===
  async getDailyStats() {
    const data = await this.fetchData()
    return data.dailyStats || { mittagessen: 0, broetchen: 0, eier: 0, kaffee: 0, gesamtbetrag: 0, date: null }
  }

  async setDailyStats(stats: any) {
    await this.updateData({ dailyStats: stats })
  }

  // === Employees with Lunch (pro Kantine) ===
  async getEmployeesWithLunch(): Promise<string[]> {
    const data = await this.fetchData()
    return data.employeesWithLunch || []
  }

  async setEmployeesWithLunch(employees: string[]) {
    await this.updateData({ employeesWithLunch: employees })
  }
}

export const storage = new StorageAPI()

export default storage
