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

export function generateQuarterlyReport(data: ReportData): string {
  const colors = companyColors[data.company.companyType] || companyColors.property_halo;
  const companyColor = data.company.primaryColor || colors.primary;

  const date = new Date(data.generated_at);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const year = date.getFullYear();
  const quarterDisplay = `Q${quarter} ${year}`;

  // Calculate performance score (simplified)
  const totalKpis = data.kpis.length;
  const onTrackCount = data.kpis.filter(k => k.status === 'on_track').length;
  const warningCount = data.kpis.filter(k => k.status === 'warning').length;
  const criticalCount = data.kpis.filter(k => k.status === 'critical').length;
  const performanceScore = totalKpis > 0 
    ? Math.round(((onTrackCount * 100 + warningCount * 50 + criticalCount * 0) / (totalKpis * 100)) * 100) 
    : 0;

  const scoreColor = performanceScore >= 80 ? '#22c55e' : performanceScore >= 60 ? '#f59e0b' : '#ef4444';

  const heroSection = `
    <tr>
      <td style="padding: 48px 48px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px;">Overall Performance Score</div>
        <div style="display: inline-block; width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(${scoreColor} ${performanceScore}%, #e5e7eb ${performanceScore}%); padding: 8px; margin-bottom: 16px;">
          <div style="width: 100%; height: 100%; border-radius: 50%; background-color: #ffffff; display: flex; align-items: center; justify-content: center;">
            <div>
              <div style="font-size: 36px; font-weight: 800; color: #1f2937;">${performanceScore}</div>
              <div style="font-size: 12px; color: #6b7280;">/ 100</div>
            </div>
          </div>
        </div>
        <div style="max-width: 480px; margin: 0 auto;">
          <div style="font-size: 15px; color: #4b5563; line-height: 1.7;">${data.summary}</div>
        </div>
      </td>
    </tr>
  `;

  const kpiCards = data.kpis.map(kpi => `
    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 16px; border-left: 4px solid ${getStatusColor(kpi.status)};">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <div style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${kpi.label}</div>
          <div style="font-size: 28px; font-weight: 700; color: #1f2937;">${kpi.value}</div>
        </div>
        <span style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${getStatusColor(kpi.status)}; color: #ffffff;">
          ${getStatusLabel(kpi.status)}
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f3f4f6;">
        ${kpi.target ? `<div style="font-size: 13px; color: #9ca3af;">Target: <span style="color: #374151; font-weight: 500;">${kpi.target}</span></div>` : '<div></div>'}
        <div style="font-size: 14px;">${getTrendIcon(kpi.trend)}</div>
      </div>
    </div>
  `).join('');

  const quarterlyHighlights = data.highlights && data.highlights.length > 0
    ? data.highlights.map((h, i) => `
      <div style="display: flex; align-items: flex-start; padding: 16px 0; ${i < data.highlights!.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
        <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: #dcfce7; margin-right: 16px; flex-shrink: 0;">
          <span style="color: #22c55e; font-size: 16px;">✓</span>
        </span>
        <div style="color: #374151; font-size: 15px; line-height: 1.6; padding-top: 4px;">${h}</div>
      </div>
    `).join('')
    : '';

  const quarterlyInsights = data.insights && data.insights.length > 0
    ? data.insights.map((insight, i) => `
      <div style="display: flex; align-items: flex-start; padding: 16px 0; ${i < data.insights!.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
        <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: ${companyColor}15; margin-right: 16px; flex-shrink: 0;">
          <span style="color: ${companyColor}; font-size: 14px; font-weight: 700;">${i + 1}</span>
        </span>
        <div style="color: #374151; font-size: 15px; line-height: 1.6; padding-top: 4px;">${insight}</div>
      </div>
    `).join('')
    : '';

  const exceptionAnalysis = data.exceptions.length > 0 ? `
    <tr>
      <td style="padding: 0 48px 40px;">
        <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">⚠️ Exception Analysis</div>
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: 700; color: #1f2937;">${data.exceptions.length}</div>
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Open</div>
            </div>
            <div style="text-align: center; flex: 1; border-left: 1px solid #fde68a; border-right: 1px solid #fde68a;">
              <div style="font-size: 28px; font-weight: 700; color: #dc2626;">${data.exceptions.filter(e => e.severity === 'critical' || e.severity === 'high').length}</div>
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">High Priority</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${data.exceptions.filter(e => e.severity === 'medium' || e.severity === 'low').length}</div>
              <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Lower Priority</div>
            </div>
          </div>
          <div style="font-size: 13px; color: #92400e; line-height: 1.6;">
            ${data.exceptions.filter(e => e.severity === 'critical').length > 0 
              ? `<strong>${data.exceptions.filter(e => e.severity === 'critical').length} critical exception${data.exceptions.filter(e => e.severity === 'critical').length > 1 ? 's' : ''}</strong> require${data.exceptions.filter(e => e.severity === 'critical').length === 1 ? 's' : ''} immediate attention. ` 
              : ''}
            Review and resolve open items to improve next quarter's performance score.
          </div>
        </div>
      </td>
    </tr>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.company.name} - ${quarterDisplay} Analysis</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 720px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.15);">
    
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, ${companyColor} 0%, ${colors.secondary} 100%); padding: 48px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; padding: 8px 20px; background-color: rgba(255,255,255,0.2); border-radius: 6px; color: #ffffff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                Quarterly Analysis
              </div>
              <div style="font-size: 36px; font-weight: 800; color: #ffffff; margin-bottom: 8px;">${data.company.name}</div>
              <div style="font-size: 20px; color: rgba(255,255,255,0.9);">🎯 ${quarterDisplay}</div>
              ${data.period_start && data.period_end ? `
                <div style="font-size: 14px; color: rgba(255,255,255,0.7); margin-top: 8px;">
                  ${formatDate(data.period_start)} – ${formatDate(data.period_end)}
                </div>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Performance Score -->
    ${heroSection}

    <!-- KPI Cards -->
    <tr>
      <td style="padding: 40px 48px;">
        <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px;">Key Performance Indicators</div>
        ${kpiCards}
      </td>
    </tr>

    ${exceptionAnalysis}

    ${quarterlyHighlights ? `
    <!-- Quarterly Achievements -->
    <tr>
      <td style="padding: 0 48px 40px;">
        <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">✨ Quarter Achievements</div>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 8px 24px;">
          ${quarterlyHighlights}
        </div>
      </td>
    </tr>
    ` : ''}

    ${quarterlyInsights ? `
    <!-- Strategic Insights -->
    <tr>
      <td style="padding: 0 48px 40px;">
        <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">💡 Strategic Insights</div>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px 24px;">
          ${quarterlyInsights}
        </div>
      </td>
    </tr>
    ` : ''}

    <!-- Footer -->
    <tr>
      <td style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 40px 48px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; padding: 10px 24px; background-color: ${companyColor}; color: #ffffff; border-radius: 8px; font-size: 14px; font-weight: 600; margin-bottom: 16px;">SYSTO</div>
              <div style="color: #9ca3af; font-size: 14px; margin-bottom: 4px;">Quarterly Report Generated Automatically</div>
              <div style="color: #6b7280; font-size: 12px;">${formatDateTime(data.generated_at)}</div>
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
