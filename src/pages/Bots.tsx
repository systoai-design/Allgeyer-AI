import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Settings, Clock, Mail, AlertTriangle, Plus, Trash2, Loader2, Edit2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Bot as BotType, BotSchedule, EmailRecipient, ExceptionThreshold, CadenceType, ExceptionSeverity } from '@/types/database';
import { ScheduleDialog } from '@/components/bots/ScheduleDialog';
import { RecipientDialog } from '@/components/bots/RecipientDialog';
import { ThresholdDialog } from '@/components/bots/ThresholdDialog';

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
  
  const [bots, setBots] = useState<BotType[]>([]);
  const [schedules, setSchedules] = useState<BotSchedule[]>([]);
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [thresholds, setThresholds] = useState<ExceptionThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);

  // Dialog states
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BotSchedule | undefined>();
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<EmailRecipient | undefined>();
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<ExceptionThreshold | undefined>();
  
  // Delete confirmation states
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'schedule' | 'recipient' | 'threshold'; id: string } | null>(null);

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
          const [schedulesRes, recipientsRes, thresholdsRes] = await Promise.all([
            supabase.from('bot_schedules').select('*').eq('company_id', selectedCompany.id),
            supabase.from('email_recipients').select('*').eq('company_id', selectedCompany.id),
            supabase.from('exception_thresholds').select('*').eq('company_id', selectedCompany.id),
          ]);
          
          if (schedulesRes.data) setSchedules(schedulesRes.data as BotSchedule[]);
          if (recipientsRes.data) setRecipients(recipientsRes.data as EmailRecipient[]);
          if (thresholdsRes.data) setThresholds(thresholdsRes.data as ExceptionThreshold[]);
        }
      } catch (error) {
        console.error('Error fetching bot data:', error);
        toast.error('Failed to load bot configuration');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedCompany]);

  // Toggle bot active status
  const handleToggleBotActive = async (bot: BotType, checked: boolean) => {
    const { error } = await supabase
      .from('bots')
      .update({ is_active: checked })
      .eq('id', bot.id);

    if (error) {
      toast.error('Failed to update bot status');
      return;
    }

    setBots(prev => prev.map(b => b.id === bot.id ? { ...b, is_active: checked } : b));
    setSelectedBot(prev => prev?.id === bot.id ? { ...prev, is_active: checked } : prev);
    toast.success(checked ? 'Bot activated' : 'Bot deactivated');
  };

  // Schedule operations
  const handleSaveSchedule = async (data: {
    cadence: CadenceType;
    schedule_time: string;
    timezone: string;
    is_enabled: boolean;
  }) => {
    if (!selectedBot || !selectedCompany) return;

    if (editingSchedule) {
      const { error } = await supabase
        .from('bot_schedules')
        .update({
          schedule_time: data.schedule_time,
          timezone: data.timezone,
          is_enabled: data.is_enabled,
        })
        .eq('id', editingSchedule.id);

      if (error) throw error;

      setSchedules(prev => prev.map(s =>
        s.id === editingSchedule.id
          ? { ...s, ...data }
          : s
      ));
      toast.success('Schedule updated');
    } else {
      const { data: newSchedule, error } = await supabase
        .from('bot_schedules')
        .insert({
          bot_id: selectedBot.id,
          company_id: selectedCompany.id,
          cadence: data.cadence,
          schedule_time: data.schedule_time,
          timezone: data.timezone,
          is_enabled: data.is_enabled,
        })
        .select()
        .single();

      if (error) throw error;

      setSchedules(prev => [...prev, newSchedule as BotSchedule]);
      toast.success('Schedule created');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    const { error } = await supabase.from('bot_schedules').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete schedule');
      return;
    }
    setSchedules(prev => prev.filter(s => s.id !== id));
    toast.success('Schedule deleted');
  };

  // Recipient operations
  const handleSaveRecipient = async (data: {
    email: string;
    cadence: CadenceType;
    recipient_type: 'to' | 'cc' | 'bcc';
  }) => {
    if (!selectedBot || !selectedCompany) return;

    if (editingRecipient) {
      const { error } = await supabase
        .from('email_recipients')
        .update(data)
        .eq('id', editingRecipient.id);

      if (error) throw error;

      setRecipients(prev => prev.map(r =>
        r.id === editingRecipient.id
          ? { ...r, ...data }
          : r
      ));
      toast.success('Recipient updated');
    } else {
      const { data: newRecipient, error } = await supabase
        .from('email_recipients')
        .insert({
          bot_id: selectedBot.id,
          company_id: selectedCompany.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      setRecipients(prev => [...prev, newRecipient as EmailRecipient]);
      toast.success('Recipient added');
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    const { error } = await supabase.from('email_recipients').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete recipient');
      return;
    }
    setRecipients(prev => prev.filter(r => r.id !== id));
    toast.success('Recipient deleted');
  };

  // Threshold operations
  const handleSaveThreshold = async (data: {
    exception_type: string;
    threshold_value: number;
    severity: ExceptionSeverity;
  }) => {
    if (!selectedBot || !selectedCompany) return;

    if (editingThreshold) {
      const { error } = await supabase
        .from('exception_thresholds')
        .update(data)
        .eq('id', editingThreshold.id);

      if (error) throw error;

      setThresholds(prev => prev.map(t =>
        t.id === editingThreshold.id
          ? { ...t, ...data }
          : t
      ));
      toast.success('Threshold updated');
    } else {
      const { data: newThreshold, error } = await supabase
        .from('exception_thresholds')
        .insert({
          bot_id: selectedBot.id,
          company_id: selectedCompany.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      setThresholds(prev => [...prev, newThreshold as ExceptionThreshold]);
      toast.success('Threshold added');
    }
  };

  const handleDeleteThreshold = async (id: string) => {
    const { error } = await supabase.from('exception_thresholds').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete threshold');
      return;
    }
    setThresholds(prev => prev.filter(t => t.id !== id));
    toast.success('Threshold deleted');
  };

  // Trigger manual run
  const handleTriggerRun = async (cadence: CadenceType) => {
    if (!selectedBot || !selectedCompany) return;

    const { error } = await supabase.from('bot_runs').insert({
      bot_id: selectedBot.id,
      company_id: selectedCompany.id,
      cadence,
      status: 'pending',
    });

    if (error) {
      toast.error('Failed to trigger bot run');
      return;
    }

    toast.success(`${cadenceLabels[cadence]} run queued for ${selectedBot.name}`);
  };

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

  const botSchedules = selectedBot ? schedules.filter(s => s.bot_id === selectedBot.id) : [];
  const botRecipients = selectedBot ? recipients.filter(r => r.bot_id === selectedBot.id) : [];
  const botThresholds = selectedBot ? thresholds.filter(t => t.bot_id === selectedBot.id) : [];
  const existingCadences = botSchedules.map(s => s.cadence);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bot Configuration</h1>
          <p className="text-muted-foreground">Configure schedules, recipients, and thresholds</p>
        </div>
        {selectedCompany && (
          <Badge variant="outline" className="text-sm">
            {selectedCompany.name}
          </Badge>
        )}
      </div>

      {!selectedCompany ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No company selected</p>
            <p className="text-muted-foreground">Select a company from the sidebar to configure bots</p>
          </CardContent>
        </Card>
      ) : (
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
                          ? 'border-primary bg-primary/5'
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
                        onCheckedChange={(checked) => handleToggleBotActive(selectedBot, checked)}
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
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingSchedule(undefined);
                            setScheduleDialogOpen(true);
                          }}
                          disabled={existingCadences.length >= 4}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Schedule
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {(['daily', 'weekly', 'monthly', 'quarterly'] as CadenceType[]).map((cadence) => {
                          const schedule = botSchedules.find(s => s.cadence === cadence);
                          return (
                            <div key={cadence} className="flex items-center gap-4 rounded-lg border p-4">
                              <Badge variant="outline" className="capitalize min-w-20 justify-center">
                                {cadence}
                              </Badge>
                              <div className="flex-1">
                                {schedule ? (
                                  <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium">
                                      {schedule.schedule_time}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      {schedule.timezone?.replace('_', ' ').replace('America/', '')}
                                    </span>
                                    <Badge variant={schedule.is_enabled ? 'default' : 'secondary'}>
                                      {schedule.is_enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Not configured</span>
                                )}
                              </div>
                              {schedule ? (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleTriggerRun(cadence)}
                                    title="Run now"
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingSchedule(schedule);
                                      setScheduleDialogOpen(true);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => setDeleteTarget({ type: 'schedule', id: schedule.id })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingSchedule({ cadence } as BotSchedule);
                                    setScheduleDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Configure
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* Recipients Tab */}
                    <TabsContent value="recipients" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Manage email recipients for this bot's reports
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingRecipient(undefined);
                            setRecipientDialogOpen(true);
                          }}
                        >
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
                              <span className="flex-1 font-medium">{recipient.email}</span>
                              <Badge variant="outline" className="capitalize">
                                {recipient.cadence}
                              </Badge>
                              <Badge variant="secondary" className="uppercase text-xs">
                                {recipient.recipient_type}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingRecipient(recipient);
                                  setRecipientDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteTarget({ type: 'recipient', id: recipient.id })}
                              >
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
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingThreshold(undefined);
                            setThresholdDialogOpen(true);
                          }}
                        >
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
                              <span className="flex-1 font-medium capitalize">
                                {threshold.exception_type.replace(/_/g, ' ')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Trigger at: <span className="font-medium">{threshold.threshold_value}</span>
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'capitalize',
                                  threshold.severity === 'critical' && 'border-red-500 text-red-500',
                                  threshold.severity === 'high' && 'border-orange-500 text-orange-500',
                                  threshold.severity === 'medium' && 'border-yellow-500 text-yellow-500',
                                  threshold.severity === 'low' && 'border-blue-500 text-blue-500'
                                )}
                              >
                                {threshold.severity}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingThreshold(threshold);
                                  setThresholdDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteTarget({ type: 'threshold', id: threshold.id })}
                              >
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
      )}

      {/* Dialogs */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        schedule={editingSchedule}
        onSave={handleSaveSchedule}
        existingCadences={existingCadences}
      />

      <RecipientDialog
        open={recipientDialogOpen}
        onOpenChange={setRecipientDialogOpen}
        recipient={editingRecipient}
        onSave={handleSaveRecipient}
      />

      <ThresholdDialog
        open={thresholdDialogOpen}
        onOpenChange={setThresholdDialogOpen}
        threshold={editingThreshold}
        onSave={handleSaveThreshold}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteTarget?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === 'schedule') handleDeleteSchedule(deleteTarget.id);
                if (deleteTarget.type === 'recipient') handleDeleteRecipient(deleteTarget.id);
                if (deleteTarget.type === 'threshold') handleDeleteThreshold(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
