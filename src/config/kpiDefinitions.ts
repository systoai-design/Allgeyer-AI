import {
  Users,
  Phone,
  Calendar,
  FileCheck,
  Building2,
  DollarSign,
  TrendingUp,
  Briefcase,
  PiggyBank,
  CreditCard,
  AlertCircle,
  ClipboardList,
  Hammer,
  Percent,
  Target,
  ShieldCheck,
  Wrench,
  BarChart3,
  Wallet,
  LucideIcon
} from 'lucide-react';
import type { CompanyType, CadenceType, KpiStatus } from '@/types/database';

export interface KpiDefinition {
  key: string;
  label: string;
  icon: LucideIcon;
  format: 'number' | 'currency' | 'percent';
  trendLabel: string;
}

export interface KpiValue {
  value: number | string;
  trend: number;
  status: KpiStatus;
}

// Financial Control Bot KPIs (applies to all companies)
export const financialControlKpis: Record<CadenceType, KpiDefinition[]> = {
  daily: [
    { key: 'uncategorized_transactions', label: 'Uncategorized Transactions', icon: AlertCircle, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'duplicate_flags', label: 'Duplicate Flags', icon: ClipboardList, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'incomplete_transactions', label: 'Incomplete Transactions', icon: FileCheck, format: 'number', trendLabel: 'vs yesterday' },
  ],
  weekly: [
    { key: 'cash_position', label: 'Cash Position', icon: Wallet, format: 'currency', trendLabel: 'vs last week' },
    { key: 'unresolved_items', label: 'Unresolved Items', icon: AlertCircle, format: 'number', trendLabel: 'vs last week' },
  ],
  monthly: [
    { key: 'net_income', label: 'Net Income (P&L)', icon: DollarSign, format: 'currency', trendLabel: 'vs last month' },
    { key: 'assets_bought', label: 'Assets Bought', icon: Building2, format: 'number', trendLabel: 'this month' },
    { key: 'assets_sold', label: 'Assets Sold', icon: Building2, format: 'number', trendLabel: 'this month' },
    { key: 'recurring_expenses', label: 'Recurring Expenses', icon: CreditCard, format: 'currency', trendLabel: 'vs last month' },
  ],
  quarterly: [
    { key: 'net_worth', label: 'Net Worth', icon: PiggyBank, format: 'currency', trendLabel: 'vs last quarter' },
    { key: 'investment_total', label: 'Investment Summary', icon: TrendingUp, format: 'currency', trendLabel: 'vs last quarter' },
    { key: 'credit_utilization', label: 'Credit Utilization', icon: CreditCard, format: 'percent', trendLabel: 'vs last quarter' },
  ],
};

// Property Halo KPIs
export const propertyHaloKpis: Record<CadenceType, KpiDefinition[]> = {
  daily: [
    { key: 'leads', label: 'Leads', icon: Users, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'appointments', label: 'Appointments', icon: Calendar, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'calls', label: 'Calls Made', icon: Phone, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'offers_made', label: 'Offers Made', icon: FileCheck, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'offers_accepted', label: 'Offers Accepted', icon: Target, format: 'number', trendLabel: 'vs yesterday' },
  ],
  weekly: [
    { key: 'contracts_in_pipeline', label: 'Contracts in Pipeline', icon: Briefcase, format: 'number', trendLabel: 'vs last week' },
    { key: 'pipeline_value', label: 'Pipeline Value', icon: DollarSign, format: 'currency', trendLabel: 'vs last week' },
    { key: 'cash_position', label: 'Cash Position', icon: Wallet, format: 'currency', trendLabel: 'vs last week' },
  ],
  monthly: [
    { key: 'closings', label: 'Closings', icon: Building2, format: 'number', trendLabel: 'vs last month' },
    { key: 'revenue', label: 'Revenue', icon: DollarSign, format: 'currency', trendLabel: 'vs last month' },
    { key: 'profit', label: 'Profit', icon: TrendingUp, format: 'currency', trendLabel: 'vs last month' },
    { key: 'assets_bought', label: 'Assets Bought', icon: Building2, format: 'number', trendLabel: 'this month' },
    { key: 'assets_sold', label: 'Assets Sold', icon: Building2, format: 'number', trendLabel: 'this month' },
  ],
  quarterly: [
    { key: 'roi', label: 'ROI', icon: TrendingUp, format: 'percent', trendLabel: 'vs last quarter' },
    { key: 'capital_deployed', label: 'Capital Deployed', icon: DollarSign, format: 'currency', trendLabel: 'vs last quarter' },
    { key: 'portfolio_valuation', label: 'Portfolio Valuation', icon: Building2, format: 'currency', trendLabel: 'vs last quarter' },
  ],
};

