import { type NextRequest, NextResponse } from "next/server"
import { createEmailService } from "@/lib/email-service"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    // Get current data from request body (sent from client-side sync)
    const { employees, transactions, userId, paypalEmail } = await request.json()

    if (!employees || !transactions) {
      return NextResponse.json({ error: "No data available. Client-side sync may not be working." }, { status: 400 })
    }

    // Calculate current debts for each employee
    const employeesWithDebts = employees
      .map((employee: any) => {
        const employeeTransactions = transactions.filter((t: any) => t.employeeId === employee.id)
        const totalDebt = employeeTransactions.reduce((sum: number, t: any) => sum + t.price, 0)
        return {
          ...employee,
          balance: totalDebt,
        }
      })
      .filter((employee: any) => employee.balance > 0) // Only include employees with debts

    const totalDebt = employeesWithDebts.reduce((sum: number, emp: any) => sum + emp.balance, 0)

    const reportDate = new Date()
    const reportData = {
      date: reportDate.toISOString(),
      totalDebt,
      employeesWithDebts,
      transactions: transactions.filter((t: any) => employeesWithDebts.some((e: any) => e.id === t.employeeId)),
    }

    try {
      // Create reports directory if it doesn't exist
      const reportsDir = join(process.cwd(), "reports")
      await mkdir(reportsDir, { recursive: true })

      // Save report as JSON file
      const filename = `schulden-report-${reportDate.toISOString().split("T")[0]}-${Date.now()}.json`
      const filepath = join(reportsDir, filename)
      await writeFile(filepath, JSON.stringify(reportData, null, 2))
      console.log("[v0] Report saved locally:", filepath)
    } catch (fileError) {
      console.error("[v0] Error saving report locally:", fileError)
      // Continue with email sending even if local save fails
    }

    // Create email service and send report
    const emailService = createEmailService()
    const emailResult = await emailService.sendDebtReport({
      employees: employeesWithDebts,
      totalDebt,
      reportDate,
      recipientEmail: paypalEmail || "kantinewache4@hotmail.com",
    })

    if (!emailResult.success) {
      throw new Error(emailResult.error || "Failed to send email")
    }

    return NextResponse.json({
      success: true,
      message: "Debt report sent successfully",
      employeesWithDebts: employeesWithDebts.length,
      totalDebt: totalDebt,
      emailId: emailResult.messageId,
    })
  } catch (error) {
    console.error("Error sending debt report:", error)
    return NextResponse.json(
      { error: "Failed to send debt report", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Cron job triggered at:", new Date().toISOString())
    console.log("[v0] Environment check - VERCEL_URL:", process.env.VERCEL_URL)
    console.log("[v0] Environment check - CRON_SECRET exists:", !!process.env.CRON_SECRET)
    console.log("[v0] Environment check - RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY)

    // Verify this is a Vercel cron request
    const authHeader = request.headers.get("authorization")
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    console.log("[v0] Auth header received:", authHeader ? "Bearer [REDACTED]" : "None")

    if (authHeader !== expectedAuth) {
      console.log("[v0] Authorization failed - cron job unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let baseUrl: string
    if (process.env.VERCEL_URL) {
      baseUrl = process.env.VERCEL_URL.startsWith("http") ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`
    } else {
      baseUrl = "http://localhost:3000"
    }

    console.log("[v0] Cron job starting, base URL:", baseUrl)

    // Get the latest data from our data sync endpoint
    const dataUrl = `${baseUrl}/api/get-latest-data`
    console.log("[v0] Fetching data from:", dataUrl)

    const dataResponse = await fetch(dataUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "User-Agent": "Vercel-Cron-Job",
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    console.log("[v0] Data fetch response status:", dataResponse.status)
    console.log("[v0] Data fetch response headers:", Object.fromEntries(dataResponse.headers.entries()))

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text()
      console.log("[v0] Data fetch error response:", errorText)
      throw new Error(`Failed to fetch latest data: ${dataResponse.status} - ${errorText}`)
    }

    const dataResult = await dataResponse.json()
    const { employees, transactions } = dataResult
    console.log("[v0] Fetched data - employees:", employees?.length, "transactions:", transactions?.length)

    if (!employees || !transactions) {
      throw new Error("No valid data received from sync endpoint")
    }

    // Now send the email with this data
    const emailUrl = `${baseUrl}/api/send-debt-report`
    console.log("[v0] Sending email via:", emailUrl)

    const emailResponse = await fetch(emailUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Vercel-Cron-Job",
      },
      body: JSON.stringify({ employees, transactions }),
      signal: AbortSignal.timeout(45000), // 45 second timeout for email
    })

    console.log("[v0] Email response status:", emailResponse.status)

    const result = await emailResponse.json()
    console.log("[v0] Email result:", result)

    if (!emailResponse.ok) {
      throw new Error(`Email sending failed: ${result.error || "Unknown error"}`)
    }

    console.log("[v0] Cron job completed successfully at:", new Date().toISOString())

    return NextResponse.json({
      success: true,
      message: "Cron job completed successfully",
      emailResult: result,
      timestamp: new Date().toISOString(),
      debugInfo: {
        baseUrl,
        dataFetched: { employees: employees?.length, transactions: transactions?.length },
        emailSent: result.success,
      },
    })
  } catch (error) {
    console.error("[v0] Cron job error:", error)

    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      environment: {
        vercelUrl: !!process.env.VERCEL_URL,
        cronSecret: !!process.env.CRON_SECRET,
        resendKey: !!process.env.RESEND_API_KEY,
      },
    }

    return NextResponse.json(
      {
        error: "Cron job failed",
        details: errorDetails,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
