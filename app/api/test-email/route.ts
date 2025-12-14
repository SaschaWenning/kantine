import { type NextRequest, NextResponse } from "next/server"
import { createEmailService } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    // Verify admin access (you might want to add proper authentication)
    const { password } = await request.json()

    if (password !== "kantinewache4") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        message: "Test email simulation successful! (Preview mode - no actual email sent)",
        preview: true,
        info: "In the deployed version with RESEND_API_KEY, this would send a real email to kantinewache4@hotmail.com",
      })
    }

    // Create email service and send test email
    const emailService = createEmailService()
    const result = await emailService.sendTestEmail()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully!",
        messageId: result.messageId,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Test email error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
