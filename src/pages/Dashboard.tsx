import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector, getCompanyColor } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ExceptionsList } from '@/components/dashboard/ExceptionsList';
import { BotStatusCard } from '@/components/dashboard/BotStatusCard';
import { RecentReportsCard } from '@/components/dashboard/RecentReportsCard';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';
import {
  getCompanyKpis,
  getMockKpiValues,
  formatKpiValue,
  financialControlKpis,
} from '@/config/kpiDefinitions';
import type { Bot, Exception, EmailLog, BotRun, CadenceType } from '@/types/database';

function DashboardContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCompany, isLoading: companyLoading } = useCompanySelector();
  
  const [selectedCadence, setSelectedCadence] = useState<CadenceType>('daily');
  const [bots, setBots] = useState<Bot[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [recentEmails, setRecentEmails] = useState<EmailLog[]>([]);
  const [botRuns, setBotRuns] = useState<BotRun[]>([]);
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

        // Fetch exceptions for selected company
        const { data: exceptionsData } = await supabase
          .from('exceptions')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5);
        if (exceptionsData) setExceptions(exceptionsData as Exception[]);

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

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedCompany]);

  if (authLoading || companyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  // Get company type for conditional rendering
  const companyType = selectedCompany?.company_type || 'property_halo';
  const companyKpis = getCompanyKpis(companyType);
  const kpiValues = getMockKpiValues(companyType, selectedCadence);
  const financialKpis = financialControlKpis[selectedCadence];

  // Map bots with their latest run status
  const botsWithStatus = bots.map(bot => ({
    ...bot,
    last_run: botRuns.find(run => run.bot_id === bot.id),
    next_run: undefined
  }));

  // Map exceptions with bot names
  const exceptionsWithBots = exceptions.map(ex => ({
    ...ex,
    bot_name: bots.find(b => b.id === ex.bot_id)?.name
  }));

  // Map emails with bot names
  const emailsWithBots = recentEmails.map(email => ({
    ...email,
    bot_name: bots.find(b => b.id === email.bot_id)?.name
  }));

  const cadenceTabs: { value: CadenceType; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
  ];

  const currentKpis = companyKpis[selectedCadence] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {selectedCompany ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getCompanyColor(selectedCompany.company_type) }}
                />
                {selectedCompany.name} Overview
              </span>
            ) : 'Select a company to view data'}
          </p>
        </div>
      </div>

      {/* Cadence Tabs */}
      <Tabs value={selectedCadence} onValueChange={(v) => setSelectedCadence(v as CadenceType)}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          {cadenceTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {cadenceTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6 space-y-6">
            {/* Company-Specific KPIs */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5" style={{ color: getCompanyColor(companyType) }} />
                {selectedCompany?.name} KPIs
              </h2>
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
            </div>

            {/* Financial Control KPIs (Foundation) */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Financial Control
              </h2>
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
                      className="border-muted"
                    />
                  );
                })}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <ExceptionsList
            exceptions={exceptionsWithBots}
            isLoading={isLoading}
          />
          <RecentReportsCard
            reports={emailsWithBots}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column */}
        <div>
          <BotStatusCard
            bots={botsWithStatus}
            isLoading={isLoading}
            onTriggerRun={(botId, cadence) => {
              console.log('Trigger run:', botId, cadence);
            }}
          />
        </div>
      </div>
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
