import { type NextRequest, NextResponse } from "next/server"

let latestData: {
  employees: any[]
  transactions: any[]
  lastUpdated: Date
} | null = null

export async function POST(request: NextRequest) {
  try {
    const { employees, transactions } = await request.json()

    latestData = {
      employees,
      transactions,
      lastUpdated: new Date(),
    }

    return NextResponse.json({
      success: true,
      message: "Data updated successfully",
      lastUpdated: latestData.lastUpdated,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization for cron jobs
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("[v0] Unauthorized access attempt to get-latest-data")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!latestData) {
      console.log("[v0] No data available in get-latest-data")
      return NextResponse.json(
        {
          error: "No data available. Client has not synced data yet.",
        },
        { status: 404 },
      )
    }

    console.log(
      "[v0] Returning latest data - employees:",
      latestData.employees?.length,
      "transactions:",
      latestData.transactions?.length,
      "lastUpdated:",
      latestData.lastUpdated,
    )

    return NextResponse.json({
      employees: latestData.employees,
      transactions: latestData.transactions,
      lastUpdated: latestData.lastUpdated,
    })
  } catch (error) {
    console.error("[v0] Error in get-latest-data:", error)
    return NextResponse.json(
      { error: "Failed to get data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
