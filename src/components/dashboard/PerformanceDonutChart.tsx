import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';

interface PerformanceDonutChartProps {
  title?: string;
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}

export function PerformanceDonutChart({ 
  title = 'KPI Status Distribution', 
  data, 
  centerLabel,
  centerValue,
  className 
}: PerformanceDonutChartProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          {centerLabel && centerValue && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-20px' }}>
              <span className="text-2xl font-bold">{centerValue}</span>
              <span className="text-xs text-muted-foreground">{centerLabel}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
