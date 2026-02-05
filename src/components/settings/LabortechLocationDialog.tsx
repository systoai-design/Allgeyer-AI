import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink } from 'lucide-react';
import { z } from 'zod';

const locationIdSchema = z.string()
  .min(1, 'Location ID is required')
  .max(100, 'Location ID must be less than 100 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Location ID can only contain letters, numbers, hyphens, and underscores');

interface LabortechLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (locationId: string) => Promise<void>;
  connecting: boolean;
}

export function LabortechLocationDialog({
  open,
  onOpenChange,
  onConnect,
  connecting
}: LabortechLocationDialogProps) {
  const [locationId, setLocationId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    
    const result = locationIdSchema.safeParse(locationId.trim());
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    try {
      await onConnect(result.data);
      setLocationId('');
      onOpenChange(false);
    } catch (err) {
      // Error is handled by parent
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!connecting) {
      if (!newOpen) {
        setLocationId('');
        setError(null);
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to Labortech (GoHighLevel)</DialogTitle>
          <DialogDescription>
            Enter your GHL Location ID to connect this company to Labortech for lead tracking.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="location-id">Location ID</Label>
            <Input
              id="location-id"
              placeholder="e.g., abc123XYZ"
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                if (error) setError(null);
              }}
              disabled={connecting}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Where to find your Location ID:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Log in to your GoHighLevel account</li>
              <li>Go to <strong>Settings → Business Profile</strong></li>
              <li>Copy the <strong>Location ID</strong> from the URL or settings</li>
            </ol>
            <a 
              href="https://help.gohighlevel.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
            >
              <ExternalLink className="h-3 w-3" />
              GHL Help Center
            </a>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={connecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={connecting || !locationId.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {connecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
