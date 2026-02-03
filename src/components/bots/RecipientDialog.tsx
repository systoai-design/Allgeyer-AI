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
import type { CadenceType, EmailRecipient } from '@/types/database';
import { z } from 'zod';

interface RecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient?: Partial<EmailRecipient>;
  onSave: (data: {
    email: string;
    cadence: CadenceType;
    recipient_type: 'to' | 'cc' | 'bcc';
  }) => Promise<void>;
}

const emailSchema = z.string().email('Please enter a valid email address');

const cadenceOptions: { value: CadenceType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const recipientTypes: { value: 'to' | 'cc' | 'bcc'; label: string }[] = [
  { value: 'to', label: 'To (Primary)' },
  { value: 'cc', label: 'CC (Copy)' },
  { value: 'bcc', label: 'BCC (Hidden Copy)' },
];

export function RecipientDialog({
  open,
  onOpenChange,
  recipient,
  onSave,
}: RecipientDialogProps) {
  const isEditing = !!recipient?.id;
  const [email, setEmail] = useState(recipient?.email || '');
  const [cadence, setCadence] = useState<CadenceType>(recipient?.cadence || 'daily');
  const [recipientType, setRecipientType] = useState<'to' | 'cc' | 'bcc'>(
    (recipient?.recipient_type as 'to' | 'cc' | 'bcc') || 'to'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    // Validate email
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError(null);

    setIsSaving(true);
    try {
      await onSave({
        email: email.trim(),
        cadence,
        recipient_type: recipientType,
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
          <DialogTitle>{isEditing ? 'Edit Recipient' : 'Add Recipient'}</DialogTitle>
          <DialogDescription>
            Configure an email recipient for this bot's reports.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="name@company.com"
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cadence">Report Cadence</Label>
            <Select
              value={cadence}
              onValueChange={(v) => setCadence(v as CadenceType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cadence" />
              </SelectTrigger>
              <SelectContent>
                {cadenceOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient_type">Recipient Type</Label>
            <Select
              value={recipientType}
              onValueChange={(v) => setRecipientType(v as 'to' | 'cc' | 'bcc')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {recipientTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Recipient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
