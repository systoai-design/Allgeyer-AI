import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Search, Eye, CheckCircle, Clock, XCircle, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { exportEmailLogs } from '@/lib/csvExport';
import { toast } from 'sonner';
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Email Archive</h1>
        <p className="text-muted-foreground">View all sent reports and email history</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Sent Emails
              </CardTitle>
              <CardDescription>{filteredEmails.length} emails</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (filteredEmails.length === 0) {
                    toast.error('No emails to export');
                    return;
                  }
                  exportEmailLogs(filteredEmails, selectedCompany?.name || 'company');
                  toast.success('Email logs exported successfully');
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={cadenceFilter} onValueChange={setCadenceFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Cadence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cadence</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
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
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-medium">No emails found</p>
              <p className="text-muted-foreground">
                {searchQuery || cadenceFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Emails will appear here once bots send reports'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Bot</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.map((email) => {
                  const StatusIcon = statusIcons[email.delivery_status] || Clock;
                  const toCount = email.recipients?.to?.length || 0;

                  return (
                    <TableRow key={email.id}>
                      <TableCell>
                        <span className="font-medium">{email.subject}</span>
                      </TableCell>
                      <TableCell>{getBotName(email.bot_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize', cadenceStyles[email.cadence])}>
                          {email.cadence}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {toCount} recipient{toCount !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('gap-1 capitalize', statusStyles[email.delivery_status])}>
                          <StatusIcon className="h-3 w-3" />
                          {email.delivery_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {email.sent_at ? (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(email.sent_at), 'MMM d, h:mm a')}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEmail(email)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>{email.subject}</DialogTitle>
                              <DialogDescription>
                                Sent to: {email.recipients?.to?.join(', ') || 'No recipients'}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                              {email.html_content ? (
                                <div
                                  className="prose prose-sm max-w-none dark:prose-invert"
                                  dangerouslySetInnerHTML={{ __html: email.html_content }}
                                />
                              ) : (
                                <p className="text-muted-foreground">No content available</p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
