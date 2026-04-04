import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the latest data
    const dataResponse = await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/get-latest-data`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    if (!dataResponse.ok) {
      throw new Error("Failed to fetch latest data")
    }

    const data = await dataResponse.json()

    // Trigger client-side CSV download by storing backup flag
    // This will be picked up by the client-side sync function
    const backupData = {
      ...data,
      triggerBackup: true,
      backupTimestamp: new Date().toISOString(),
    }

    // Store backup trigger in our data sync endpoint
    await fetch(`${process.env.VERCEL_URL || "http://localhost:3000"}/api/get-latest-data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backupData),
    })

    return NextResponse.json({
      success: true,
      message: "CSV backup triggered successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("CSV backup cron job error:", error)
    return NextResponse.json(
      { error: "CSV backup failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
