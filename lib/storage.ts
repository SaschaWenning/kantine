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
  private writeQueue: Promise<void> = Promise.resolve()

  private async fetchData() {
    if (this.cache) return this.cache
    const response = await fetch("/api/data")
    if (!response.ok) throw new Error("Failed to fetch data")
    this.cache = await response.json()
    return this.cache
  }

  private async updateData(updates: any) {
    // Merge updates into cache immediately
    if (this.cache) {
      this.cache = { ...this.cache, ...updates }
    } else {
      this.cache = updates
    }

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

  invalidateCache() {
    this.cache = null
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

  async setEmployees(employees: Employee[]) {
    await this.updateData({ employees })
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.fetchData()
    return data.products || []
  }

  async setProducts(products: Product[]) {
    await this.updateData({ products })
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

  async setTransactions(transactions: (Transaction | ManualTransaction)[]) {
    // Käufe und Einzahlungen trennen
    const purchases = transactions.filter(t => "price" in t)
    const manual = transactions.filter(t => !("price" in t))

    if (this.cache) {
      this.cache = { 
        ...this.cache, 
        transactions: purchases,
        manualTransactions: manual.length > 0 ? manual : (this.cache.manualTransactions || [])
      }
    } else {
      this.cache = { transactions: purchases }
    }

    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.cache),
    })
    if (!response.ok) throw new Error("Failed to save transactions")
  }

  async setManualTransactions(manualTransactions: ManualTransaction[]) {
    const data = await this.fetchData()
    if (this.cache) {
      this.cache = { ...this.cache, manualTransactions }
    }
    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, manualTransactions }),
    })
    if (!response.ok) throw new Error("Failed to save manual transactions")
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
