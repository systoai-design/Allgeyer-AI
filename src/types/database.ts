// Database types for the Multi-Bot Automation Platform

export type AppRole = 'super_admin' | 'company_admin' | 'team_member';

export type CompanyType = 'property_halo' | 'unique_painting' | 'ati_security';

export type BotType = 'financial_control' | 'property_halo' | 'unique_painting' | 'ati_security';

export type CadenceType = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type ExceptionStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type KpiStatus = 'on_track' | 'warning' | 'critical';

export type IntegrationType = 'quickbooks' | 'pete_crm' | 'labortech' | 'jobber';

export type BotRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Company {
  id: string;
  company_type: CompanyType;
  name: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  updated_at: string;
}

export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  is_company_admin: boolean;
  created_at: string;
}

export interface Bot {
  id: string;
  bot_type: BotType;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotSchedule {
  id: string;
  bot_id: string;
  company_id: string;
  cadence: CadenceType;
  schedule_time: string;
  timezone: string;
  is_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailRecipient {
  id: string;
  company_id: string;
  bot_id: string;
  cadence: CadenceType;
  email: string;
  recipient_type: 'to' | 'cc' | 'bcc';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KpiThreshold {
  id: string;
  company_id: string;
  bot_id: string;
  kpi_name: string;
  warning_threshold: number | null;
  critical_threshold: number | null;
  threshold_direction: 'below' | 'above';
  created_at: string;
  updated_at: string;
}

export interface ExceptionThreshold {
  id: string;
  company_id: string;
  bot_id: string;
  exception_type: string;
  threshold_value: number;
  severity: ExceptionSeverity;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  company_id: string;
  integration_type: IntegrationType;
  is_connected: boolean;
  last_sync_at: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KpiHistory {
  id: string;
  company_id: string;
  bot_id: string;
  cadence: CadenceType;
  period_start: string;
  period_end: string;
  kpi_name: string;
  kpi_value: number | null;
  kpi_status: KpiStatus | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Transaction {
  id: string;
  company_id: string;
  external_id: string | null;
  transaction_date: string;
  amount: number;
  vendor: string | null;
  category: string | null;
  memo: string | null;
  account_name: string | null;
  is_categorized: boolean;
  is_duplicate: boolean;
  needs_clarification: boolean;
  classification_status: string;
  created_at: string;
  updated_at: string;
}

export interface Exception {
  id: string;
  company_id: string;
  bot_id: string;
  exception_type: string;
  title: string;
  description: string | null;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  data: Record<string, unknown>;
  assigned_to: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BotRun {
  id: string;
  bot_id: string;
  company_id: string;
  cadence: CadenceType;
  status: BotRunStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  summary: Record<string, unknown>;
  created_at: string;
}

export interface EmailLog {
  id: string;
  bot_run_id: string | null;
  company_id: string;
  bot_id: string;
  cadence: CadenceType;
  subject: string;
  recipients: {
    to: string[];
    cc?: string[];
    bcc?: string[];
  };
  html_content: string | null;
  sent_at: string | null;
  delivery_status: string;
  resend_id: string | null;
  created_at: string;
}

// Extended types with relations
export interface CompanyWithBots extends Company {
  bots?: Bot[];
}

export interface ExceptionWithRelations extends Exception {
  company?: Company;
  bot?: Bot;
  assigned_user?: Profile;
}

export interface BotRunWithRelations extends BotRun {
  company?: Company;
  bot?: Bot;
}
