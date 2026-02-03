import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { ExceptionSeverity, ExceptionThreshold } from '@/types/database';

interface ThresholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threshold?: Partial<ExceptionThreshold>;
  onSave: (data: {
    exception_type: string;
    threshold_value: number;
    severity: ExceptionSeverity;
  }) => Promise<void>;
}

const exceptionTypes = [
  { value: 'uncategorized_transactions', label: 'Uncategorized Transactions' },
  { value: 'duplicate_transactions', label: 'Duplicate Transactions' },
  { value: 'missing_receipts', label: 'Missing Receipts' },
  { value: 'unreconciled_accounts', label: 'Unreconciled Accounts' },
  { value: 'stale_leads', label: 'Stale Leads (No Follow-up)' },
  { value: 'unpaid_jobs', label: 'Completed Jobs Unpaid' },
  { value: 'overdue_estimates', label: 'Overdue Estimates' },
];

const severityOptions: { value: ExceptionSeverity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-blue-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'critical', label: 'Critical', color: 'text-red-500' },
];

export function ThresholdDialog({
  open,
  onOpenChange,
  threshold,
  onSave,
}: ThresholdDialogProps) {
  const isEditing = !!threshold?.id;
  const [exceptionType, setExceptionType] = useState(threshold?.exception_type || '');
  const [thresholdValue, setThresholdValue] = useState(threshold?.threshold_value?.toString() || '5');
  const [severity, setSeverity] = useState<ExceptionSeverity>(threshold?.severity || 'medium');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!exceptionType) {
      setError('Please select an exception type');
      return;
    }
    
    const value = parseFloat(thresholdValue);
    if (isNaN(value) || value < 0) {
      setError('Please enter a valid threshold value');
      return;
    }
    
    setError(null);
    setIsSaving(true);
    
    try {
      await onSave({
        exception_type: exceptionType,
        threshold_value: value,
        severity,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Threshold' : 'Add Threshold'}</DialogTitle>
          <DialogDescription>
            Configure exception thresholds to trigger alerts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="exception_type">Exception Type</Label>
            <Select value={exceptionType} onValueChange={setExceptionType}>
              <SelectTrigger className={error && !exceptionType ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select exception type" />
              </SelectTrigger>
              <SelectContent>
                {exceptionTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold_value">Threshold Value</Label>
            <Input
              id="threshold_value"
              type="number"
              min="0"
              value={thresholdValue}
              onChange={(e) => {
                setThresholdValue(e.target.value);
                setError(null);
              }}
              placeholder="e.g., 5"
            />
            <p className="text-xs text-muted-foreground">
              Trigger an exception when count exceeds this value
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as ExceptionSeverity)}>
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className={s.color}>{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Threshold'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
