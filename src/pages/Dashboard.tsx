import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector, getCompanyColor } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ExceptionsList } from '@/components/dashboard/ExceptionsList';
import { RecentReportsCard } from '@/components/dashboard/RecentReportsCard';
import { KpiTrendChart } from '@/components/dashboard/KpiTrendChart';
import { ExceptionBarChart } from '@/components/dashboard/ExceptionBarChart';
import { PerformanceDonutChart } from '@/components/dashboard/PerformanceDonutChart';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Download, BarChart3, AlertTriangle, Mail, Building2, LinkIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportKPIData } from '@/lib/csvExport';
import { toast } from 'sonner';
import {
  getCompanyKpis,
  formatKpiValue,
  financialControlKpis,
} from '@/config/kpiDefinitions';
import type { Bot, Exception, EmailLog, BotRun, CadenceType, KpiHistory } from '@/types/database';

function DashboardContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCompany, isLoading: companyLoading } = useCompanySelector();
  
  const [selectedCadence, setSelectedCadence] = useState<CadenceType>('daily');
  const [bots, setBots] = useState<Bot[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [allExceptions, setAllExceptions] = useState<Exception[]>([]);
  const [recentEmails, setRecentEmails] = useState<EmailLog[]>([]);
  const [botRuns, setBotRuns] = useState<BotRun[]>([]);
  const [kpiHistory, setKpiHistory] = useState<KpiHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Track which integrations are connected
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);

  // Fetch data when company changes
  useEffect(() => {
    if (!selectedCompany) return;
    
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch bots
        const { data: botsData } = await supabase
          .from('bots')
          .select('*');
        if (botsData) setBots(botsData as Bot[]);

        // Fetch integrations to check what's connected
        const { data: integrationsData } = await supabase
          .from('integrations')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .eq('is_connected', true);
        if (integrationsData) {
          setConnectedIntegrations(integrationsData.map(i => i.integration_type));
        }

        // Fetch exceptions for selected company (open/in_progress only for list)
        const { data: exceptionsData } = await supabase
          .from('exceptions')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5);
        if (exceptionsData) setExceptions(exceptionsData as Exception[]);

        // Fetch ALL exceptions for charts
        const { data: allExceptionsData } = await supabase
          .from('exceptions')
          .select('*')
          .eq('company_id', selectedCompany.id);
        if (allExceptionsData) setAllExceptions(allExceptionsData as Exception[]);

        // Fetch recent emails
        const { data: emailsData } = await supabase
          .from('email_logs')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (emailsData) setRecentEmails(emailsData as EmailLog[]);

        // Fetch recent bot runs
        const { data: runsData } = await supabase
          .from('bot_runs')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (runsData) setBotRuns(runsData as BotRun[]);

        // Fetch KPI history for charts - ONLY live data
        const { data: kpiData } = await supabase
          .from('kpi_history')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('period_end', { ascending: false })
          .limit(100);
        if (kpiData) setKpiHistory(kpiData as KpiHistory[]);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedCompany]);

  // Check if company-specific CRM is connected
  const isCrmConnected = useMemo(() => {
    if (!selectedCompany) return false;
    switch (selectedCompany.company_type) {
      case 'property_halo':
        return connectedIntegrations.includes('pete_crm');
      case 'unique_painting':
        return connectedIntegrations.includes('labortech');
      case 'ati_security':
        return connectedIntegrations.includes('jobber');
      default:
        return false;
    }
  }, [selectedCompany, connectedIntegrations]);

  const isQboConnected = connectedIntegrations.includes('quickbooks');

  // Get company type for conditional rendering - must be before useMemo hooks
  const companyType = selectedCompany?.company_type || 'property_halo';
  const companyKpis = getCompanyKpis(companyType);
  const companyColor = selectedCompany ? getCompanyColor(selectedCompany.company_type) : 'hsl(var(--accent))';

  // Map exceptions with bot names
  const exceptionsWithBots = useMemo(() => exceptions.map(ex => ({
    ...ex,
    bot_name: bots.find(b => b.id === ex.bot_id)?.name
  })), [exceptions, bots]);

  // Map emails with bot names
  const emailsWithBots = useMemo(() => recentEmails.map(email => ({
    ...email,
    bot_name: bots.find(b => b.id === email.bot_id)?.name
  })), [recentEmails, bots]);

  const cadenceTabs: { value: CadenceType; label: string; description: string }[] = [
    { value: 'daily', label: 'Daily', description: 'Daily operational metrics' },
    { value: 'weekly', label: 'Weekly', description: 'Weekly performance trends' },
    { value: 'monthly', label: 'Monthly', description: 'Monthly financial summary' },
    { value: 'quarterly', label: 'Quarterly', description: 'Quarterly strategic overview' },
  ];

  // Only count KPIs that have connected integrations
  const currentKpis = isCrmConnected 
    ? [...financialControlKpis[selectedCadence], ...companyKpis[selectedCadence]] 
    : financialControlKpis[selectedCadence] || [];

  // Only use real KPI history data for trend charts - NO mock data
  const trendChartData = useMemo(() => {
    if (kpiHistory.length === 0) return [];
    
    // Group by period and build chart data from live data only
    const grouped: Record<string, Record<string, number>> = {};
    kpiHistory.forEach(kpi => {
      const period = new Date(kpi.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[period]) grouped[period] = {};
      grouped[period][kpi.kpi_name] = kpi.kpi_value || 0;
    });
    return Object.entries(grouped).slice(0, 7).reverse().map(([period, values]) => ({
      period,
      ...values
    }));
  }, [kpiHistory]);

  // Exception chart data
  const exceptionChartData = useMemo(() => {
    const counts = {
      critical: allExceptions.filter(e => e.severity === 'critical').length,
      high: allExceptions.filter(e => e.severity === 'high').length,
      medium: allExceptions.filter(e => e.severity === 'medium').length,
      low: allExceptions.filter(e => e.severity === 'low').length,
    };
    return [
      { name: 'Critical', value: counts.critical, color: 'hsl(var(--destructive))' },
      { name: 'High', value: counts.high, color: '#f97316' },
      { name: 'Medium', value: counts.medium, color: 'hsl(var(--warning))' },
      { name: 'Low', value: counts.low, color: 'hsl(var(--muted-foreground))' },
    ];
  }, [allExceptions]);

  // KPI status distribution based on live data
  const kpiStatusData = useMemo(() => {
    // Count statuses from live kpi_history for current cadence
    const relevantKpis = kpiHistory.filter(k => k.cadence === selectedCadence);
    const onTrack = relevantKpis.filter(k => k.kpi_status === 'on_track').length;
    const warning = relevantKpis.filter(k => k.kpi_status === 'warning').length;
    const critical = relevantKpis.filter(k => k.kpi_status === 'critical').length;
    return [
      { name: 'On Track', value: onTrack || 0, color: 'hsl(var(--success))' },
      { name: 'Warning', value: warning || 0, color: 'hsl(var(--warning))' },
      { name: 'Critical', value: critical || 0, color: 'hsl(var(--destructive))' },
    ];
  }, [kpiHistory, selectedCadence]);

  // Early returns AFTER all hooks - Show skeleton loading instead of spinner
  if (authLoading || companyLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-48 bg-muted animate-pulse rounded" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
            <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
        {/* Tabs Skeleton */}
        <div className="h-12 w-80 bg-muted animate-pulse rounded-lg" />
        {/* KPI Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
              </div>
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleExportKPIs = () => {
    if (kpiHistory.length === 0) {
      toast.info('No live KPI data to export yet. Run the Financial Control bot first.');
      return;
    }
    exportKPIData(kpiHistory, selectedCompany?.name || 'company');
    toast.success('KPI data exported successfully');
  };

  // Quick stats for header
  const quickStats = {
    openExceptions: allExceptions.filter(e => e.status === 'open').length,
    recentRuns: botRuns.filter(r => r.status === 'completed').length,
    emailsSent: recentEmails.length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {selectedCompany ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: companyColor }}
                />
                {selectedCompany.name} — Performance Overview
              </span>
            ) : 'Select a company to view data'}
          </p>
        </div>
        
        {/* Quick Stats - Pill shaped */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-2 rounded-full bg-card border border-border/50 px-4 py-2 transition-all duration-200',
            quickStats.openExceptions > 0 && 'border-warning/40 pulse-alert'
          )}>
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">{quickStats.openExceptions}</span>
            <span className="text-xs text-muted-foreground">Open</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-card border border-border/50 px-4 py-2">
            <Mail className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">{quickStats.emailsSent}</span>
            <span className="text-xs text-muted-foreground">Emails</span>
          </div>
        </div>
      </div>

      {/* Cadence Tabs - Pill style */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {cadenceTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedCadence(tab.value)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                selectedCadence === tab.value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleExportKPIs} className="rounded-full transition-all duration-200">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Financial Control KPIs (Universal - ALL companies) - Live Data from QBO */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-chart-4/10">
              <BarChart3 className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Financial KPIs</h2>
              <p className="text-sm text-muted-foreground">
                Universal metrics from QuickBooks (all companies)
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
            <LinkIcon className="h-3 w-3 mr-1" /> QBO Connected
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
          {financialControlKpis[selectedCadence]?.slice(0, 4).map((kpi) => {
            const liveKpi = kpiHistory.find(
              k => k.kpi_name === kpi.label && k.cadence === selectedCadence
            );
            const kpiValue = liveKpi ? {
              value: liveKpi.kpi_value ?? 0,
              trend: 0,
              status: liveKpi.kpi_status || 'on_track'
            } : null;
            
            return (
              <KpiCard
                key={kpi.key}
                title={kpi.label}
                value={kpiValue ? formatKpiValue(kpiValue.value, kpi.format) : '—'}
                icon={kpi.icon}
                status={kpiValue?.status as 'on_track' | 'warning' | 'critical' | undefined}
                trend={kpiValue && kpiValue.trend !== 0 ? { value: kpiValue.trend, label: kpi.trendLabel } : undefined}
              />
            );
          })}
        </div>
        {kpiHistory.filter(k => k.cadence === selectedCadence && ['Sales Revenue', 'Gross Profit', 'Net Profit', 'Net Cash Flow'].includes(k.kpi_name)).length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground text-center py-6 border border-dashed rounded-2xl bg-muted/30">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            Run the Financial Control bot to generate live KPI data from QuickBooks.
          </p>
        )}
      </section>

      {/* Company-Specific KPIs - Only show if CRM is connected */}
      {isCrmConnected ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${companyColor}20` }}
              >
                <Building2 className="h-5 w-5" style={{ color: companyColor }} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {selectedCompany?.name} KPIs
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCompany?.company_type === 'property_halo' ? 'Asset Summary & CRM data from PETE' : 
                   selectedCompany?.company_type === 'unique_painting' ? 'Job tracking from Labortech' : 
                   'Project tracking from Jobber'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
              <LinkIcon className="h-3 w-3 mr-1" /> Connected
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger-children">
            {companyKpis[selectedCadence]?.map((kpi) => {
              const liveKpi = kpiHistory.find(
                k => k.kpi_name === kpi.label && k.cadence === selectedCadence
              );
              const kpiValue = liveKpi ? {
                value: liveKpi.kpi_value ?? 0,
                trend: 0,
                status: liveKpi.kpi_status || 'on_track'
              } : null;
              return (
                <KpiCard
                  key={kpi.key}
                  title={kpi.label}
                  value={kpiValue ? formatKpiValue(kpiValue.value, kpi.format) : '—'}
                  icon={kpi.icon}
                  status={kpiValue?.status as 'on_track' | 'warning' | 'critical' | undefined}
                  trend={kpiValue && kpiValue.trend !== 0 ? { value: kpiValue.trend, label: kpi.trendLabel } : undefined}
                />
              );
            })}
          </div>
        </section>
      ) : (
        <section>
          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/30 p-8 text-center">
            <Building2 className="h-10 w-10 mx-auto mb-3" style={{ color: companyColor }} />
            <h3 className="font-medium text-foreground mb-1">
              {selectedCompany?.company_type === 'property_halo' ? 'PETE CRM' : 
               selectedCompany?.company_type === 'unique_painting' ? 'Labortech' : 'Jobber'} Integration Required
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-1">
              Connect your CRM to display live {selectedCompany?.name} KPIs including
              {selectedCompany?.company_type === 'property_halo' ? ' Asset Summary (Bought, Sold, Under Contract, Upcoming Closings)' : 
               selectedCompany?.company_type === 'unique_painting' ? ' Jobs Completed, Crew Utilization, and Revenue' : 
               ' Installations, Contracts, and Project Revenue'}.
            </p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              Only live data from connected integrations is displayed.
            </p>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate('/settings')}>
              Configure Integration
            </Button>
          </div>
        </section>
      )}

      {/* Charts Section - Only show if we have live data */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {trendChartData.length > 0 ? (
          <KpiTrendChart
            title="Performance Trends"
            data={trendChartData}
            lines={[
              { key: 'Total Income', name: 'Income', color: 'hsl(var(--success))' },
              { key: 'Total Expenses', name: 'Expenses', color: 'hsl(var(--destructive))' },
            ]}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/30 p-8 text-center flex flex-col items-center justify-center min-h-[280px]">
            <TrendingUp className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No trend data yet</p>
            <p className="text-xs text-muted-foreground/60">Run bots to generate KPI history</p>
          </div>
        )}
        <ExceptionBarChart
          title="Exceptions by Severity"
          data={exceptionChartData}
        />
        <PerformanceDonutChart
          title="KPI Status"
          data={kpiStatusData}
          centerLabel="KPIs"
          centerValue={currentKpis.length}
        />
      </section>

      {/* Activity Section */}
      <section className="grid gap-6 lg:grid-cols-2">
        <ExceptionsList
          exceptions={exceptionsWithBots}
          isLoading={isLoading}
        />
        <RecentReportsCard
          reports={emailsWithBots}
          isLoading={isLoading}
        />
      </section>
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
