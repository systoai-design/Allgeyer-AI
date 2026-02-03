import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Loader2, Link2, CheckCircle2, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Integration } from '@/types/database';

function SettingsContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const { selectedCompany, availableCompanies } = useCompanySelector();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch integrations for selected company
  useEffect(() => {
    async function fetchIntegrations() {
      if (!selectedCompany) return;
      
      setLoadingIntegrations(true);
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', selectedCompany.id);

      if (error) {
        console.error('Error fetching integrations:', error);
      } else {
        setIntegrations(data as Integration[]);
      }
      setLoadingIntegrations(false);
    }

    fetchIntegrations();
  }, [selectedCompany]);

  const handleConnectQBO = async () => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    setConnecting(true);
    try {
      // Build the URL with query params for authorization
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qbo-oauth?action=authorize&company_id=${selectedCompany.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        result.auth_url,
        'QuickBooks Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          setConnecting(false);
          // Refresh integrations
          if (selectedCompany) {
            supabase
              .from('integrations')
              .select('*')
              .eq('company_id', selectedCompany.id)
              .then(({ data }) => {
                if (data) setIntegrations(data as Integration[]);
              });
          }
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting to QBO:', error);
      toast.error('Failed to initiate QuickBooks connection');
      setConnecting(false);
    }
  };

  const handleDisconnectQBO = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ is_connected: false, config: {} })
        .eq('id', integrationId);

      if (error) throw error;

      toast.success('QuickBooks disconnected');
      setIntegrations(prev => 
        prev.map(i => i.id === integrationId ? { ...i, is_connected: false, config: {} } : i)
      );
    } catch (error) {
      console.error('Error disconnecting QBO:', error);
      toast.error('Failed to disconnect QuickBooks');
    }
  };

  const qboIntegration = integrations.find(i => i.integration_type === 'quickbooks');
  const isQBOConnected = qboIntegration?.is_connected;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Platform configuration and integrations</p>
      </div>

      {/* QuickBooks Integration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2CA01C]/10">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#2CA01C">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4zm-1.2 4.8c-2.651 0-4.8 2.149-4.8 4.8s2.149 4.8 4.8 4.8v-2.4c-1.325 0-2.4-1.075-2.4-2.4s1.075-2.4 2.4-2.4v-2.4zm2.4 0v2.4c1.325 0 2.4 1.075 2.4 2.4s-1.075 2.4-2.4 2.4v2.4c2.651 0 4.8-2.149 4.8-4.8s-2.149-4.8-4.8-4.8z"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg">QuickBooks Online</CardTitle>
                <CardDescription>Financial data integration</CardDescription>
              </div>
            </div>
            {isQBOConnected ? (
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                <XCircle className="mr-1 h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCompany ? (
            <>
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Company</p>
                    <p className="text-lg font-semibold">{selectedCompany.name}</p>
                  </div>
                  {isQBOConnected && qboIntegration?.last_sync_at && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Last Sync</p>
                      <p className="text-sm font-medium">
                        {new Date(qboIntegration.last_sync_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {isQBOConnected ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => toast.info('Sync functionality coming soon')}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => qboIntegration && handleDisconnectQBO(qboIntegration.id)}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-[#2CA01C] hover:bg-[#248017] text-white"
                  onClick={handleConnectQBO}
                  disabled={connecting || loadingIntegrations}
                >
                  {connecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Connect to QuickBooks
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p>Please select a company from the sidebar to manage integrations.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Integrations Card */}
      <Card>
        <CardHeader>
          <CardTitle>Other Integrations</CardTitle>
          <CardDescription>Additional platform connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { name: 'PETE CRM', description: 'Real estate lead tracking', company: 'Property Halo' },
              { name: 'Labortech', description: 'Lead management', company: 'Unique Painting, ATI Security' },
              { name: 'Jobber', description: 'Jobs and estimates', company: 'Unique Painting, ATI Security' },
            ].map((integration) => (
              <div
                key={integration.name}
                className="rounded-lg border bg-card p-4 opacity-60"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{integration.name}</h3>
                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{integration.description}</p>
                <p className="text-xs text-muted-foreground mt-1">For: {integration.company}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Contact Card */}
      <Card>
        <CardHeader>
          <CardTitle>Support</CardTitle>
          <CardDescription>Get help with the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            For questions about integrations or platform issues, contact your organization's administrator.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/privacy" target="_blank">
                <ExternalLink className="mr-2 h-3 w-3" />
                Privacy Policy
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/terms" target="_blank">
                <ExternalLink className="mr-2 h-3 w-3" />
                Terms of Service
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  return (
    <DashboardLayout>
      <SettingsContent />
    </DashboardLayout>
  );
}
