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

export function generateWeeklyReport(data: ReportData): string {
  const colors = companyColors[data.company.companyType] || companyColors.property_halo;
  const companyColor = data.company.primaryColor || colors.primary;

  const periodDisplay = data.period_start && data.period_end 
    ? `${formatDate(data.period_start)} - ${formatDate(data.period_end)}`
    : `Week of ${formatDate(data.generated_at)}`;

  const kpiTable = data.kpis.map(kpi => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; color: #1f2937;">${kpi.label}</div>
        ${kpi.target ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">Target: ${kpi.target}</div>` : ''}
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        <div style="font-size: 20px; font-weight: 700; color: #1f2937;">${kpi.value}</div>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${getStatusColor(kpi.status)}15; color: ${getStatusColor(kpi.status)};">
          ${getStatusLabel(kpi.status)}
        </span>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px;">
        ${getTrendIcon(kpi.trend)}
      </td>
    </tr>
  `).join('');

  const highlightsList = data.highlights && data.highlights.length > 0
    ? data.highlights.map(h => `
      <li style="padding: 8px 0; color: #374151; border-bottom: 1px solid #f3f4f6;">
        <span style="color: #22c55e; margin-right: 8px;">✓</span> ${h}
      </li>
    `).join('')
    : '<li style="padding: 8px 0; color: #6b7280; font-style: italic;">No highlights this week</li>';

  const exceptionSummary = data.exceptions.length > 0 ? `
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <div style="font-weight: 600; color: #92400e; margin-bottom: 8px;">⚠️ ${data.exceptions.length} Open Exception${data.exceptions.length > 1 ? 's' : ''}</div>
      <div style="font-size: 13px; color: #a16207;">
        ${data.exceptions.filter(e => e.severity === 'critical').length > 0 
          ? `<span style="color: #dc2626; font-weight: 600;">${data.exceptions.filter(e => e.severity === 'critical').length} Critical</span> • ` 
          : ''}
        ${data.exceptions.filter(e => e.severity === 'high').length > 0 
          ? `<span style="color: #ea580c; font-weight: 600;">${data.exceptions.filter(e => e.severity === 'high').length} High</span> • ` 
          : ''}
        ${data.exceptions.filter(e => e.severity === 'medium').length > 0 
          ? `${data.exceptions.filter(e => e.severity === 'medium').length} Medium • ` 
          : ''}
        ${data.exceptions.filter(e => e.severity === 'low').length > 0 
          ? `${data.exceptions.filter(e => e.severity === 'low').length} Low` 
          : ''}
      </div>
    </div>
  ` : `
    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <div style="font-weight: 600; color: #065f46;">✅ No Open Exceptions</div>
      <div style="font-size: 13px; color: #047857;">All items have been resolved this week</div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.company.name} - Weekly Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 680px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, ${companyColor} 0%, ${colors.secondary} 100%); padding: 32px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">${data.company.name}</div>
              <div style="font-size: 16px; color: rgba(255,255,255,0.9);">📈 Weekly Summary</div>
              <div style="font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 4px;">${periodDisplay}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div style="display: inline-block; padding: 8px 16px; background-color: rgba(255,255,255,0.2); border-radius: 6px; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                Week ${getWeekNumber(new Date(data.generated_at))}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Executive Summary -->
    <tr>
      <td style="padding: 32px 40px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Executive Summary</div>
        <div style="font-size: 16px; color: #374151; line-height: 1.7;">${data.summary}</div>
      </td>
    </tr>

    <!-- Exception Alert -->
    <tr>
      <td style="padding: 24px 40px 0;">
        ${exceptionSummary}
      </td>
    </tr>

    <!-- KPI Table -->
    <tr>
      <td style="padding: 24px 40px;">
        <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">Performance Metrics</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Metric</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Value</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Status</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">vs Last Week</th>
            </tr>
          </thead>
          <tbody>
            ${kpiTable}
          </tbody>
        </table>
      </td>
    </tr>

    <!-- Highlights -->
    <tr>
      <td style="padding: 0 40px 32px;">
        <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Week Highlights</div>
        <ul style="margin: 0; padding: 0; list-style: none; background-color: #f9fafb; border-radius: 8px; padding: 8px 16px;">
          ${highlightsList}
        </ul>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #1f2937; padding: 24px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color: #9ca3af; font-size: 12px;">
              <div style="margin-bottom: 4px;">Automated weekly report from SYSTO</div>
              <div style="color: #6b7280;">Generated ${formatDateTime(data.generated_at)}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <span style="display: inline-block; padding: 6px 16px; background-color: ${companyColor}; color: #ffffff; border-radius: 4px; font-size: 12px; font-weight: 600;">SYSTO</span>
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

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
