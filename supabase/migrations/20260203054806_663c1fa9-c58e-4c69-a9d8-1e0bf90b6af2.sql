-- ============================================
-- MULTI-BOT AUTOMATION PLATFORM DATABASE SCHEMA
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Role types for users
CREATE TYPE public.app_role AS ENUM ('super_admin', 'company_admin', 'team_member');

-- Company identifiers
CREATE TYPE public.company_type AS ENUM ('property_halo', 'unique_painting', 'ati_security');

-- Bot identifiers
CREATE TYPE public.bot_type AS ENUM ('financial_control', 'property_halo', 'unique_painting', 'ati_security');

-- Report cadence types
CREATE TYPE public.cadence_type AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');

-- Exception status
CREATE TYPE public.exception_status AS ENUM ('open', 'in_progress', 'resolved', 'dismissed');

-- Exception severity
CREATE TYPE public.exception_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- KPI status indicator
CREATE TYPE public.kpi_status AS ENUM ('on_track', 'warning', 'critical');

-- Integration types
CREATE TYPE public.integration_type AS ENUM ('quickbooks', 'pete_crm', 'labortech', 'jobber');

-- Bot run status
CREATE TYPE public.bot_run_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- ============================================
-- CORE TABLES
-- ============================================

-- User profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'team_member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_type public.company_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User-Company assignments (many-to-many)
CREATE TABLE public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  is_company_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- ============================================
-- BOT CONFIGURATION TABLES
-- ============================================

-- Bot definitions
CREATE TABLE public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_type public.bot_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bot schedules per company
CREATE TABLE public.bot_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  cadence public.cadence_type NOT NULL,
  schedule_time TIME NOT NULL DEFAULT '08:00:00',
  timezone TEXT DEFAULT 'America/New_York',
  is_enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bot_id, company_id, cadence)
);

-- Email recipients per company/report type
CREATE TABLE public.email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  cadence public.cadence_type NOT NULL,
  email TEXT NOT NULL,
  recipient_type TEXT DEFAULT 'to', -- 'to', 'cc', 'bcc'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KPI thresholds for visual indicators
CREATE TABLE public.kpi_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  kpi_name TEXT NOT NULL,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  threshold_direction TEXT DEFAULT 'below', -- 'below' or 'above'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, bot_id, kpi_name)
);

-- Exception thresholds
CREATE TABLE public.exception_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  exception_type TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  severity public.exception_severity DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, bot_id, exception_type)
);

-- ============================================
-- INTEGRATION TABLES
-- ============================================

-- Integration credentials (encrypted)
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  integration_type public.integration_type NOT NULL,
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, integration_type)
);

-- ============================================
-- DATA TABLES
-- ============================================

-- KPI history (stores all historical KPI values)
CREATE TABLE public.kpi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  cadence public.cadence_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  kpi_name TEXT NOT NULL,
  kpi_value NUMERIC,
  kpi_status public.kpi_status,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for KPI lookups
CREATE INDEX idx_kpi_history_lookup ON public.kpi_history (company_id, bot_id, kpi_name, period_start DESC);

-- Transactions (for Financial Control Bot)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT, -- ID from QuickBooks
  transaction_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  vendor TEXT,
  category TEXT,
  memo TEXT,
  account_name TEXT,
  is_categorized BOOLEAN DEFAULT FALSE,
  is_duplicate BOOLEAN DEFAULT FALSE,
  needs_clarification BOOLEAN DEFAULT FALSE,
  classification_status TEXT DEFAULT 'uncategorized',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_company_date ON public.transactions (company_id, transaction_date DESC);

-- Exceptions (flagged items needing attention)
CREATE TABLE public.exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  exception_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity public.exception_severity DEFAULT 'medium',
  status public.exception_status DEFAULT 'open',
  data JSONB DEFAULT '{}', -- Related data (e.g., transaction details)
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exceptions_status ON public.exceptions (company_id, status, created_at DESC);

-- Bot runs (execution log)
CREATE TABLE public.bot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  cadence public.cadence_type NOT NULL,
  status public.bot_run_status DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  summary JSONB DEFAULT '{}', -- Summary of what was processed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bot_runs_lookup ON public.bot_runs (bot_id, company_id, created_at DESC);

