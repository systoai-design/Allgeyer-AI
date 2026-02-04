import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExceptionBarChartProps {
  title?: string;
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  className?: string;
  isLoading?: boolean;
}

export function ExceptionBarChart({ 
  title = 'Exceptions by Severity', 
  data, 
  className,
  isLoading 
}: ExceptionBarChartProps) {
  if (isLoading) {
    return (
      <Card className={cn('animate-fade-in', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col justify-center gap-4 py-4">
            {[70, 50, 35, 20].map((width, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-16 h-3 bg-muted animate-pulse rounded" />
                <div 
                  className="h-6 bg-muted animate-pulse rounded"
                  style={{ width: `${width}%` }}
                />
              </div>
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
          <AlertTriangle className="h-4 w-4" />
          {title}
        </h3>
      </div>
      <div className="px-5 pb-5">
        <div className="h-[200px] animate-scale-in">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                type="category" 
                dataKey="name" 
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
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
