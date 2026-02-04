import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Search, Eye, CheckCircle, Clock, XCircle, Loader2, Download, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { exportEmailLogs } from '@/lib/csvExport';
import { toast } from 'sonner';
import type { EmailLog, Bot as BotType, CadenceType } from '@/types/database';

const cadenceConfig: Record<CadenceType, { label: string; color: string }> = {
  daily: { label: 'Daily', color: 'bg-blue-500' },
  weekly: { label: 'Weekly', color: 'bg-emerald-500' },
  monthly: { label: 'Monthly', color: 'bg-amber-500' },
  quarterly: { label: 'Quarterly', color: 'bg-purple-500' }
};

const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; color: string }> = {
  sent: { icon: CheckCircle, label: 'Sent', color: 'text-emerald-500' },
  pending: { icon: Clock, label: 'Pending', color: 'text-muted-foreground' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-red-500' }
};

function EmailRow({ 
  email, 
  botName, 
  onView 
}: { 
  email: EmailLog; 
  botName: string; 
  onView: () => void;
}) {
  const status = statusConfig[email.delivery_status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const cadence = cadenceConfig[email.cadence];
  const recipientCount = email.recipients?.to?.length || 0;

  return (
    <div className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors duration-200 cursor-pointer rounded-xl" onClick={onView}>
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <div className={cn("w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center", status.color)}>
          <StatusIcon className="h-4 w-4" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground truncate">{email.subject}</h3>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-sm text-muted-foreground">{botName}</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-sm text-muted-foreground">
            {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Cadence badge */}
      <div className="flex-shrink-0 hidden sm:flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", cadence.color)} />
        <span className="text-sm text-muted-foreground">{cadence.label}</span>
      </div>

      {/* Date */}
      <div className="flex-shrink-0 text-right hidden md:block">
        {email.sent_at && (
          <span className="text-sm text-muted-foreground">
            {format(new Date(email.sent_at), 'MMM d, h:mm a')}
          </span>
        )}
      </div>

      {/* View action */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

function FilterPill({ 
  active, 
  onClick, 
  children,
  count
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
        active 
          ? "bg-foreground text-background shadow-sm" 
          : "bg-muted/60 text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className={cn(
          "ml-1.5 text-xs",
          active ? "text-background/70" : "text-muted-foreground/60"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmailsContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCompany } = useCompanySelector();
  
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [bots, setBots] = useState<BotType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cadenceFilter, setCadenceFilter] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          .order('created_at', { ascending: false })
          .limit(100);
        if (emailsData) setEmails(emailsData as EmailLog[]);
      } catch (error) {
        console.error('Error fetching emails:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedCompany]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCadence = cadenceFilter === 'all' || email.cadence === cadenceFilter;
    return matchesSearch && matchesCadence;
  });

  const getBotName = (botId: string) => bots.find(b => b.id === botId)?.name || 'Unknown';

  const cadenceCounts = {
    all: emails.length,
    daily: emails.filter(e => e.cadence === 'daily').length,
    weekly: emails.filter(e => e.cadence === 'weekly').length,
    monthly: emails.filter(e => e.cadence === 'monthly').length,
    quarterly: emails.filter(e => e.cadence === 'quarterly').length,
  };

  const handleViewEmail = (email: EmailLog) => {
    setSelectedEmail(email);
    setIsDialogOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Email Archive</h1>
        <p className="text-muted-foreground text-sm">Browse sent reports and email history</p>
      </div>

      {/* Search and actions bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-muted/40 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-ring/50 placeholder:text-muted-foreground/50"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-4 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (filteredEmails.length === 0) {
              toast.error('No emails to export');
              return;
            }
            exportEmailLogs(filteredEmails, selectedCompany?.name || 'company');
            toast.success('Exported successfully');
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <FilterPill 
          active={cadenceFilter === 'all'} 
          onClick={() => setCadenceFilter('all')}
          count={cadenceCounts.all}
        >
          All
        </FilterPill>
        <FilterPill 
          active={cadenceFilter === 'daily'} 
          onClick={() => setCadenceFilter('daily')}
          count={cadenceCounts.daily}
        >
          Daily
        </FilterPill>
        <FilterPill 
          active={cadenceFilter === 'weekly'} 
          onClick={() => setCadenceFilter('weekly')}
          count={cadenceCounts.weekly}
        >
          Weekly
        </FilterPill>
        <FilterPill 
          active={cadenceFilter === 'monthly'} 
          onClick={() => setCadenceFilter('monthly')}
          count={cadenceCounts.monthly}
        >
          Monthly
        </FilterPill>
        <FilterPill 
          active={cadenceFilter === 'quarterly'} 
          onClick={() => setCadenceFilter('quarterly')}
          count={cadenceCounts.quarterly}
        >
          Quarterly
        </FilterPill>
      </div>

      {/* Email list */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-4">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No emails found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || cadenceFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Sent emails will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredEmails.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                botName={getBotName(email.bot_id)}
                onView={() => handleViewEmail(email)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {!isLoading && filteredEmails.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Email preview dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/30">
            <DialogTitle className="text-lg font-medium">{selectedEmail?.subject}</DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>To: {selectedEmail?.recipients?.to?.join(', ') || 'No recipients'}</span>
              {selectedEmail?.sent_at && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span>{format(new Date(selectedEmail.sent_at), 'MMM d, yyyy at h:mm a')}</span>
                </>
              )}
            </div>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(85vh-80px)]">
            {selectedEmail?.html_content ? (
              <div
                className="p-6 prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
              />
            ) : (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">No content available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Emails() {
  return (
    <DashboardLayout>
      <EmailsContent />
    </DashboardLayout>
  );
}
