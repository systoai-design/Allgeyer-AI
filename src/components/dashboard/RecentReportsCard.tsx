import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Mail, Calendar, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { CadenceType } from '@/types/database';
import { formatDistanceToNow, format } from 'date-fns';

interface ReportItem {
  id: string;
  subject: string;
  cadence: CadenceType;
  sent_at: string | null;
  delivery_status: string;
  bot_name?: string;
}

interface RecentReportsCardProps {
  reports: ReportItem[];
  isLoading?: boolean;
}

const cadenceBadgeStyles: Record<CadenceType, string> = {
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

const statusColors: Record<string, string> = {
  sent: 'text-success',
  pending: 'text-muted-foreground',
  failed: 'text-destructive'
};

export function RecentReportsCard({ reports, isLoading }: RecentReportsCardProps) {
  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recent Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 rounded-lg border p-3">
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                    <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card animate-fade-in">
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Mail className="h-4 w-4" />
            Recent Reports
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">Latest email reports sent</p>
        </div>
        <Button variant="ghost" size="sm" asChild className="rounded-full text-muted-foreground hover:text-foreground">
          <Link to="/emails" className="gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="px-2 pb-2">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No reports sent yet</p>
            <p className="text-sm text-muted-foreground">Reports will appear here once bots run</p>
          </div>
        ) : (
          <div className="space-y-1 stagger-children">
            {reports.map((report) => {
              const StatusIcon = statusIcons[report.delivery_status] || Clock;
              const statusColor = statusColors[report.delivery_status] || 'text-muted-foreground';

              return (
                <div
                  key={report.id}
                  className="group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-muted/50 cursor-pointer"
                >
                  <div className="rounded-xl bg-muted/60 p-2.5 shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{report.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusIcon className={cn('h-3.5 w-3.5', statusColor)} />
                      <span className="text-sm text-muted-foreground">
                        {report.sent_at ? format(new Date(report.sent_at), 'MMM d, h:mm a') : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 capitalize text-xs', cadenceBadgeStyles[report.cadence])}>
                    {report.cadence}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