-- Email logs (archive of sent emails)
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_run_id UUID REFERENCES public.bot_runs(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  cadence public.cadence_type NOT NULL,
  subject TEXT NOT NULL,
  recipients JSONB NOT NULL, -- {to: [], cc: [], bcc: []}
  html_content TEXT,
  sent_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending',
  resend_id TEXT, -- ID from Resend API
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_logs_lookup ON public.email_logs (company_id, bot_id, sent_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user has a specific role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- Function to check if user has access to a company
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.user_companies
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Function to check if user is company admin for a specific company
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.user_companies
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND is_company_admin = TRUE
  )
$$;

-- Function to get user's accessible company IDs
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN public.is_super_admin(_user_id) THEN (SELECT id FROM public.companies)
    ELSE (SELECT company_id FROM public.user_companies WHERE user_id = _user_id)
  END
$$;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON public.bots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bot_schedules_updated_at BEFORE UPDATE ON public.bot_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_recipients_updated_at BEFORE UPDATE ON public.email_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kpi_thresholds_updated_at BEFORE UPDATE ON public.kpi_thresholds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exception_thresholds_updated_at BEFORE UPDATE ON public.exception_thresholds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exceptions_updated_at BEFORE UPDATE ON public.exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exception_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_super_admin(auth.uid()));

-- USER ROLES POLICIES (only super admins can manage)
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL USING (public.is_super_admin(auth.uid()));

-- COMPANIES POLICIES
CREATE POLICY "Users can view assigned companies" ON public.companies FOR SELECT USING (public.has_company_access(auth.uid(), id));
CREATE POLICY "Super admins can manage companies" ON public.companies FOR ALL USING (public.is_super_admin(auth.uid()));

-- USER COMPANIES POLICIES
CREATE POLICY "Users can view their company assignments" ON public.user_companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all assignments" ON public.user_companies FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Company admins can view their company members" ON public.user_companies FOR SELECT USING (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "Super admins can manage assignments" ON public.user_companies FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Company admins can manage their company assignments" ON public.user_companies FOR ALL USING (public.is_company_admin(auth.uid(), company_id));

-- BOTS POLICIES (read by authenticated, manage by super admin)
CREATE POLICY "Authenticated users can view bots" ON public.bots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage bots" ON public.bots FOR ALL USING (public.is_super_admin(auth.uid()));

-- BOT SCHEDULES POLICIES
CREATE POLICY "Users can view schedules for their companies" ON public.bot_schedules FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can manage schedules" ON public.bot_schedules FOR ALL USING (public.is_company_admin(auth.uid(), company_id));

-- EMAIL RECIPIENTS POLICIES
CREATE POLICY "Users can view recipients for their companies" ON public.email_recipients FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can manage recipients" ON public.email_recipients FOR ALL USING (public.is_company_admin(auth.uid(), company_id));

-- KPI THRESHOLDS POLICIES
CREATE POLICY "Users can view thresholds for their companies" ON public.kpi_thresholds FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can manage thresholds" ON public.kpi_thresholds FOR ALL USING (public.is_company_admin(auth.uid(), company_id));

-- EXCEPTION THRESHOLDS POLICIES
CREATE POLICY "Users can view exception thresholds for their companies" ON public.exception_thresholds FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can manage exception thresholds" ON public.exception_thresholds FOR ALL USING (public.is_company_admin(auth.uid(), company_id));

-- INTEGRATIONS POLICIES
CREATE POLICY "Users can view integrations for their companies" ON public.integrations FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can manage integrations" ON public.integrations FOR ALL USING (public.is_company_admin(auth.uid(), company_id));

-- KPI HISTORY POLICIES
CREATE POLICY "Users can view KPI history for their companies" ON public.kpi_history FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can insert KPI history" ON public.kpi_history FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- TRANSACTIONS POLICIES
CREATE POLICY "Users can view transactions for their companies" ON public.transactions FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can manage transactions" ON public.transactions FOR ALL USING (public.is_company_admin(auth.uid(), company_id));

-- EXCEPTIONS POLICIES
CREATE POLICY "Users can view exceptions for their companies" ON public.exceptions FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Users can update exceptions for their companies" ON public.exceptions FOR UPDATE USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can manage exceptions" ON public.exceptions FOR ALL USING (public.is_company_admin(auth.uid(), company_id));

-- BOT RUNS POLICIES
CREATE POLICY "Users can view bot runs for their companies" ON public.bot_runs FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can insert bot runs" ON public.bot_runs FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- EMAIL LOGS POLICIES
CREATE POLICY "Users can view email logs for their companies" ON public.email_logs FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "Company admins can insert email logs" ON public.email_logs FOR INSERT WITH CHECK (public.is_company_admin(auth.uid(), company_id));