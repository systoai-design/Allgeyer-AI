import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Settings, Clock, Mail, AlertTriangle, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Bot as BotType, BotSchedule, EmailRecipient, ExceptionThreshold, CadenceType } from '@/types/database';

const cadenceLabels: Record<CadenceType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly'
};

function BotsContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const { selectedCompany } = useCompanySelector();
  const { toast } = useToast();
  
  const [bots, setBots] = useState<BotType[]>([]);
  const [schedules, setSchedules] = useState<BotSchedule[]>([]);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [thresholds, setThresholds] = useState<ExceptionThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: botsData } = await supabase.from('bots').select('*');
        if (botsData) {
          setBots(botsData as BotType[]);
          if (botsData.length > 0 && !selectedBot) {
            setSelectedBot(botsData[0] as BotType);
          }
        }

        if (selectedCompany) {
          const { data: schedulesData } = await supabase
            .from('bot_schedules')
            .select('*')
            .eq('company_id', selectedCompany.id);
          if (schedulesData) setSchedules(schedulesData as BotSchedule[]);

          const { data: recipientsData } = await supabase
            .from('email_recipients')
            .select('*')
            .eq('company_id', selectedCompany.id);
          if (recipientsData) setRecipients(recipientsData as EmailRecipient[]);

          const { data: thresholdsData } = await supabase
            .from('exception_thresholds')
            .select('*')
            .eq('company_id', selectedCompany.id);
          if (thresholdsData) setThresholds(thresholdsData as ExceptionThreshold[]);
        }
      } catch (error) {
        console.error('Error fetching bot data:', error);
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

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-warning" />
        <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You need admin privileges to access bot configuration.</p>
      </div>
    );
  }

  const botSchedules = selectedBot
    ? schedules.filter(s => s.bot_id === selectedBot.id)
    : [];
  const botRecipients = selectedBot
    ? recipients.filter(r => r.bot_id === selectedBot.id)
    : [];
  const botThresholds = selectedBot
    ? thresholds.filter(t => t.bot_id === selectedBot.id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bot Configuration</h1>
        <p className="text-muted-foreground">Configure schedules, recipients, and thresholds</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Bot Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : (
                bots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => setSelectedBot(bot)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      selectedBot?.id === bot.id
                        ? 'border-accent bg-accent/10'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="rounded-lg bg-muted p-2">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{bot.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {bot.bot_type.replace('_', ' ')}
                      </p>
                    </div>
                    <Badge variant={bot.is_active ? 'default' : 'secondary'} className="text-xs">
                      {bot.is_active ? 'On' : 'Off'}
                    </Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bot Configuration */}
        <div className="lg:col-span-3">
          {selectedBot ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedBot.name}</CardTitle>
                    <CardDescription>{selectedBot.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="bot-active">Active</Label>
                    <Switch
                      id="bot-active"
                      checked={selectedBot.is_active}
                      onCheckedChange={(checked) => {
                        // Would update bot status
                        toast({
                          title: checked ? 'Bot activated' : 'Bot deactivated',
                          description: `${selectedBot.name} is now ${checked ? 'active' : 'inactive'}.`
                        });
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="schedules" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="schedules" className="gap-2">
                      <Clock className="h-4 w-4" />
                      Schedules
                    </TabsTrigger>
                    <TabsTrigger value="recipients" className="gap-2">
                      <Mail className="h-4 w-4" />
                      Recipients
                    </TabsTrigger>
                    <TabsTrigger value="thresholds" className="gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Thresholds
                    </TabsTrigger>
                  </TabsList>

                  {/* Schedules Tab */}
                  <TabsContent value="schedules" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Configure when this bot runs for each cadence
                      </p>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Schedule
                      </Button>
                    </div>
                    
                    {botSchedules.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 font-medium">No schedules configured</p>
                        <p className="text-sm text-muted-foreground">
                          Add schedules to automate this bot's runs
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(['daily', 'weekly', 'monthly', 'quarterly'] as CadenceType[]).map((cadence) => {
                          const schedule = botSchedules.find(s => s.cadence === cadence);
                          return (
                            <div key={cadence} className="flex items-center gap-4 rounded-lg border p-4">
                              <Badge variant="outline" className="capitalize">
                                {cadence}
                              </Badge>
                              <div className="flex-1">
                                {schedule ? (
                                  <div className="flex items-center gap-4">
                                    <span className="text-sm">
                                      Runs at {schedule.schedule_time} ({schedule.timezone})
                                    </span>
                                    <Badge variant={schedule.is_enabled ? 'default' : 'secondary'}>
                                      {schedule.is_enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Not configured</span>
                                )}
                              </div>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Recipients Tab */}
                  <TabsContent value="recipients" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Manage email recipients for this bot's reports
                      </p>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Recipient
                      </Button>
                    </div>
                    
                    {botRecipients.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 font-medium">No recipients configured</p>
                        <p className="text-sm text-muted-foreground">
                          Add email addresses to receive reports
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {botRecipients.map((recipient) => (
                          <div key={recipient.id} className="flex items-center gap-4 rounded-lg border p-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{recipient.email}</span>
                            <Badge variant="outline" className="capitalize">
                              {recipient.cadence}
                            </Badge>
                            <Badge variant="secondary" className="uppercase text-xs">
                              {recipient.recipient_type}
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Thresholds Tab */}
                  <TabsContent value="thresholds" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Set exception thresholds to trigger alerts
                      </p>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Threshold
                      </Button>
                    </div>
                    
                    {botThresholds.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 font-medium">No thresholds configured</p>
                        <p className="text-sm text-muted-foreground">
                          Add thresholds to trigger exception alerts
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {botThresholds.map((threshold) => (
                          <div key={threshold.id} className="flex items-center gap-4 rounded-lg border p-3">
                            <span className="flex-1 font-medium">{threshold.exception_type}</span>
                            <span className="text-sm text-muted-foreground">
                              Trigger at: {threshold.threshold_value}
                            </span>
                            <Badge variant="outline" className="capitalize">
                              {threshold.severity}
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-medium">Select a bot</p>
                <p className="text-muted-foreground">Choose a bot from the list to configure it</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Bots() {
  return (
    <DashboardLayout>
      <BotsContent />
    </DashboardLayout>
  );
}
