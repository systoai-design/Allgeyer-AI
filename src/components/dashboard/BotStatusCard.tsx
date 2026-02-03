import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Play, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BotRunStatus, CadenceType, BotType } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface BotStatus {
  id: string;
  bot_type: BotType;
  name: string;
  is_active: boolean;
  last_run?: {
    status: BotRunStatus;
    cadence: CadenceType;
    completed_at: string | null;
  };
  next_run?: string;
}

interface BotStatusCardProps {
  bots: BotStatus[];
  isLoading?: boolean;
  onTriggerRun?: (botId: string, cadence: CadenceType) => void;
}

const statusIcons: Record<BotRunStatus, typeof CheckCircle> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle
};

const statusColors: Record<BotRunStatus, string> = {
  pending: 'text-muted-foreground',
  running: 'text-accent animate-spin',
  completed: 'text-success',
  failed: 'text-destructive'
};

const botColors: Record<BotType, string> = {
  financial_control: 'bg-chart-4',
  property_halo: 'bg-company-property-halo',
  unique_painting: 'bg-company-unique-painting',
  ati_security: 'bg-company-ati-security'
};

export function BotStatusCard({ bots, isLoading, onTriggerRun }: BotStatusCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Bot Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Bot Status
        </CardTitle>
        <CardDescription>Current state of all automation bots</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bots.map((bot) => {
            const StatusIcon = bot.last_run ? statusIcons[bot.last_run.status] : Clock;
            const statusColor = bot.last_run ? statusColors[bot.last_run.status] : 'text-muted-foreground';

            return (
              <div
                key={bot.id}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', botColors[bot.bot_type])}>
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{bot.name}</p>
                    <Badge variant={bot.is_active ? 'default' : 'secondary'} className="text-xs">
                      {bot.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {bot.last_run && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <StatusIcon className={cn('h-4 w-4', statusColor)} />
                        {bot.last_run.status === 'completed' && bot.last_run.completed_at
                          ? `Last run ${formatDistanceToNow(new Date(bot.last_run.completed_at), { addSuffix: true })}`
                          : bot.last_run.status}
                      </span>
                    )}
                    {bot.next_run && (
                      <span className="text-sm text-muted-foreground">
                        Next: {formatDistanceToNow(new Date(bot.next_run), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onTriggerRun?.(bot.id, 'daily')}
                  disabled={!bot.is_active}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Run
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
