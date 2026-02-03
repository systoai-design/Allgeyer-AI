import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { CadenceType, BotSchedule } from '@/types/database';

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: Partial<BotSchedule>;
  onSave: (data: {
    cadence: CadenceType;
    schedule_time: string;
    timezone: string;
    is_enabled: boolean;
  }) => Promise<void>;
  existingCadences: CadenceType[];
}

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
];

const cadenceOptions: { value: CadenceType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

export function ScheduleDialog({
  open,
  onOpenChange,
  schedule,
  onSave,
  existingCadences,
}: ScheduleDialogProps) {
  const isEditing = !!schedule?.id;
  const [cadence, setCadence] = useState<CadenceType>(schedule?.cadence || 'daily');
  const [scheduleTime, setScheduleTime] = useState(schedule?.schedule_time || '08:00');
  const [timezone, setTimezone] = useState(schedule?.timezone || 'America/New_York');
  const [isEnabled, setIsEnabled] = useState(schedule?.is_enabled ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const availableCadences = isEditing
    ? cadenceOptions
    : cadenceOptions.filter(c => !existingCadences.includes(c.value));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ cadence, schedule_time: scheduleTime, timezone, is_enabled: isEnabled });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Schedule' : 'Add Schedule'}</DialogTitle>
          <DialogDescription>
            Configure when the bot should run automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cadence">Cadence</Label>
            <Select
              value={cadence}
              onValueChange={(v) => setCadence(v as CadenceType)}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cadence" />
              </SelectTrigger>
              <SelectContent>
                {availableCadences.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule_time">Run Time</Label>
            <Input
              id="schedule_time"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="is_enabled" className="cursor-pointer">
              Enable this schedule
            </Label>
            <Switch
              id="is_enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
