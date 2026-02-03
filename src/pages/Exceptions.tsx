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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Exceptions</h1>
        <p className="text-muted-foreground">Manage and resolve flagged items</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.open}</p>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-warning/10 p-3">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.in_progress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-success/10 p-3">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Exceptions</CardTitle>
              <CardDescription>{filteredExceptions.length} items</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
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
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
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
                <SelectTrigger className="w-[130px]">
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
        </CardHeader>
        <CardContent>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exception</TableHead>
                  <TableHead>Bot</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExceptions.map((exception) => (
                  <TableRow key={exception.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{exception.title}</p>
                        <p className="text-sm text-muted-foreground">{exception.exception_type}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getBotName(exception.bot_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize', severityStyles[exception.severity])}>
                        {exception.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('capitalize', statusStyles[exception.status])}>
                        {exception.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(exception.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