// Unique Painting KPIs
export const uniquePaintingKpis: Record<CadenceType, KpiDefinition[]> = {
  daily: [
    { key: 'leads', label: 'Leads', icon: Users, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'estimates_sent', label: 'Estimates Sent', icon: FileCheck, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'jobs_completed', label: 'Jobs Completed', icon: Hammer, format: 'number', trendLabel: 'vs yesterday' },
  ],
  weekly: [
    { key: 'jobs_sold', label: 'Jobs Sold', icon: Target, format: 'number', trendLabel: 'vs last week' },
    { key: 'revenue_booked', label: 'Revenue Booked', icon: DollarSign, format: 'currency', trendLabel: 'vs last week' },
    { key: 'cash_available', label: 'Cash Available', icon: Wallet, format: 'currency', trendLabel: 'vs last week' },
  ],
  monthly: [
    { key: 'profit_per_job', label: 'Profit per Job', icon: DollarSign, format: 'currency', trendLabel: 'vs last month' },
    { key: 'crew_utilization', label: 'Crew Utilization', icon: Percent, format: 'percent', trendLabel: 'vs last month' },
    { key: 'total_revenue', label: 'Total Revenue', icon: TrendingUp, format: 'currency', trendLabel: 'vs last month' },
  ],
  quarterly: [
    { key: 'revenue_growth', label: 'Revenue Growth', icon: TrendingUp, format: 'percent', trendLabel: 'vs last quarter' },
    { key: 'margin_trend', label: 'Margin Trend', icon: BarChart3, format: 'percent', trendLabel: 'vs last quarter' },
    { key: 'customer_acquisition_cost', label: 'Customer Acquisition Cost', icon: Users, format: 'currency', trendLabel: 'vs last quarter' },
  ],
};

// ATI Security KPIs
export const atiSecurityKpis: Record<CadenceType, KpiDefinition[]> = {
  daily: [
    { key: 'leads', label: 'Leads', icon: Users, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'estimates', label: 'Estimates', icon: FileCheck, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'active_projects', label: 'Active Projects', icon: Briefcase, format: 'number', trendLabel: 'vs yesterday' },
    { key: 'installations_completed', label: 'Installations Completed', icon: ShieldCheck, format: 'number', trendLabel: 'vs yesterday' },
  ],
  weekly: [
    { key: 'contracts_signed', label: 'Contracts Signed', icon: FileCheck, format: 'number', trendLabel: 'vs last week' },
    { key: 'pipeline_value', label: 'Pipeline Value', icon: DollarSign, format: 'currency', trendLabel: 'vs last week' },
  ],
  monthly: [
    { key: 'revenue', label: 'Revenue', icon: DollarSign, format: 'currency', trendLabel: 'vs last month' },
    { key: 'gross_margin', label: 'Gross Margin', icon: Percent, format: 'percent', trendLabel: 'vs last month' },
    { key: 'recurring_revenue', label: 'Recurring Revenue', icon: TrendingUp, format: 'currency', trendLabel: 'vs last month' },
    { key: 'project_revenue', label: 'Project Revenue', icon: Briefcase, format: 'currency', trendLabel: 'vs last month' },
  ],
  quarterly: [
    { key: 'contract_backlog', label: 'Contract Backlog', icon: ClipboardList, format: 'currency', trendLabel: 'vs last quarter' },
    { key: 'avg_deal_size', label: 'Avg Deal Size', icon: Target, format: 'currency', trendLabel: 'vs last quarter' },
    { key: 'client_concentration', label: 'Client Concentration', icon: Users, format: 'percent', trendLabel: 'top 3 clients' },
  ],
};

// Get KPIs for a specific company type
export function getCompanyKpis(companyType: CompanyType): Record<CadenceType, KpiDefinition[]> {
  switch (companyType) {
    case 'property_halo':
      return propertyHaloKpis;
    case 'unique_painting':
      return uniquePaintingKpis;
    case 'ati_security':
      return atiSecurityKpis;
    default:
      return propertyHaloKpis;
  }
}

