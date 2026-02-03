// CSV Export utility functions

export function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T | string; header: string; formatter?: (row: T) => string }[]
): string {
  if (data.length === 0) return '';

  // Header row
  const headers = columns.map(col => escapeCSVValue(col.header)).join(',');

  // Data rows
  const rows = data.map(row => {
    return columns.map(col => {
      if (col.formatter) {
        return escapeCSVValue(col.formatter(row));
      }
      const value = row[col.key as keyof T];
      return escapeCSVValue(value as string | number | null);
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Pre-configured export functions
export function exportEmailLogs(
  emails: Array<{
    subject: string;
    cadence: string;
    delivery_status: string;
    sent_at: string | null;
    created_at: string;
    recipients: { to?: string[]; cc?: string[] } | null;
  }>,
  companyName: string
) {
  const csv = convertToCSV(emails, [
    { key: 'subject', header: 'Subject' },
    { key: 'cadence', header: 'Cadence' },
    { key: 'delivery_status', header: 'Status' },
    { 
      key: 'recipients', 
      header: 'Recipients', 
      formatter: (row) => row.recipients?.to?.join('; ') || '' 
    },
    { 
      key: 'sent_at', 
      header: 'Sent At',
      formatter: (row) => row.sent_at ? new Date(row.sent_at).toLocaleString() : ''
    },
    { 
      key: 'created_at', 
      header: 'Created At',
      formatter: (row) => new Date(row.created_at).toLocaleString()
    },
  ]);
  
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `${companyName.toLowerCase().replace(/\s+/g, '-')}-email-logs-${date}`);
}

export function exportExceptions(
  exceptions: Array<{
    title: string;
    exception_type: string;
    severity: string;
    status: string;
    description?: string | null;
    created_at: string;
    resolved_at?: string | null;
    bot_name?: string;
  }>,
  companyName: string
) {
  const csv = convertToCSV(exceptions, [
    { key: 'title', header: 'Title' },
    { key: 'exception_type', header: 'Type' },
    { key: 'severity', header: 'Severity' },
    { key: 'status', header: 'Status' },
    { key: 'bot_name', header: 'Bot' },
    { key: 'description', header: 'Description' },
    { 
      key: 'created_at', 
      header: 'Created',
      formatter: (row) => new Date(row.created_at).toLocaleString()
    },
    { 
      key: 'resolved_at', 
      header: 'Resolved',
      formatter: (row) => row.resolved_at ? new Date(row.resolved_at).toLocaleString() : ''
    },
  ]);
  
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `${companyName.toLowerCase().replace(/\s+/g, '-')}-exceptions-${date}`);
}

export function exportKPIData(
  kpiData: Array<{
    kpi_name: string;
    kpi_value: number | null;
    kpi_status: string | null;
    cadence: string;
    period_start: string;
    period_end: string;
  }>,
  companyName: string
) {
  const csv = convertToCSV(kpiData, [
    { key: 'kpi_name', header: 'KPI Name' },
    { 
      key: 'kpi_value', 
      header: 'Value',
      formatter: (row) => row.kpi_value?.toString() || ''
    },
    { key: 'kpi_status', header: 'Status' },
    { key: 'cadence', header: 'Cadence' },
    { 
      key: 'period_start', 
      header: 'Period Start',
      formatter: (row) => new Date(row.period_start).toLocaleDateString()
    },
    { 
      key: 'period_end', 
      header: 'Period End',
      formatter: (row) => new Date(row.period_end).toLocaleDateString()
    },
  ]);
  
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `${companyName.toLowerCase().replace(/\s+/g, '-')}-kpi-history-${date}`);
}
