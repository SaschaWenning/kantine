interface Employee {
  id: string
  name: string
  balance: number
}

export function getDebtReportHTML(
  employees: Employee[],
  totalDebt: number,
  reportDate: Date,
  kantineName?: string,
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
        <div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">Kantine Schulden-Report</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${kantineName ? `Kantine: ${kantineName}` : ""}</p>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Erstellt am: ${reportDate.toLocaleDateString("de-DE")} um ${reportDate.toLocaleTimeString("de-DE")}</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">Zusammenfassung</h2>
          <p style="font-size: 18px; margin: 10px 0;">
            <strong>Gesamtschulden: ${totalDebt.toFixed(2)} €</strong>
          </p>
          <p style="margin: 5px 0;">Anzahl Mitarbeiter mit Schulden: ${employees.length}</p>
        </div>

        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <h3 style="background: #f1f5f9; margin: 0; padding: 15px; color: #1e293b;">Mitarbeiter-Schulden</h3>
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

        <div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>Automatisch generiert vom Kantine-Verwaltungssystem</p>
        </div>
      </body>
    </html>
  `
}
