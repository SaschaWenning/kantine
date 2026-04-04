import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "kantine-data.json")

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify({
      users: [],
      employees: [],
      products: [],
      transactions: [],
      dailyStats: {},
      employeesWithLunch: {},
    }),
  )
}

function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    return {
      users: [],
      employees: [],
      products: [],
      transactions: [],
      dailyStats: {},
      employeesWithLunch: {},
    }
  }
}

function writeData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function GET(request: NextRequest) {
  try {
    const data = readData()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json()
    const currentData = readData()

    const newData = {
      users: updates.users !== undefined ? updates.users : currentData.users,
      employees: updates.employees !== undefined ? updates.employees : currentData.employees,
      products: updates.products !== undefined ? updates.products : currentData.products,
      transactions: updates.transactions !== undefined ? updates.transactions : currentData.transactions,
      dailyStats: updates.dailyStats !== undefined ? updates.dailyStats : currentData.dailyStats,
      employeesWithLunch:
        updates.employeesWithLunch !== undefined ? updates.employeesWithLunch : currentData.employeesWithLunch,
    }

    writeData(newData)
    return NextResponse.json({ success: true, data: newData })
  } catch (error) {
    return NextResponse.json({ error: "Failed to write data" }, { status: 500 })
  }
}