// Mock data generator for demonstration
export function getMockKpiValues(companyType: CompanyType, cadence: CadenceType): Record<string, KpiValue> {
  const mockData: Record<string, KpiValue> = {};
  
  // Property Halo mock data
  if (companyType === 'property_halo') {
    if (cadence === 'daily') {
      mockData.leads = { value: 12, trend: 20, status: 'on_track' };
      mockData.appointments = { value: 5, trend: -10, status: 'warning' };
      mockData.calls = { value: 34, trend: 8, status: 'on_track' };
      mockData.offers_made = { value: 3, trend: 50, status: 'on_track' };
      mockData.offers_accepted = { value: 1, trend: 0, status: 'on_track' };
    } else if (cadence === 'weekly') {
      mockData.contracts_in_pipeline = { value: 8, trend: 14, status: 'on_track' };
      mockData.pipeline_value = { value: 1250000, trend: 22, status: 'on_track' };
      mockData.cash_position = { value: 485000, trend: -5, status: 'warning' };
    } else if (cadence === 'monthly') {
      mockData.closings = { value: 4, trend: 33, status: 'on_track' };
      mockData.revenue = { value: 892000, trend: 18, status: 'on_track' };
      mockData.profit = { value: 156000, trend: 12, status: 'on_track' };
      mockData.assets_bought = { value: 6, trend: 50, status: 'on_track' };
      mockData.assets_sold = { value: 4, trend: 0, status: 'on_track' };
    } else if (cadence === 'quarterly') {
      mockData.roi = { value: 24.5, trend: 8, status: 'on_track' };
      mockData.capital_deployed = { value: 2450000, trend: 15, status: 'on_track' };
      mockData.portfolio_valuation = { value: 8750000, trend: 12, status: 'on_track' };
    }
  }
  
  // Unique Painting mock data
  if (companyType === 'unique_painting') {
    if (cadence === 'daily') {
      mockData.leads = { value: 18, trend: 12, status: 'on_track' };
      mockData.estimates_sent = { value: 8, trend: 15, status: 'on_track' };
      mockData.jobs_completed = { value: 3, trend: -25, status: 'warning' };
    } else if (cadence === 'weekly') {
      mockData.jobs_sold = { value: 12, trend: 20, status: 'on_track' };
      mockData.revenue_booked = { value: 87500, trend: 8, status: 'on_track' };
      mockData.cash_available = { value: 124000, trend: 5, status: 'on_track' };
    } else if (cadence === 'monthly') {
      mockData.profit_per_job = { value: 2850, trend: 12, status: 'on_track' };
      mockData.crew_utilization = { value: 78, trend: -8, status: 'warning' };
      mockData.total_revenue = { value: 342000, trend: 15, status: 'on_track' };
    } else if (cadence === 'quarterly') {
      mockData.revenue_growth = { value: 18.5, trend: 5, status: 'on_track' };
      mockData.margin_trend = { value: 32, trend: 3, status: 'on_track' };
      mockData.customer_acquisition_cost = { value: 245, trend: -12, status: 'on_track' };
    }
  }
  
  // ATI Security mock data
  if (companyType === 'ati_security') {
    if (cadence === 'daily') {
      mockData.leads = { value: 7, trend: 40, status: 'on_track' };
      mockData.estimates = { value: 4, trend: 33, status: 'on_track' };
      mockData.active_projects = { value: 12, trend: 9, status: 'on_track' };
      mockData.installations_completed = { value: 2, trend: -33, status: 'critical' };
    } else if (cadence === 'weekly') {
      mockData.contracts_signed = { value: 5, trend: 25, status: 'on_track' };
      mockData.pipeline_value = { value: 178000, trend: 15, status: 'on_track' };
    } else if (cadence === 'monthly') {
      mockData.revenue = { value: 156000, trend: 22, status: 'on_track' };
      mockData.gross_margin = { value: 42, trend: 5, status: 'on_track' };
      mockData.recurring_revenue = { value: 28000, trend: 8, status: 'on_track' };
      mockData.project_revenue = { value: 128000, trend: 28, status: 'on_track' };
    } else if (cadence === 'quarterly') {
      mockData.contract_backlog = { value: 425000, trend: 18, status: 'on_track' };
      mockData.avg_deal_size = { value: 12500, trend: 10, status: 'on_track' };
      mockData.client_concentration = { value: 35, trend: -5, status: 'warning' };
    }
  }
  
  return mockData;
}

// Format value based on type
export function formatKpiValue(value: number | string, format: 'number' | 'currency' | 'percent'): string {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
}
