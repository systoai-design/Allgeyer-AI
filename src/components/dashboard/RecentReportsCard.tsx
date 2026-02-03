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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recent Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recent Reports
          </CardTitle>
          <CardDescription>Latest email reports sent</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/emails" className="gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">No reports sent yet</p>
            <p className="text-sm text-muted-foreground">Reports will appear here once bots run</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const StatusIcon = statusIcons[report.delivery_status] || Clock;
              const statusColor = statusColors[report.delivery_status] || 'text-muted-foreground';

              return (
                <div
                  key={report.id}
                  className="flex items-start gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="mt-0.5 rounded-lg bg-muted p-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium truncate">{report.subject}</p>
                      <Badge variant="outline" className={cn('shrink-0 capitalize', cadenceBadgeStyles[report.cadence])}>
                        {report.cadence}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <StatusIcon className={cn('h-4 w-4', statusColor)} />
                        {report.delivery_status}
                      </span>
                      {report.sent_at && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.sent_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
