import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Search, Eye, Calendar, CheckCircle, Clock, XCircle, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { EmailLog, Bot as BotType, CadenceType } from '@/types/database';

const cadenceStyles: Record<CadenceType, string> = {
  daily: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
  weekly: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  monthly: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  quarterly: 'bg-chart-4/10 text-chart-4 border-chart-4/20'
};

const statusIcons: Record<string, typeof CheckCircle> = {
  sent: CheckCircle,
  pending: Clock,
  failed: XCircle
};

const statusStyles: Record<string, string> = {
  sent: 'bg-success/10 text-success',
  pending: 'bg-muted text-muted-foreground',
  failed: 'bg-destructive/10 text-destructive'
};

interface ReportCardProps {
  email: EmailLog;
  botName: string;
}

function ReportCard({ email, botName }: ReportCardProps) {
  const StatusIcon = statusIcons[email.delivery_status] || Clock;
  const toCount = (email.recipients as { to?: string[] })?.to?.length || 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="group cursor-pointer rounded-2xl border border-border/50 bg-card p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate group-hover:text-foreground transition-colors">
                {email.subject}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {botName}
              </p>
            </div>
            <Badge variant="secondary" className={cn('gap-1 shrink-0', statusStyles[email.delivery_status])}>
              <StatusIcon className="h-3 w-3" />
              {email.delivery_status}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {email.sent_at ? format(parseISO(email.sent_at), 'MMM d, yyyy') : 'Pending'}
            </div>
            <span>{toCount} recipient{toCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{email.subject}</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className={cn('capitalize', cadenceStyles[email.cadence])}>
              {email.cadence}
            </Badge>
            <span className="text-muted-foreground">
              Sent to: {(email.recipients as { to?: string[] })?.to?.join(', ') || 'No recipients'}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 border border-border/50 rounded-xl bg-background p-4">
          {email.html_content ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: email.html_content }}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">No content available</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

function ReportsContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCompany } = useCompanySelector();
  
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [bots, setBots] = useState<BotType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCadence, setActiveCadence] = useState<string>('all');

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

        const { data: emailsData } = await supabase
          .from('email_logs')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .eq('delivery_status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(200);
        if (emailsData) setEmails(emailsData as EmailLog[]);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedCompany]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const getBotName = (botId: string) => bots.find(b => b.id === botId)?.name || 'Unknown Bot';

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCadence = activeCadence === 'all' || email.cadence === activeCadence;
    return matchesSearch && matchesCadence;
  });

  // Group emails by cadence for counts
  const cadenceCounts = {
    all: emails.length,
    daily: emails.filter(e => e.cadence === 'daily').length,
    weekly: emails.filter(e => e.cadence === 'weekly').length,
    monthly: emails.filter(e => e.cadence === 'monthly').length,
    quarterly: emails.filter(e => e.cadence === 'quarterly').length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse historical reports by cadence</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full sm:w-[280px] bg-muted/40 border-0 rounded-xl"
          />
        </div>
      </div>

      {/* Pill-style filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'daily', 'weekly', 'monthly', 'quarterly'] as const).map((cadence) => (
          <button
            key={cadence}
            onClick={() => setActiveCadence(cadence)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2',
              activeCadence === cadence
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
          >
            {cadence.charAt(0).toUpperCase() + cadence.slice(1)}
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              activeCadence === cadence ? 'bg-background/20' : 'bg-muted-foreground/10'
            )}>
              {cadenceCounts[cadence]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ReportCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-12 text-center">
            <div className="rounded-full bg-muted p-4 inline-block mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">No reports found</p>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
              {searchQuery
                ? 'Try adjusting your search query'
                : activeCadence !== 'all'
                ? `No ${activeCadence} reports have been generated yet`
                : 'Once bots run and send reports, they will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger-children">
            {filteredEmails.map((email) => (
              <ReportCard
                key={email.id}
                email={email}
                botName={getBotName(email.bot_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  return (
    <DashboardLayout>
      <ReportsContent />
    </DashboardLayout>
  );
}
