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
import { generateHtmlBarChart, generateStatusIndicator, generateMiniDonutChart } from './emailCharts.ts';

export function generateMonthlyReport(data: ReportData): string {
  const colors = companyColors[data.company.companyType] || companyColors.property_halo;
  const companyColor = data.company.primaryColor || colors.primary;

  const monthName = new Date(data.generated_at).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Group KPIs by status
  const criticalKpis = data.kpis.filter(k => k.status === 'critical');
  const warningKpis = data.kpis.filter(k => k.status === 'warning');
  const onTrackKpis = data.kpis.filter(k => k.status === 'on_track');

  const statusSummary = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
      <tr>
        <td style="width: 33.33%; padding: 0 8px 0 0;">
          <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; padding: 20px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #166534;">${onTrackKpis.length}</div>
            <div style="font-size: 12px; color: #15803d; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">On Track</div>
          </div>
        </td>
        <td style="width: 33.33%; padding: 0 4px;">
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #a16207;">${warningKpis.length}</div>
            <div style="font-size: 12px; color: #b45309; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Warning</div>
          </div>
        </td>
        <td style="width: 33.33%; padding: 0 0 0 8px;">
          <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 8px; padding: 20px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #dc2626;">${criticalKpis.length}</div>
            <div style="font-size: 12px; color: #b91c1c; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Critical</div>
          </div>
        </td>
      </tr>
    </table>
  `;

  const kpiDetailRows = data.kpis.map(kpi => `
    <tr>
      <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff;">
        <div style="display: flex; align-items: center;">
          <span style="display: inline-block; width: 4px; height: 40px; border-radius: 2px; background-color: ${getStatusColor(kpi.status)}; margin-right: 16px;"></span>
          <div>
            <div style="font-weight: 600; color: #1f2937; font-size: 15px;">${kpi.label}</div>
            ${kpi.target ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">Target: ${kpi.target}</div>` : ''}
          </div>
        </div>
      </td>
      <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right; background-color: #ffffff;">
        <div style="font-size: 22px; font-weight: 700; color: #1f2937;">${kpi.value}</div>
      </td>
      <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: center; background-color: #ffffff;">
        ${getTrendIcon(kpi.trend)}
      </td>
      <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right; background-color: #ffffff;">
        <span style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${getStatusColor(kpi.status)}; color: #ffffff;">
          ${getStatusLabel(kpi.status)}
        </span>
      </td>
    </tr>
  `).join('');

  const insightsList = data.insights && data.insights.length > 0
    ? data.insights.map((insight, i) => `
      <div style="padding: 16px; background-color: ${i % 2 === 0 ? '#f9fafb' : '#ffffff'}; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: flex-start;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: ${companyColor}; color: #ffffff; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0;">${i + 1}</span>
          <div style="color: #374151; font-size: 14px; line-height: 1.6;">${insight}</div>
        </div>
      </div>
    `).join('')
    : '';

  const exceptionBreakdown = data.exceptions.length > 0 ? `
    <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #fecaca;">
      <div style="font-weight: 600; color: #991b1b; margin-bottom: 12px; font-size: 14px;">⚠️ Exception Summary</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size: 13px; color: #7f1d1d; padding: 4px 0;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #ef4444; margin-right: 8px;"></span>
            Critical: <strong>${data.exceptions.filter(e => e.severity === 'critical').length}</strong>
          </td>
          <td style="font-size: 13px; color: #7f1d1d; padding: 4px 0;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #f97316; margin-right: 8px;"></span>
            High: <strong>${data.exceptions.filter(e => e.severity === 'high').length}</strong>
          </td>
          <td style="font-size: 13px; color: #7f1d1d; padding: 4px 0;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #f59e0b; margin-right: 8px;"></span>
            Medium: <strong>${data.exceptions.filter(e => e.severity === 'medium').length}</strong>
          </td>
          <td style="font-size: 13px; color: #7f1d1d; padding: 4px 0;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #6b7280; margin-right: 8px;"></span>
            Low: <strong>${data.exceptions.filter(e => e.severity === 'low').length}</strong>
          </td>
        </tr>
      </table>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.company.name} - Monthly Review</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, ${companyColor} 0%, ${colors.secondary} 100%); padding: 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="font-size: 14px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Monthly Review</div>
              <div style="font-size: 32px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">${data.company.name}</div>
              <div style="font-size: 18px; color: rgba(255,255,255,0.9);">📋 ${monthName}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Executive Summary -->
    <tr>
      <td style="padding: 40px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">Executive Summary</div>
        <div style="font-size: 17px; color: #374151; line-height: 1.8;">${data.summary}</div>
      </td>
    </tr>

    <!-- Status Overview -->
    <tr>
      <td style="padding: 40px 40px 24px;">
        <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Performance Overview</div>
        ${statusSummary}
        ${exceptionBreakdown}
      </td>
    </tr>

    <!-- Visual Charts -->
    <tr>
      <td style="padding: 0 40px 24px;">
        <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">📊 Performance Charts</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 60%; vertical-align: top; padding-right: 16px;">
              ${generateHtmlBarChart(
                data.kpis.map(k => ({
                  label: k.label.length > 18 ? k.label.substring(0, 18) + '...' : k.label,
                  value: typeof k.value === 'number' ? k.value : parseInt(String(k.value).replace(/[^0-9]/g, '')) || 0,
                  color: getStatusColor(k.status)
                })),
                { title: 'KPI Values', primaryColor: companyColor, maxWidth: 180 }
              )}
            </td>
            <td style="width: 40%; vertical-align: top; padding-left: 16px;">
              <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Status Distribution</div>
              ${generateStatusIndicator(
                data.kpis.filter(k => k.status === 'on_track').length,
                data.kpis.filter(k => k.status === 'warning').length,
                data.kpis.filter(k => k.status === 'critical').length
              )}
              <div style="margin-top: 20px;">
                ${generateMiniDonutChart(
                  data.kpis.filter(k => k.status === 'on_track').length,
                  data.kpis.length,
                  { label: 'On Track Rate', color: companyColor }
                )}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Detailed KPIs -->
    <tr>
      <td style="padding: 0 40px 40px;">
        <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">Detailed Metrics</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 14px 20px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Metric</th>
              <th style="padding: 14px 20px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Value</th>
              <th style="padding: 14px 20px; text-align: center; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Trend</th>
              <th style="padding: 14px 20px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${kpiDetailRows}
          </tbody>
        </table>
      </td>
    </tr>

    ${insightsList ? `
    <!-- Key Insights -->
    <tr>
      <td style="padding: 0 40px 40px;">
        <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px;">💡 Key Insights</div>
        <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          ${insightsList}
        </div>
      </td>
    </tr>
    ` : ''}

    <!-- Footer -->
    <tr>
      <td style="background-color: #1f2937; padding: 32px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color: #9ca3af; font-size: 13px;">
              <div style="font-weight: 600; color: #ffffff; margin-bottom: 4px;">SYSTO Automation Platform</div>
              <div style="margin-bottom: 2px;">Monthly report generated automatically</div>
              <div style="color: #6b7280; font-size: 12px;">${formatDateTime(data.generated_at)}</div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span style="display: inline-block; padding: 8px 20px; background-color: ${companyColor}; color: #ffffff; border-radius: 6px; font-size: 13px; font-weight: 600;">SYSTO</span>
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
