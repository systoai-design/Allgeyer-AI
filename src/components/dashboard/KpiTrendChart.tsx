import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiTrendChartProps {
  title?: string;
  data: Array<{
    period: string;
    [key: string]: string | number;
  }>;
  lines: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  className?: string;
}

interface KpiTrendChartExtendedProps extends KpiTrendChartProps {
  isLoading?: boolean;
}

export function KpiTrendChart({ title = 'KPI Trends', data, lines, className, isLoading }: KpiTrendChartExtendedProps) {
  if (isLoading) {
    return (
      <Card className={cn('animate-fade-in', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-end justify-around gap-3 pt-8">
            {[40, 65, 45, 80, 55, 70, 60].map((height, i) => (
              <div
                key={i}
                className="flex-1 max-w-12 bg-muted animate-pulse rounded-t-md"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-border/50 bg-card animate-fade-in', className)}>
      <div className="p-5 pb-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-4 w-4" />
          {title}
        </h3>
      </div>
      <div className="px-5 pb-5">
        <div className="h-[250px] animate-scale-in">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border) / 0.5)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ fill: line.color, strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
