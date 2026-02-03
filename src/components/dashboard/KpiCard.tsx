import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KpiStatus } from '@/types/database';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  status?: KpiStatus;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  status,
  trend,
  className
}: KpiCardProps) {
  const statusStyles: Record<KpiStatus, string> = {
    on_track: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    critical: 'bg-destructive/10 text-destructive border-destructive/20'
  };

  const statusLabels: Record<KpiStatus, string> = {
    on_track: 'On Track',
    warning: 'Warning',
    critical: 'Critical'
  };

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
        ? TrendingDown
        : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? 'text-success'
      : trend.value < 0
        ? 'text-destructive'
        : 'text-muted-foreground'
    : '';

  return (
    <Card className={cn(
      'relative overflow-hidden border-border/50 transition-all hover:border-border hover:shadow-sm',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground line-clamp-1">
          {title}
        </CardTitle>
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {status && (
            <Badge variant="outline" className={cn('text-xs font-medium', statusStyles[status])}>
              {statusLabels[status]}
            </Badge>
          )}
        </div>
        {(trend || subtitle) && (
          <div className="mt-2 flex items-center gap-2">
            {trend && TrendIcon && (
              <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
            {(subtitle || trend?.label) && (
              <span className="text-xs text-muted-foreground">
                {subtitle || trend?.label}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
