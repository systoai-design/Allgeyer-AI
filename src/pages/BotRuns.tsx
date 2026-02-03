import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Bot, CheckCircle, Clock, XCircle, Loader2, Play, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import type { BotRun, Bot as BotType, BotRunStatus, CadenceType, BotType as BotTypeEnum } from '@/types/database';

const statusIcons: Record<BotRunStatus, typeof CheckCircle> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle
};

const statusStyles: Record<BotRunStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-accent/10 text-accent',
  completed: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive'
};

const cadenceStyles: Record<CadenceType, string> = {
  daily: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
  weekly: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  monthly: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  quarterly: 'bg-chart-4/10 text-chart-4 border-chart-4/20'
};

const botColors: Record<BotTypeEnum, string> = {
  financial_control: 'bg-chart-4',
  property_halo: 'bg-company-property-halo',
  unique_painting: 'bg-company-unique-painting',
  ati_security: 'bg-company-ati-security'
};

function BotRunsContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCompany } = useCompanySelector();
  
  const [runs, setRuns] = useState<BotRun[]>([]);
  const [bots, setBots] = useState<BotType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [botFilter, setBotFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggeringBot, setTriggeringBot] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!selectedCompany) return;

    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: botsData } = await supabase.from('bots').select('*');
        if (botsData) setBots(botsData as BotType[]);

        const { data: runsData } = await supabase
          .from('bot_runs')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (runsData) setRuns(runsData as BotRun[]);
      } catch (error) {
        console.error('Error fetching bot runs:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedCompany]);

  const handleTriggerRun = async (botId: string, cadence: CadenceType) => {
    if (!selectedCompany) return;
    
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    setTriggeringBot(botId);
    try {
      // Create the bot run record
      const { data: botRun, error } = await supabase.from('bot_runs').insert({
        bot_id: botId,
        company_id: selectedCompany.id,
        cadence,
        status: 'pending',
      }).select().single();

      if (error) throw error;

      setRuns(prev => [botRun as BotRun, ...prev]);
      toast.success(`Bot run queued - executing...`);

      // Determine which edge function to call based on bot type
      const isFinancialControl = bot.bot_type === 'financial_control';
      const functionName = isFinancialControl ? 'run-financial-control-bot' : 'run-crm-bot';

      // Call the appropriate edge function
      const { data: result, error: funcError } = await supabase.functions.invoke(functionName, {
        body: {
          bot_run_id: botRun.id,
          company_id: selectedCompany.id,
          bot_type: bot.bot_type,
          cadence,
        },
      });

      if (funcError) {
        console.error('Edge function error:', funcError);
        toast.error(`Bot run failed: ${funcError.message}`);
      } else if (result?.error) {
        console.error('Bot run error:', result.error);
        toast.error(`Bot run failed: ${result.error}`);
      } else {
        toast.success('Bot run completed successfully!');
      }

      // Refresh the runs list to get updated status
      const { data: updatedRuns } = await supabase
        .from('bot_runs')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (updatedRuns) setRuns(updatedRuns as BotRun[]);

    } catch (error) {
      console.error('Error triggering bot run:', error);
      toast.error('Failed to trigger bot run');
    } finally {
      setTriggeringBot(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const filteredRuns = runs.filter(run => {
    const matchesBot = botFilter === 'all' || run.bot_id === botFilter;
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
    return matchesBot && matchesStatus;
  });

  const getBotName = (botId: string) => bots.find(b => b.id === botId)?.name || 'Unknown';
  const getBot = (botId: string) => bots.find(b => b.id === botId);

  const stats = {
    total: runs.length,
    completed: runs.filter(r => r.status === 'completed').length,
    failed: runs.filter(r => r.status === 'failed').length,
    running: runs.filter(r => r.status === 'running').length
  };

  // Get last run for each bot
  const getLastRun = (botId: string) => runs.find(r => r.bot_id === botId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bot Runs</h1>
        <p className="text-muted-foreground">Manage automation bots and view execution history</p>
      </div>

      {/* Bot Status Section */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <Bot className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg">Bot Status</CardTitle>
              <CardDescription>Current state of all automation bots</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter bots: show Financial Control (universal) + company-specific bot */}
          {(() => {
            const companyBotType = selectedCompany?.company_type; // e.g., 'property_halo'
            const relevantBots = bots.filter(bot => 
              bot.bot_type === 'financial_control' || bot.bot_type === companyBotType
            );
            return (
          <div className="grid gap-3 sm:grid-cols-2">
            {relevantBots.map((bot) => {
              const lastRun = getLastRun(bot.id);
              const StatusIcon = lastRun ? statusIcons[lastRun.status] : Clock;
              const isTriggering = triggeringBot === bot.id;
              
              return (
                <div
                  key={bot.id}
                  className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:border-accent/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      botColors[bot.bot_type]
                    )}>
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <Badge 
                      variant={bot.is_active ? 'default' : 'secondary'} 
                      className={cn(
                        'text-xs',
                        bot.is_active && 'bg-success/10 text-success border-success/20'
                      )}
                    >
                      {bot.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="mt-3">
                    <p className="font-semibold text-foreground">{bot.name}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <StatusIcon className={cn(
                        'h-3.5 w-3.5',
                        lastRun?.status === 'completed' && 'text-success',
                        lastRun?.status === 'failed' && 'text-destructive',
                        lastRun?.status === 'running' && 'text-accent animate-spin'
                      )} />
                      {lastRun?.completed_at ? (
                        <span>Last run {formatDistanceToNow(new Date(lastRun.completed_at), { addSuffix: true })}</span>
                      ) : lastRun?.status === 'running' ? (
                        <span className="text-accent">Running...</span>
                      ) : (
                        <span>No runs yet</span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-1.5"
                    onClick={() => handleTriggerRun(bot.id, 'daily')}
                    disabled={!bot.is_active || isTriggering}
                  >
                    {isTriggering ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Run Now
                  </Button>
                </div>
              );
            })}
          </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.running}</p>
                <p className="text-sm text-muted-foreground">Running</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Runs Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Run History</CardTitle>
              <CardDescription>{filteredRuns.length} runs</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={botFilter} onValueChange={setBotFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Bots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bots</SelectItem>
                  {bots
                    .filter(bot => bot.bot_type === 'financial_control' || bot.bot_type === selectedCompany?.company_type)
                    .map(bot => (
                    <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-medium">No bot runs found</p>
              <p className="text-muted-foreground">Bot runs will appear here once scheduled or triggered</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Bot</TableHead>
                    <TableHead>Cadence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuns.map((run) => {
                    const StatusIcon = statusIcons[run.status];
                    const bot = getBot(run.bot_id);
                    const duration = run.started_at && run.completed_at
                      ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                      : null;

                    return (
                      <TableRow key={run.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg',
                              bot ? botColors[bot.bot_type] : 'bg-muted'
                            )}>
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium">{getBotName(run.bot_id)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('capitalize', cadenceStyles[run.cadence])}>
                            {run.cadence}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn('gap-1.5 capitalize', statusStyles[run.status])}>
                            <StatusIcon className={cn('h-3 w-3', run.status === 'running' && 'animate-spin')} />
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {run.started_at ? (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(run.started_at), 'MMM d, h:mm a')}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {duration !== null ? (
                            <span className="text-sm text-muted-foreground">{duration}s</span>
                          ) : run.status === 'running' ? (
                            <span className="text-sm text-accent">In progress...</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BotRuns() {
  return (
    <DashboardLayout>
      <BotRunsContent />
    </DashboardLayout>
  );
}
