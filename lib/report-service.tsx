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
  const debtors = employees.filter((e) => e.balance > 0)
  const creditors = employees.filter((e) => e.balance < 0)
  const totalCredit = creditors.reduce((s, e) => s + Math.abs(e.balance), 0)

  const renderRows = (list: Employee[], isDebt: boolean) =>
    list
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .map(
        (emp) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${emp.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: ${isDebt ? "#dc2626" : "#16a34a"};">
          ${isDebt ? "" : "-"}${Math.abs(emp.balance).toFixed(2)} €
        </td>
      </tr>`,
      )
      .join("")

  return `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <title>Kantine Schulden-Report</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
      h2 { margin-top: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #f1f5f9; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
      th:last-child { text-align: right; }
    </style>
  </head>
  <body>
    <div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h1 style="margin: 0; font-size: 22px;">Kantine Schulden-Report</h1>
      ${kantineName ? `<p style="margin: 4px 0 0 0; opacity: 0.85;">${kantineName}</p>` : ""}
      <p style="margin: 4px 0 0 0; opacity: 0.75; font-size: 14px;">
        Erstellt am ${reportDate.toLocaleDateString("de-DE")} um ${reportDate.toLocaleTimeString("de-DE")}
      </p>
    </div>

    <div style="display: flex; gap: 16px; margin-bottom: 20px;">
      <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px;">
        <div style="font-size: 13px; color: #dc2626;">Gesamtschulden</div>
        <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${totalDebt.toFixed(2)} €</div>
        <div style="font-size: 12px; color: #666;">${debtors.length} Mitarbeiter</div>
      </div>
      <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px;">
        <div style="font-size: 13px; color: #16a34a;">Gesamtguthaben</div>
        <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${totalCredit.toFixed(2)} €</div>
        <div style="font-size: 12px; color: #666;">${creditors.length} Mitarbeiter</div>
      </div>
    </div>

    ${debtors.length > 0 ? `
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background: #fef2f2; padding: 12px 16px; font-weight: bold; color: #dc2626;">Offene Schulden</div>
      <table>
        <thead><tr><th>Mitarbeiter</th><th style="text-align:right;">Schulden</th></tr></thead>
        <tbody>${renderRows(debtors, true)}</tbody>
      </table>
    </div>` : ""}

    ${creditors.length > 0 ? `
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="background: #f0fdf4; padding: 12px 16px; font-weight: bold; color: #16a34a;">Guthaben</div>
      <table>
        <thead><tr><th>Mitarbeiter</th><th style="text-align:right;">Guthaben</th></tr></thead>
        <tbody>${renderRows(creditors, false)}</tbody>
      </table>
    </div>` : ""}

    <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
      Automatisch generiert vom Kantine-Verwaltungssystem
    </div>
  </body>
</html>`
}
