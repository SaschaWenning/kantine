import { Resend } from "resend"

interface Employee {
  id: string
  name: string
  balance: number
}

interface DebtReportData {
  employees: Employee[]
  totalDebt: number
  reportDate: Date
  recipientEmail?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export class EmailService {
  private resend: Resend

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey)
  }

  public getDebtReportHTML(
    employees: Employee[],
    totalDebt: number,
    reportDate: Date,
    recipientEmail?: string,
  ): string {
    const employeeRows = employees
      .map(
        (emp) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${emp.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #dc2626; font-weight: bold;">
            ${emp.balance.toFixed(2)} €
          </td>
        </tr>
      `,
      )
      .join("")

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Kantine Schulden-Report</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">🏪 Kantine Schulden-Report</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Automatischer Report vom ${reportDate.toLocaleDateString("de-DE")}</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin-top: 0;">📊 Zusammenfassung</h2>
            <p style="font-size: 18px; margin: 10px 0;">
              <strong>Gesamtschulden: ${totalDebt.toFixed(2)} €</strong>
            </p>
            <p style="margin: 5px 0;">Anzahl Mitarbeiter mit Schulden: ${employees.length}</p>
          </div>

          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <h3 style="background: #f1f5f9; margin: 0; padding: 15px; color: #1e293b;">👥 Mitarbeiter-Schulden</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Mitarbeiter</th>
                  <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #ddd;">Schulden</th>
                </tr>
              </thead>
              <tbody>
                ${employeeRows}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-radius: 8px; border-left: 4px solid #0284c7;">
            <h4 style="margin-top: 0; color: #0284c7;">💳 Zahlungshinweis</h4>
            <p style="margin-bottom: 0;">
              Bitte überweisen Sie Ihre Schulden an:<br>
              <strong>PayPal: ${recipientEmail || "kantinewache4@hotmail.com"}</strong>
            </p>
          </div>

          <div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>Automatisch generiert vom Kantine-Verwaltungssystem</p>
          </div>
        </body>
      </html>
    `
  }

  async sendDebtReport(data: DebtReportData): Promise<EmailResult> {
    try {
      const { employees, totalDebt, reportDate, recipientEmail } = data

      const htmlContent = this.getDebtReportHTML(employees, totalDebt, reportDate, recipientEmail)

      const result = await this.resend.emails.send({
        from: "Kantine System <onboarding@resend.dev>",
        to: [recipientEmail || "kantinewache4@hotmail.com"],
        subject: `Kantine Schulden-Report - ${reportDate.toLocaleDateString("de-DE")}`,
        html: htmlContent,
      })

      return {
        success: true,
        messageId: result.data?.id,
      }
    } catch (error) {
      console.error("Email sending error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      }
    }
  }
}

export function createEmailService(): EmailService {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is required")
  }
  return new EmailService(apiKey)
}
