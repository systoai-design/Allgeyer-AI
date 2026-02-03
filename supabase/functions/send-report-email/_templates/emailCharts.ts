// Email-safe chart generation utilities
// These generate HTML table-based charts that work in email clients

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

export interface TrendData {
  period: string;
  value: number;
}

// Generate a horizontal bar chart using HTML tables
export function generateHtmlBarChart(
  data: BarChartData[],
  options: {
    title?: string;
    maxWidth?: number;
    barHeight?: number;
    primaryColor?: string;
  } = {}
): string {
  const { title, maxWidth = 200, barHeight = 20, primaryColor = '#3b82f6' } = options;
  const maxValue = Math.max(...data.map(d => d.value), 1);

  const bars = data.map(item => {
    const widthPercent = Math.round((item.value / maxValue) * 100);
    const barColor = item.color || primaryColor;
    
    return `
      <tr>
        <td style="padding: 6px 12px 6px 0; font-size: 12px; color: #6b7280; white-space: nowrap; width: 80px;">${item.label}</td>
        <td style="padding: 6px 0; width: ${maxWidth}px;">
          <div style="background-color: #f3f4f6; border-radius: 4px; height: ${barHeight}px; width: 100%;">
            <div style="background-color: ${barColor}; border-radius: 4px; height: ${barHeight}px; width: ${widthPercent}%;"></div>
          </div>
        </td>
        <td style="padding: 6px 0 6px 12px; font-size: 13px; font-weight: 600; color: #1f2937; text-align: right;">${item.value}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="margin-bottom: 20px;">
      ${title ? `<div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">${title}</div>` : ''}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${bars}
      </table>
    </div>
  `;
}

// Generate a simple trend sparkline using ASCII-like blocks
export function generateTrendSparkline(
  data: TrendData[],
  options: {
    primaryColor?: string;
    height?: number;
  } = {}
): string {
  const { primaryColor = '#3b82f6', height = 40 } = options;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  const barWidth = Math.floor(100 / data.length);
  
  const bars = data.map((item, index) => {
    const barHeight = Math.round(((item.value - minValue) / range) * height);
    const isLast = index === data.length - 1;
    
    return `
      <td style="vertical-align: bottom; padding: 0 1px; width: ${barWidth}%;">
        <div style="background-color: ${isLast ? primaryColor : '#93c5fd'}; height: ${Math.max(barHeight, 4)}px; border-radius: 2px 2px 0 0;"></div>
      </td>
    `;
  }).join('');

  const labels = data.map(item => `
    <td style="text-align: center; font-size: 10px; color: #9ca3af; padding-top: 4px;">${item.period}</td>
  `).join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="height: ${height + 20}px;">
      <tr style="height: ${height}px;">
        ${bars}
      </tr>
      <tr>
        ${labels}
      </tr>
    </table>
  `;
}

// Generate a status distribution indicator (colored blocks)
export function generateStatusIndicator(
  onTrack: number,
  warning: number,
  critical: number
): string {
  const total = onTrack + warning + critical || 1;
  const onTrackPercent = Math.round((onTrack / total) * 100);
  const warningPercent = Math.round((warning / total) * 100);
  const criticalPercent = Math.round((critical / total) * 100);

  return `
    <div style="margin: 16px 0;">
      <div style="display: flex; border-radius: 6px; overflow: hidden; height: 12px; background-color: #f3f4f6;">
        ${onTrackPercent > 0 ? `<div style="width: ${onTrackPercent}%; background-color: #22c55e; height: 12px;"></div>` : ''}
        ${warningPercent > 0 ? `<div style="width: ${warningPercent}%; background-color: #f59e0b; height: 12px;"></div>` : ''}
        ${criticalPercent > 0 ? `<div style="width: ${criticalPercent}%; background-color: #ef4444; height: 12px;"></div>` : ''}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 8px;">
        <tr>
          <td style="font-size: 11px; color: #22c55e;">● ${onTrack} On Track</td>
          <td style="font-size: 11px; color: #f59e0b; text-align: center;">● ${warning} Warning</td>
          <td style="font-size: 11px; color: #ef4444; text-align: right;">● ${critical} Critical</td>
        </tr>
      </table>
    </div>
  `;
}

// Generate a mini donut chart using CSS (works in modern email clients)
export function generateMiniDonutChart(
  value: number,
  total: number,
  options: {
    label?: string;
    color?: string;
    size?: number;
  } = {}
): string {
  const { label = '', color = '#3b82f6', size = 60 } = options;
  const percent = Math.round((value / (total || 1)) * 100);
  const remaining = 100 - percent;

  // Use a simple circular progress indicator
  return `
    <div style="text-align: center;">
      <div style="display: inline-block; position: relative; width: ${size}px; height: ${size}px;">
        <div style="
          width: ${size}px; 
          height: ${size}px; 
          border-radius: 50%; 
          background: conic-gradient(${color} 0% ${percent}%, #e5e7eb ${percent}% 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: ${size - 16}px; 
            height: ${size - 16}px; 
            border-radius: 50%; 
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 700;
            color: #1f2937;
          ">${percent}%</div>
        </div>
      </div>
      ${label ? `<div style="font-size: 11px; color: #6b7280; margin-top: 6px;">${label}</div>` : ''}
    </div>
  `;
}
