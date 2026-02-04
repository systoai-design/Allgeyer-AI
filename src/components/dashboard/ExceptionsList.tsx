import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { ExceptionSeverity, ExceptionStatus } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface ExceptionItem {
  id: string;
  title: string;
  exception_type: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  created_at: string;
  bot_name?: string;
}

interface ExceptionsListProps {
  exceptions: ExceptionItem[];
  isLoading?: boolean;
}

const severityStyles: Record<ExceptionSeverity, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/10 text-warning border-warning/20',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-destructive/10 text-destructive border-destructive/20'
};

const statusStyles: Record<ExceptionStatus, string> = {
  open: 'bg-destructive/10 text-destructive',
  in_progress: 'bg-warning/10 text-warning',
  resolved: 'bg-success/10 text-success',
  dismissed: 'bg-muted text-muted-foreground'
};

export function ExceptionsList({ exceptions, isLoading }: ExceptionsListProps) {
  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Recent Exceptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 rounded-lg border p-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                    <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
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
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Recent Exceptions
          </CardTitle>
          <CardDescription>Items requiring attention</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="transition-colors hover:bg-accent/10">
          <Link to="/exceptions" className="gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {exceptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="rounded-full bg-success/10 p-3 mb-3">
              <AlertTriangle className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium">No open exceptions</p>
            <p className="text-sm text-muted-foreground">Everything is running smoothly</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {exceptions.map((exception) => (
              <div
                key={exception.id}
                className={cn(
                  'flex items-start gap-4 rounded-lg border p-3',
                  'transition-all duration-200 ease-out cursor-pointer',
                  'hover:bg-muted/50 hover:border-border hover:shadow-sm hover:-translate-y-0.5',
                  'active:translate-y-0 active:scale-[0.995]'
                )}
              >
                <div className={cn(
                  'mt-0.5 rounded-full p-1.5 transition-colors',
                  exception.severity === 'critical' ? 'bg-destructive/10' :
                  exception.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/20' :
                  'bg-warning/10'
                )}>
                  <AlertTriangle className={cn(
                    'h-4 w-4',
                    exception.severity === 'critical' ? 'text-destructive' :
                    exception.severity === 'high' ? 'text-orange-600 dark:text-orange-400' :
                    'text-warning'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium truncate">{exception.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {exception.exception_type}
                        {exception.bot_name && ` • ${exception.bot_name}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0 transition-colors', severityStyles[exception.severity])}>
                      {exception.severity}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Badge variant="secondary" className={cn('text-xs transition-colors', statusStyles[exception.status])}>
                      {exception.status.replace('_', ' ')}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(exception.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
