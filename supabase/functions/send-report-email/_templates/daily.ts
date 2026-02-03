import {
  ReportData,
  companyColors,
  getStatusColor,
  getSeverityColor,
  getStatusLabel,
  getTrendIcon,
  formatDateTime,
  formatDate
} from './base.ts';

export function generateDailyReport(data: ReportData): string {
  const colors = companyColors[data.company.companyType] || companyColors.property_halo;
  const companyColor = data.company.primaryColor || colors.primary;

  const kpiCards = data.kpis.map(kpi => `
    <td style="width: 50%; padding: 8px; vertical-align: top;">
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; border-left: 4px solid ${getStatusColor(kpi.status)};">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${kpi.label}</div>
        <div style="font-size: 24px; font-weight: 700; color: #1f2937;">${kpi.value}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; background-color: ${getStatusColor(kpi.status)}15; color: ${getStatusColor(kpi.status)};">
            ${getStatusLabel(kpi.status)}
          </span>
          ${getTrendIcon(kpi.trend)}
        </div>
      </div>
    </td>
  `);

  // Create rows of 2 KPIs each
  const kpiRows: string[] = [];
  for (let i = 0; i < kpiCards.length; i += 2) {
    kpiRows.push(`<tr>${kpiCards.slice(i, i + 2).join('')}</tr>`);
  }

  const exceptionItems = data.exceptions.length > 0 
    ? data.exceptions.slice(0, 5).map(ex => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
          <div style="display: flex; align-items: flex-start;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${getSeverityColor(ex.severity)}; margin-right: 12px; margin-top: 4px; flex-shrink: 0;"></span>
            <div style="flex: 1;">
              <div style="font-weight: 500; color: #1f2937; margin-bottom: 2px;">${ex.title}</div>
              <div style="font-size: 12px; color: #6b7280;">
                <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; background-color: ${getSeverityColor(ex.severity)}15; color: ${getSeverityColor(ex.severity)}; margin-right: 8px;">
                  ${ex.severity.toUpperCase()}
                </span>
                ${formatDate(ex.created_at)}
              </div>
            </div>
          </div>
        </td>
      </tr>
    `).join('')
    : `<tr><td style="padding: 24px; text-align: center; color: #6b7280; font-style: italic;">No open exceptions today 🎉</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.company.name} - Daily Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, ${companyColor} 0%, ${colors.secondary} 100%); padding: 24px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">${data.company.name}</div>
              <div style="font-size: 14px; color: rgba(255,255,255,0.9);">📊 Daily Report • ${formatDate(data.generated_at)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Quick Summary -->
    <tr>
      <td style="padding: 24px 32px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
        <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">TODAY'S SUMMARY</div>
        <div style="font-size: 15px; color: #4b5563; line-height: 1.6;">${data.summary}</div>
      </td>
    </tr>

    <!-- KPIs Grid -->
    <tr>
      <td style="padding: 24px 32px;">
        <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 16px;">KEY METRICS</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${kpiRows.join('')}
        </table>
      </td>
    </tr>

    <!-- Exceptions -->
    <tr>
      <td style="padding: 0 32px 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px;">
          ⚠️ ATTENTION NEEDED ${data.exceptions.length > 0 ? `(${data.exceptions.length})` : ''}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 8px; padding: 8px 16px;">
          ${exceptionItems}
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #1f2937; padding: 20px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color: #9ca3af; font-size: 12px;">
              <div style="margin-bottom: 4px;">Automated daily report from SYSTO</div>
              <div style="color: #6b7280;">Generated ${formatDateTime(data.generated_at)}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <span style="display: inline-block; padding: 4px 12px; background-color: ${companyColor}; color: #ffffff; border-radius: 4px; font-size: 11px; font-weight: 600;">SYSTO</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
</body>
</html>
  `;
}
