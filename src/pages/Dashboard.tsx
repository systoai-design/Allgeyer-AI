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
import { Loader2, TrendingUp, Download, BarChart3, AlertTriangle, Mail, Building2 } from 'lucide-react';
import { exportKPIData } from '@/lib/csvExport';
import { toast } from 'sonner';
import {
  getCompanyKpis,
  getMockKpiValues,
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

        // Fetch KPI history for charts
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

  const currentKpis = companyKpis[selectedCadence] || [];

  // Generate mock trend data for charts
  const trendChartData = useMemo(() => {
    const periods = selectedCadence === 'daily' 
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : selectedCadence === 'weekly'
      ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      : selectedCadence === 'monthly'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      : ['Q1', 'Q2', 'Q3', 'Q4'];
    
    // Use real KPI history if available, otherwise generate mock data
    if (kpiHistory.length > 0) {
      const grouped: Record<string, Record<string, number>> = {};
      kpiHistory.forEach(kpi => {
        const period = new Date(kpi.period_end).toLocaleDateString('en-US', { month: 'short' });
        if (!grouped[period]) grouped[period] = {};
        grouped[period][kpi.kpi_name] = kpi.kpi_value || 0;
      });
      return Object.entries(grouped).slice(0, 6).map(([period, values]) => ({
        period,
        ...values
      }));
    }
    
    // Mock data
    return periods.map((period, i) => ({
      period,
      Leads: 20 + Math.floor(Math.random() * 30) + i * 5,
      Conversions: 5 + Math.floor(Math.random() * 15) + i * 2,
      Revenue: 15000 + Math.floor(Math.random() * 10000) + i * 3000,
    }));
  }, [selectedCadence, kpiHistory]);

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

  // KPI status distribution
  const kpiStatusData = useMemo(() => {
    const values = getMockKpiValues(companyType, selectedCadence);
    const statuses = Object.values(values);
    return [
      { name: 'On Track', value: statuses.filter(s => s.status === 'on_track').length, color: 'hsl(var(--success))' },
      { name: 'Warning', value: statuses.filter(s => s.status === 'warning').length, color: 'hsl(var(--warning))' },
      { name: 'Critical', value: statuses.filter(s => s.status === 'critical').length, color: 'hsl(var(--destructive))' },
    ];
  }, [companyType, selectedCadence]);

  // Early returns AFTER all hooks
  if (authLoading || companyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const handleExportKPIs = () => {
    if (kpiHistory.length === 0) {
      toast.info('No KPI history to export yet - using mock data');
      // Export mock data as example
      const mockExport = currentKpis.map(kpi => ({
        kpi_name: kpi.label,
        kpi_value: Math.floor(Math.random() * 100),
        kpi_status: 'on_track',
        cadence: selectedCadence,
        period_start: new Date().toISOString(),
        period_end: new Date().toISOString(),
      }));
      exportKPIData(mockExport, selectedCompany?.name || 'company');
    } else {
      exportKPIData(kpiHistory, selectedCompany?.name || 'company');
    }
    toast.success('KPI data exported successfully');
  };

  // Quick stats for header
  const quickStats = {
    openExceptions: allExceptions.filter(e => e.status === 'open').length,
    recentRuns: botRuns.filter(r => r.status === 'completed').length,
    emailsSent: recentEmails.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {selectedCompany ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: companyColor }}
                />
                {selectedCompany.name} — Performance Overview
              </span>
            ) : 'Select a company to view data'}
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">{quickStats.openExceptions}</span>
            <span className="text-xs text-muted-foreground">Open</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <Mail className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">{quickStats.emailsSent}</span>
            <span className="text-xs text-muted-foreground">Emails</span>
          </div>
        </div>
      </div>

      {/* Cadence Tabs */}
      <Tabs value={selectedCadence} onValueChange={(v) => setSelectedCadence(v as CadenceType)}>
        <div className="flex items-center justify-between gap-4">
          <TabsList className="h-auto p-1">
            {cadenceTabs.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="px-4 py-2 data-[state=active]:shadow-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="outline" size="sm" onClick={handleExportKPIs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {cadenceTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6 space-y-6">
            {/* Company-Specific KPIs */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div 
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${companyColor}20` }}
                >
                  <Building2 className="h-5 w-5" style={{ color: companyColor }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedCompany?.name} KPIs
                  </h2>
                  <p className="text-sm text-muted-foreground">{tab.description}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {companyKpis[tab.value]?.map((kpi) => {
                  const values = getMockKpiValues(companyType, tab.value);
                  const kpiValue = values[kpi.key];
                  return (
                    <KpiCard
                      key={kpi.key}
                      title={kpi.label}
                      value={kpiValue ? formatKpiValue(kpiValue.value, kpi.format) : '—'}
                      icon={kpi.icon}
                      status={kpiValue?.status}
                      trend={kpiValue ? { value: kpiValue.trend, label: kpi.trendLabel } : undefined}
                    />
                  );
                })}
              </div>
            </section>

            {/* Charts Section */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <KpiTrendChart
                title="Performance Trends"
                data={trendChartData}
                lines={[
                  { key: 'Leads', name: 'Leads', color: companyColor },
                  { key: 'Conversions', name: 'Conversions', color: 'hsl(var(--chart-2))' },
                ]}
              />
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

            {/* Financial Control KPIs (Foundation) */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-4/10">
                  <BarChart3 className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Financial Control</h2>
                  <p className="text-sm text-muted-foreground">
                    Foundation metrics across all entities
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {financialControlKpis[tab.value]?.map((kpi) => {
                  // Generate mock financial data
                  const mockFinancial: Record<string, { value: number; trend: number; status: 'on_track' | 'warning' | 'critical' }> = {
                    uncategorized_transactions: { value: 3, trend: -40, status: 'on_track' },
                    duplicate_flags: { value: 1, trend: 0, status: 'on_track' },
                    incomplete_transactions: { value: 7, trend: 16, status: 'warning' },
                    cash_position: { value: 485000, trend: 5, status: 'on_track' },
                    unresolved_items: { value: 4, trend: -20, status: 'on_track' },
                    net_income: { value: 156000, trend: 12, status: 'on_track' },
                    assets_bought: { value: 2, trend: 100, status: 'on_track' },
                    assets_sold: { value: 1, trend: 0, status: 'on_track' },
                    recurring_expenses: { value: 34500, trend: 3, status: 'on_track' },
                    net_worth: { value: 2450000, trend: 8, status: 'on_track' },
                    investment_total: { value: 875000, trend: 15, status: 'on_track' },
                    credit_utilization: { value: 28, trend: -5, status: 'on_track' },
                  };
                  const kpiValue = mockFinancial[kpi.key];
                  return (
                    <KpiCard
                      key={kpi.key}
                      title={kpi.label}
                      value={kpiValue ? formatKpiValue(kpiValue.value, kpi.format) : '—'}
                      icon={kpi.icon}
                      status={kpiValue?.status}
                      trend={kpiValue ? { value: kpiValue.trend, label: kpi.trendLabel } : undefined}
                      className="border-chart-4/20"
                    />
                  );
                })}
              </div>
            </section>
          </TabsContent>
        ))}
      </Tabs>

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
