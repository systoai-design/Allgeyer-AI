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
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Search, Filter, CheckCircle, Clock, XCircle, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { exportExceptions } from '@/lib/csvExport';
import { toast } from 'sonner';
import type { Exception, ExceptionSeverity, ExceptionStatus, Bot } from '@/types/database';

const severityStyles: Record<ExceptionSeverity, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/10 text-warning border-warning/20',
  high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400',
  critical: 'bg-destructive/10 text-destructive border-destructive/20'
};

const statusStyles: Record<ExceptionStatus, string> = {
  open: 'bg-destructive/10 text-destructive',
  in_progress: 'bg-warning/10 text-warning',
  resolved: 'bg-success/10 text-success',
  dismissed: 'bg-muted text-muted-foreground'
};

function ExceptionsContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCompany } = useCompanySelector();
  
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

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
        // Fetch bots
        const { data: botsData } = await supabase.from('bots').select('*');
        if (botsData) setBots(botsData as Bot[]);

        // Fetch exceptions
        let query = supabase
          .from('exceptions')
          .select('*')
          .eq('company_id', selectedCompany.id)
          .order('created_at', { ascending: false });

        const { data: exceptionsData } = await query;
        if (exceptionsData) setExceptions(exceptionsData as Exception[]);
      } catch (error) {
        console.error('Error fetching exceptions:', error);
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

  // Filter exceptions
  const filteredExceptions = exceptions.filter(ex => {
    const matchesSearch = ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.exception_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ex.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || ex.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getBotName = (botId: string) => bots.find(b => b.id === botId)?.name || 'Unknown';

  const counts = {
    open: exceptions.filter(e => e.status === 'open').length,
    in_progress: exceptions.filter(e => e.status === 'in_progress').length,
    resolved: exceptions.filter(e => e.status === 'resolved').length
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Exceptions</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and resolve flagged items</p>
      </div>

      {/* Stats - Pill style */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-5 py-4">
          <div className="rounded-full bg-destructive/10 p-2.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{counts.open}</p>
            <p className="text-sm text-muted-foreground">Open</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-5 py-4">
          <div className="rounded-full bg-warning/10 p-2.5">
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{counts.in_progress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-5 py-4">
          <div className="rounded-full bg-success/10 p-2.5">
            <CheckCircle className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{counts.resolved}</p>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border/50 bg-card">
        <div className="p-5 border-b border-border/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">All Exceptions</h2>
              <p className="text-sm text-muted-foreground">{filteredExceptions.length} items</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  if (filteredExceptions.length === 0) {
                    toast.error('No exceptions to export');
                    return;
                  }
                  const exportData = filteredExceptions.map(ex => ({
                    ...ex,
                    bot_name: getBotName(ex.bot_id)
                  }));
                  exportExceptions(exportData, selectedCompany?.name || 'company');
                  toast.success('Exceptions exported successfully');
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px] bg-muted/40 border-0 rounded-xl"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] rounded-xl bg-muted/40 border-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[130px] rounded-xl bg-muted/40 border-0">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExceptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-medium">No exceptions found</p>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || severityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All caught up! No issues to address.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredExceptions.map((exception) => (
                <div
                  key={exception.id}
                  className="group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-muted/50 cursor-pointer"
                >
                  <div className={cn(
                    'rounded-full p-2 shrink-0',
                    exception.severity === 'critical' ? 'bg-destructive/10' :
                    exception.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/20' :
                    exception.severity === 'medium' ? 'bg-warning/10' : 'bg-muted'
                  )}>
                    <AlertTriangle className={cn(
                      'h-4 w-4',
                      exception.severity === 'critical' ? 'text-destructive' :
                      exception.severity === 'high' ? 'text-orange-600 dark:text-orange-400' :
                      exception.severity === 'medium' ? 'text-warning' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{exception.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {exception.exception_type} • {getBotName(exception.bot_id)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className={cn('capitalize text-xs', severityStyles[exception.severity])}>
                      {exception.severity}
                    </Badge>
                    <Badge variant="secondary" className={cn('capitalize text-xs', statusStyles[exception.status])}>
                      {exception.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden lg:inline">
                      {formatDistanceToNow(new Date(exception.created_at), { addSuffix: true })}
                    </span>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Exceptions() {
  return (
    <DashboardLayout>
      <ExceptionsContent />
    </DashboardLayout>
  );
}
