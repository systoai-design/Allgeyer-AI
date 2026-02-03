// Base email template utilities and shared styles

export interface CompanyBranding {
  name: string;
  primaryColor: string;
  logoUrl?: string;
  companyType: 'property_halo' | 'unique_painting' | 'ati_security';
}

export interface KpiData {
  label: string;
  value: string | number;
  status: "on_track" | "warning" | "critical";
  trend?: number;
  target?: string | number;
}

export interface ExceptionData {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  created_at: string;
  description?: string;
}

export interface ReportData {
  company: CompanyBranding;
  cadence: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  kpis: KpiData[];
  exceptions: ExceptionData[];
  summary: string;
  generated_at: string;
  period_start?: string;
  period_end?: string;
  highlights?: string[];
  insights?: string[];
}

// Company color schemes
export const companyColors: Record<string, { primary: string; secondary: string; accent: string }> = {
  property_halo: {
    primary: '#10b981',
    secondary: '#065f46',
    accent: '#34d399'
  },
  unique_painting: {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#60a5fa'
  },
  ati_security: {
    primary: '#ef4444',
    secondary: '#991b1b',
    accent: '#f87171'
  }
};

export function getStatusColor(status: string): string {
  switch (status) {
    case "on_track": return "#22c55e";
    case "warning": return "#f59e0b";
    case "critical": return "#ef4444";
    default: return "#6b7280";
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "low": return "#6b7280";
    case "medium": return "#f59e0b";
    case "high": return "#f97316";
    case "critical": return "#ef4444";
    default: return "#6b7280";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "on_track": return "ON TRACK";
    case "warning": return "WARNING";
    case "critical": return "CRITICAL";
    default: return status.toUpperCase();
  }
}

export function getTrendIcon(trend?: number): string {
  if (trend === undefined || trend === null) return "";
  if (trend > 0) return `<span style="color: #22c55e; font-weight: 600;">↑ ${trend}%</span>`;
  if (trend < 0) return `<span style="color: #ef4444; font-weight: 600;">↓ ${Math.abs(trend)}%</span>`;
  return `<span style="color: #6b7280;">→ 0%</span>`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function getCadenceTitle(cadence: string): string {
  const titles: Record<string, string> = {
    daily: 'Daily Report',
    weekly: 'Weekly Summary',
    monthly: 'Monthly Review',
    quarterly: 'Quarterly Analysis'
  };
  return titles[cadence] || 'Report';
}

export function getCadenceIcon(cadence: string): string {
  const icons: Record<string, string> = {
    daily: '📊',
    weekly: '📈',
    monthly: '📋',
    quarterly: '🎯'
  };
  return icons[cadence] || '📊';
}
