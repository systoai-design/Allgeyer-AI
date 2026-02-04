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
import { DateRangePicker, dateRangePresets } from '@/components/dashboard/DateRangePicker';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Download, BarChart3, AlertTriangle, Mail, Building2, LinkIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportKPIData } from '@/lib/csvExport';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  getCompanyKpis,
  formatKpiValue,
  financialControlKpis,
} from '@/config/kpiDefinitions';
import type { Bot, Exception, EmailLog, BotRun, KpiHistory } from '@/types/database';

function DashboardContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCompany, isLoading: companyLoading } = useCompanySelector();
  
  // Date range state - default to last 30 days
  const [selectedPreset, setSelectedPreset] = useState<string | null>('last30days');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const preset = dateRangePresets.find(p => p.value === 'last30days');
    return preset?.getRange();
  });
  
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

  // Fetch data when company or date range changes
  useEffect(() => {
    if (!selectedCompany || !dateRange?.from || !dateRange?.to) return;
    
    async function fetchData() {
      setIsLoading(true);
      
      const startDate = format(dateRange!.from!, 'yyyy-MM-dd');
      const endDate = format(dateRange!.to!, 'yyyy-MM-dd');
      
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

        // Fetch exceptions for selected company and date range (open/in_progress only for list)
        const { data: exceptionsData } = await supabase
          .from('exceptions')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .in('status', ['open', 'in_progress'])
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(5);
        if (exceptionsData) setExceptions(exceptionsData as Exception[]);

        // Fetch ALL exceptions for charts within date range
        const { data: allExceptionsData } = await supabase
          .from('exceptions')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59');
        if (allExceptionsData) setAllExceptions(allExceptionsData as Exception[]);

        // Fetch recent emails within date range
        const { data: emailsData } = await supabase
          .from('email_logs')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(5);
        if (emailsData) setRecentEmails(emailsData as EmailLog[]);

        // Fetch recent bot runs within date range
        const { data: runsData } = await supabase
          .from('bot_runs')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(10);
        if (runsData) setBotRuns(runsData as BotRun[]);

        // Fetch KPI history within date range
        const { data: kpiData } = await supabase
          .from('kpi_history')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .gte('period_end', startDate)
          .lte('period_end', endDate)
          .order('period_end', { ascending: false })
          .limit(500);
        if (kpiData) setKpiHistory(kpiData as KpiHistory[]);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedCompany, dateRange]);

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

  // Get KPIs for display - use 'daily' as default format since we're now range-based
  const displayKpis = financialControlKpis['daily'] || [];
  const companyDisplayKpis = companyKpis['daily'] || [];

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
    return Object.entries(grouped).slice(0, 14).reverse().map(([period, values]) => ({
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
    // Get unique KPIs (most recent per kpi_name)
    const uniqueKpis = new Map<string, KpiHistory>();
    kpiHistory.forEach(k => {
      const existing = uniqueKpis.get(k.kpi_name);
      if (!existing || new Date(k.period_end) > new Date(existing.period_end)) {
        uniqueKpis.set(k.kpi_name, k);
      }
    });
    const latestKpis = Array.from(uniqueKpis.values());
    const onTrack = latestKpis.filter(k => k.kpi_status === 'on_track').length;
    const warning = latestKpis.filter(k => k.kpi_status === 'warning').length;
    const critical = latestKpis.filter(k => k.kpi_status === 'critical').length;
    return [
      { name: 'On Track', value: onTrack || 0, color: 'hsl(var(--success))' },
      { name: 'Warning', value: warning || 0, color: 'hsl(var(--warning))' },
      { name: 'Critical', value: critical || 0, color: 'hsl(var(--destructive))' },
    ];
  }, [kpiHistory]);

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
        {/* Date Range Skeleton */}
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

  // Get date range display text
  const dateRangeText = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
    : 'All time';

  // Get aggregated KPI values for the date range (sum or average depending on type)
  const getAggregatedKpiValue = (kpiLabel: string) => {
    const matchingKpis = kpiHistory.filter(k => k.kpi_name === kpiLabel);
    if (matchingKpis.length === 0) return null;
    
    // For most KPIs, show the most recent value
    const mostRecent = matchingKpis.reduce((latest, current) => 
      new Date(current.period_end) > new Date(latest.period_end) ? current : latest
    );
    
    return {
      value: mostRecent.kpi_value ?? 0,
      status: mostRecent.kpi_status || 'on_track'
    };
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
                {selectedCompany.name} — {dateRangeText}
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

      {/* Date Range Picker */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedPreset={selectedPreset}
          onPresetChange={setSelectedPreset}
        />
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
          {displayKpis.slice(0, 4).map((kpi) => {
            const kpiValue = getAggregatedKpiValue(kpi.label);
            
            return (
              <KpiCard
                key={kpi.key}
                title={kpi.label}
                value={kpiValue ? formatKpiValue(kpiValue.value, kpi.format) : '—'}
                icon={kpi.icon}
                status={kpiValue?.status as 'on_track' | 'warning' | 'critical' | undefined}
              />
            );
          })}
        </div>
        {kpiHistory.filter(k => ['Sales Revenue', 'Gross Profit', 'Net Profit', 'Net Cash Flow'].includes(k.kpi_name)).length === 0 && (
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
            {companyDisplayKpis.map((kpi) => {
              const kpiValue = getAggregatedKpiValue(kpi.label);
              return (
                <KpiCard
                  key={kpi.key}
                  title={kpi.label}
                  value={kpiValue ? formatKpiValue(kpiValue.value, kpi.format) : '—'}
                  icon={kpi.icon}
                  status={kpiValue?.status as 'on_track' | 'warning' | 'critical' | undefined}
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
          centerValue={kpiStatusData.reduce((sum, item) => sum + item.value, 0)}
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
