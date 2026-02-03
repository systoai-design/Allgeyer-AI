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
import {
  DollarSign,
  Users,
  FileCheck,
  TrendingUp,
  Activity,
  Building2,
  Loader2
} from 'lucide-react';
import type { Bot, Exception, EmailLog, BotRun, BotType, CadenceType } from '@/types/database';

// Mock KPI data for demonstration
const propertyHaloKpis = {
  leads: { value: 47, trend: 12, status: 'on_track' as const },
  appointments: { value: 23, trend: -5, status: 'warning' as const },
  offers: { value: 8, trend: 33, status: 'on_track' as const },
  closings: { value: 3, trend: 0, status: 'on_track' as const }
};

const uniquePaintingKpis = {
  leads: { value: 89, trend: 8, status: 'on_track' as const },
  estimates: { value: 34, trend: 15, status: 'on_track' as const },
  jobsSold: { value: 18, trend: -12, status: 'warning' as const },
  revenue: { value: '$127,450', trend: 5, status: 'on_track' as const }
};

const atiSecurityKpis = {
  leads: { value: 31, trend: 22, status: 'on_track' as const },
  contracts: { value: 12, trend: 8, status: 'on_track' as const },
  installations: { value: 7, trend: -3, status: 'warning' as const },
  revenue: { value: '$89,200', trend: 18, status: 'on_track' as const }
};

function DashboardContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCompany, isLoading: companyLoading } = useCompanySelector();
  
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

  // Map bots with their latest run status
  const botsWithStatus = bots.map(bot => ({
    ...bot,
    last_run: botRuns.find(run => run.bot_id === bot.id),
    next_run: undefined // Would come from schedules
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {companyType === 'property_halo' && (
          <>
            <KpiCard title="Leads This Week" value={propertyHaloKpis.leads.value} icon={Users} status={propertyHaloKpis.leads.status} trend={{ value: propertyHaloKpis.leads.trend, label: 'vs last week' }} />
            <KpiCard title="Appointments" value={propertyHaloKpis.appointments.value} icon={Activity} status={propertyHaloKpis.appointments.status} trend={{ value: propertyHaloKpis.appointments.trend, label: 'vs last week' }} />
            <KpiCard title="Offers Made" value={propertyHaloKpis.offers.value} icon={FileCheck} status={propertyHaloKpis.offers.status} trend={{ value: propertyHaloKpis.offers.trend, label: 'vs last week' }} />
            <KpiCard title="Closings MTD" value={propertyHaloKpis.closings.value} icon={Building2} status={propertyHaloKpis.closings.status} trend={{ value: propertyHaloKpis.closings.trend, label: 'vs last month' }} />
          </>
        )}
        {companyType === 'unique_painting' && (
          <>
            <KpiCard title="Leads This Week" value={uniquePaintingKpis.leads.value} icon={Users} status={uniquePaintingKpis.leads.status} trend={{ value: uniquePaintingKpis.leads.trend, label: 'vs last week' }} />
            <KpiCard title="Estimates Sent" value={uniquePaintingKpis.estimates.value} icon={FileCheck} status={uniquePaintingKpis.estimates.status} trend={{ value: uniquePaintingKpis.estimates.trend, label: 'vs last week' }} />
            <KpiCard title="Jobs Sold" value={uniquePaintingKpis.jobsSold.value} icon={Activity} status={uniquePaintingKpis.jobsSold.status} trend={{ value: uniquePaintingKpis.jobsSold.trend, label: 'vs last week' }} />
            <KpiCard title="Revenue MTD" value={uniquePaintingKpis.revenue.value} icon={DollarSign} status={uniquePaintingKpis.revenue.status} trend={{ value: uniquePaintingKpis.revenue.trend, label: 'vs last month' }} />
          </>
        )}
        {companyType === 'ati_security' && (
          <>
            <KpiCard title="Leads This Week" value={atiSecurityKpis.leads.value} icon={Users} status={atiSecurityKpis.leads.status} trend={{ value: atiSecurityKpis.leads.trend, label: 'vs last week' }} />
            <KpiCard title="Contracts Signed" value={atiSecurityKpis.contracts.value} icon={FileCheck} status={atiSecurityKpis.contracts.status} trend={{ value: atiSecurityKpis.contracts.trend, label: 'vs last week' }} />
            <KpiCard title="Installations" value={atiSecurityKpis.installations.value} icon={Activity} status={atiSecurityKpis.installations.status} trend={{ value: atiSecurityKpis.installations.trend, label: 'vs last week' }} />
            <KpiCard title="Revenue MTD" value={atiSecurityKpis.revenue.value} icon={DollarSign} status={atiSecurityKpis.revenue.status} trend={{ value: atiSecurityKpis.revenue.trend, label: 'vs last month' }} />
          </>
        )}
      </div>

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
