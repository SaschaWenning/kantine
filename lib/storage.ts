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
  private async fetchData() {
    const response = await fetch("/api/data")
    if (!response.ok) throw new Error("Failed to fetch data")
    return response.json()
  }

  private async updateData(updates: any) {
    const response = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error("Failed to update data")
    return response.json()
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
    const transactions = data.transactions || []
    return transactions.map((t: any) => ({
      ...t,
      timestamp: new Date(t.timestamp),
    }))
  }

  async setTransactions(transactions: (Transaction | ManualTransaction)[]) {
    await this.updateData({ transactions })
  }

  async getDailyStats(userId: string) {
    const data = await this.fetchData()
    return data.dailyStats?.[userId] || { mittagessen: 0, broetchen: 0, eier: 0, kaffee: 0, date: null }
  }

  async setDailyStats(userId: string, stats: any) {
    const data = await this.fetchData()
    const dailyStats = data.dailyStats || {}
    dailyStats[userId] = stats
    await this.updateData({ dailyStats })
  }

  async getEmployeesWithLunch(userId: string): Promise<string[]> {
    const data = await this.fetchData()
    return data.employeesWithLunch?.[userId] || []
  }

  async setEmployeesWithLunch(userId: string, employees: string[]) {
    const data = await this.fetchData()
    const employeesWithLunch = data.employeesWithLunch || {}
    employeesWithLunch[userId] = employees
    await this.updateData({ employeesWithLunch })
  }

  async sendDebtReport(userId: string, paypalEmail: string) {
    const data = await this.fetchData()
    const employees = data.employees?.filter((e: Employee) => e.userId === userId) || []
    const transactions = data.transactions?.filter((t: Transaction | ManualTransaction) => t.userId === userId) || []

    const response = await fetch("/api/send-debt-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employees,
        transactions,
        userId,
        paypalEmail,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || "Failed to send debt report")
    }

    return response.json()
  }
}

export const storage = new StorageAPI()

export default storage
