import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector } from '@/hooks/useCompanySelector';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, CheckCircle2, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Integration } from '@/types/database';
import { CompanyIntegrationStatus } from '@/components/settings/CompanyIntegrationStatus';

function SettingsContent() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const { selectedCompany, availableCompanies } = useCompanySelector();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [connectingQBO, setConnectingQBO] = useState(false);
  const [connectingJobber, setConnectingJobber] = useState(false);
  const [syncingJobber, setSyncingJobber] = useState(false);
  const [syncingPete, setSyncingPete] = useState(false);
  const [syncingLabortech, setSyncingLabortech] = useState(false);
  const [testingLabortech, setTestingLabortech] = useState(false);

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

    setConnectingQBO(true);
    try {
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
          setConnectingQBO(false);
          
          window.dispatchEvent(new CustomEvent('qbo-connection-updated'));
          
          if (selectedCompany) {
            supabase
              .from('integrations')
              .select('*')
              .eq('company_id', selectedCompany.id)
              .then(({ data }) => {
                if (data) setIntegrations(data as Integration[]);
              });
          }
          
          toast.success('Connection updated - refreshing status...');
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting to QBO:', error);
      toast.error('Failed to initiate QuickBooks connection');
      setConnectingQBO(false);
    }
  };

  const handleConnectJobber = async () => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    setConnectingJobber(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jobber-oauth?action=authorize&company_id=${selectedCompany.id}`,
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
        'Jobber Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          setConnectingJobber(false);
          
          window.dispatchEvent(new CustomEvent('jobber-connection-updated'));
          
          if (selectedCompany) {
            supabase
              .from('integrations')
              .select('*')
              .eq('company_id', selectedCompany.id)
              .then(({ data }) => {
                if (data) setIntegrations(data as Integration[]);
              });
          }
          
          toast.success('Jobber connection updated - refreshing status...');
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting to Jobber:', error);
      toast.error('Failed to initiate Jobber connection');
      setConnectingJobber(false);
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

  const handleDisconnectJobber = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ is_connected: false, config: {} })
        .eq('id', integrationId);

      if (error) throw error;

      toast.success('Jobber disconnected');
      setIntegrations(prev => 
        prev.map(i => i.id === integrationId ? { ...i, is_connected: false, config: {} } : i)
      );
    } catch (error) {
      console.error('Error disconnecting Jobber:', error);
      toast.error('Failed to disconnect Jobber');
    }
  };

  const handleSyncJobber = async () => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    setSyncingJobber(true);
    try {
      // Test the connection by fetching some data from Jobber
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jobber-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: selectedCompany.id,
            query: `
              query {
                account {
                  id
                  name
                }
                clients(first: 5) {
                  nodes {
                    id
                    firstName
                    lastName
                    companyName
                  }
                  totalCount
                }
                jobs(first: 5) {
                  nodes {
                    id
                    title
                    jobNumber
                    jobStatus
                  }
                  totalCount
                }
              }
            `,
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Update the last_sync_at timestamp
      const { error: updateError } = await supabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('company_id', selectedCompany.id)
        .eq('integration_type', 'jobber');

      if (updateError) {
        console.error('Error updating sync timestamp:', updateError);
      }

      // Refresh integrations to show new sync time
      const { data: updatedIntegrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', selectedCompany.id);

      if (updatedIntegrations) {
        setIntegrations(updatedIntegrations as Integration[]);
      }

      const accountName = result.data?.account?.name || 'Unknown';
      const clientCount = result.data?.clients?.totalCount || 0;
      const jobCount = result.data?.jobs?.totalCount || 0;

      toast.success(
        `Jobber sync successful! Account: ${accountName}, ${clientCount} clients, ${jobCount} jobs`
      );
    } catch (error) {
      console.error('Error syncing Jobber:', error);
      toast.error(`Failed to sync with Jobber: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncingJobber(false);
    }
  };

  const qboIntegration = integrations.find(i => i.integration_type === 'quickbooks');
  const isQBOConnected = qboIntegration?.is_connected;
  
  const jobberIntegration = integrations.find(i => i.integration_type === 'jobber');
  const isJobberConnected = jobberIntegration?.is_connected;

  const peteIntegration = integrations.find(i => i.integration_type === 'pete_crm');
  const isPeteConnected = peteIntegration?.is_connected;

  const labortechIntegration = integrations.find(i => i.integration_type === 'labortech');
  const isLabortechConnected = labortechIntegration?.is_connected;

  const handleSyncPete = async () => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    setSyncingPete(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-pete-scraper`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: selectedCompany.id,
            cadence: 'daily',
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to sync PETE CRM');
      }

      // Update the last_sync_at timestamp
      const { error: updateError } = await supabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('company_id', selectedCompany.id)
        .eq('integration_type', 'pete_crm');

      if (updateError) {
        console.error('Error updating sync timestamp:', updateError);
      }

      // Refresh integrations to show new sync time
      const { data: updatedIntegrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', selectedCompany.id);

      if (updatedIntegrations) {
        setIntegrations(updatedIntegrations as Integration[]);
      }

      toast.success(
        `PETE CRM sync successful! Extracted ${result.kpiCount} KPIs: ${Object.keys(result.kpis).join(', ')}`
      );
    } catch (error) {
      console.error('Error syncing PETE:', error);
      toast.error(`Failed to sync PETE CRM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncingPete(false);
    }
  };

  const handleTestLabortech = async () => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    setTestingLabortech(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/labortech-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: selectedCompany.id,
            action: 'test_connection',
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Create or update the labortech integration record
      const existingIntegration = integrations.find(i => i.integration_type === 'labortech');
      
      if (existingIntegration) {
        await supabase
          .from('integrations')
          .update({ 
            is_connected: true, 
            last_sync_at: new Date().toISOString(),
            config: {
              ...(existingIntegration.config || {}),
              token_type: result.token_type,
              locations: result.locations,
            }
          })
          .eq('id', existingIntegration.id);
      } else {
        await supabase
          .from('integrations')
          .insert({
            company_id: selectedCompany.id,
            integration_type: 'labortech',
            is_connected: true,
            last_sync_at: new Date().toISOString(),
            config: {
              token_type: result.token_type,
              locations: result.locations,
            }
          });
      }

      // Refresh integrations
      const { data: updatedIntegrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', selectedCompany.id);

      if (updatedIntegrations) {
        setIntegrations(updatedIntegrations as Integration[]);
      }

      const locationCount = result.locations?.length || 0;
      toast.success(
        `Labortech connected! Found ${locationCount} location${locationCount !== 1 ? 's' : ''}`
      );
    } catch (error) {
      console.error('Error testing Labortech:', error);
      toast.error(`Failed to connect Labortech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingLabortech(false);
    }
  };

  const handleSyncLabortech = async () => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    setSyncingLabortech(true);
    try {
      // Get location_id from config
      const config = labortechIntegration?.config as { location_id?: string; locations?: Array<{ id: string }> } | undefined;
      const locationId = config?.location_id || config?.locations?.[0]?.id;

      if (!locationId) {
        toast.error('No location configured. Please set a location ID first.');
        setSyncingLabortech(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/labortech-api`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: selectedCompany.id,
            action: 'get_contacts',
            location_id: locationId,
            limit: 100,
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Update the last_sync_at timestamp
      await supabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('company_id', selectedCompany.id)
        .eq('integration_type', 'labortech');

      // Refresh integrations
      const { data: updatedIntegrations } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', selectedCompany.id);

      if (updatedIntegrations) {
        setIntegrations(updatedIntegrations as Integration[]);
      }

      const contactCount = result.total || result.contacts?.length || 0;
      toast.success(
        `Labortech sync successful! Found ${contactCount} contacts/leads`
      );
    } catch (error) {
      console.error('Error syncing Labortech:', error);
      toast.error(`Failed to sync Labortech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncingLabortech(false);
    }
  };

  const handleDisconnectLabortech = async () => {
    if (!labortechIntegration) return;

    try {
      const { error } = await supabase
        .from('integrations')
        .update({ is_connected: false })
        .eq('id', labortechIntegration.id);

      if (error) throw error;

      toast.success('Labortech disconnected');
      setIntegrations(prev => 
        prev.map(i => i.id === labortechIntegration.id ? { ...i, is_connected: false } : i)
      );
    } catch (error) {
      console.error('Error disconnecting Labortech:', error);
      toast.error('Failed to disconnect Labortech');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform configuration and integrations</p>
      </div>
      
      {/* Multi-Company Integration Overview (for super admins or users with multiple companies) */}
      {availableCompanies.length > 1 && (
        <CompanyIntegrationStatus
          onSelectCompany={(company) => {
            const qboCard = document.getElementById('qbo-integration-card');
            if (qboCard) {
              qboCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          onConnectQBO={handleConnectQBO}
          connecting={connectingQBO}
        />
      )}

      {/* QuickBooks Integration Card */}
      <div id="qbo-integration-card" className="rounded-2xl border border-border/50 bg-card">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2CA01C]/10">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#2CA01C">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4zm-1.2 4.8c-2.651 0-4.8 2.149-4.8 4.8s2.149 4.8 4.8 4.8v-2.4c-1.325 0-2.4-1.075-2.4-2.4s1.075-2.4 2.4-2.4v-2.4zm2.4 0v2.4c1.325 0 2.4 1.075 2.4 2.4s-1.075 2.4-2.4 2.4v2.4c2.651 0 4.8-2.149 4.8-4.8s-2.149-4.8-4.8-4.8z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold">QuickBooks Online</h2>
                <p className="text-sm text-muted-foreground">Financial data integration</p>
              </div>
            </div>
            {isQBOConnected ? (
              <Badge variant="default" className="bg-success/10 text-success border-success/20 rounded-full">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-muted text-muted-foreground rounded-full">
                <XCircle className="mr-1 h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
        </div>
        <div className="p-5">
          {selectedCompany ? (
            <>
              <div className="rounded-xl bg-muted/40 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="text-base font-semibold">{selectedCompany.name}</p>
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
                    className="flex-1 rounded-full"
                    onClick={() => toast.info('Sync functionality coming soon')}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-full"
                    onClick={() => qboIntegration && handleDisconnectQBO(qboIntegration.id)}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full rounded-full bg-[#2CA01C] hover:bg-[#248017] text-white"
                  onClick={handleConnectQBO}
                  disabled={connectingQBO || loadingIntegrations}
                >
                  {connectingQBO ? (
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
        </div>
      </div>

      {/* Jobber Integration Card - Show only for Unique Painting and ATI Security */}
      {(selectedCompany?.company_type === 'unique_painting' || selectedCompany?.company_type === 'ati_security') && (
        <div id="jobber-integration-card" className="rounded-2xl border border-border/50 bg-card">
          <div className="p-5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7AC142]/10">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#7AC142">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold">Jobber</h2>
                  <p className="text-sm text-muted-foreground">Jobs, clients & invoices</p>
                </div>
              </div>
              {isJobberConnected ? (
                <Badge variant="default" className="bg-success/10 text-success border-success/20 rounded-full">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground rounded-full">
                  <XCircle className="mr-1 h-3 w-3" />
                  Not Connected
                </Badge>
              )}
            </div>
          </div>
          <div className="p-5">
            {selectedCompany ? (
              <>
                <div className="rounded-xl bg-muted/40 p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="text-base font-semibold">{selectedCompany.name}</p>
                    </div>
                    {isJobberConnected && jobberIntegration?.last_sync_at && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Last Sync</p>
                        <p className="text-sm font-medium">
                          {new Date(jobberIntegration.last_sync_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {isJobberConnected ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={handleSyncJobber}
                      disabled={syncingJobber}
                    >
                      {syncingJobber ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync Now
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      className="rounded-full"
                      onClick={() => jobberIntegration && handleDisconnectJobber(jobberIntegration.id)}
                      disabled={syncingJobber}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full rounded-full bg-[#7AC142] hover:bg-[#6ab038] text-white"
                    onClick={handleConnectJobber}
                    disabled={connectingJobber || loadingIntegrations}
                  >
                    {connectingJobber ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Connect to Jobber
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
          </div>
        </div>
      )}

      {/* PETE CRM Integration Card - Show only for Property Halo */}
      {selectedCompany?.company_type === 'property_halo' && (
        <div id="pete-integration-card" className="rounded-2xl border border-border/50 bg-card">
          <div className="p-5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#3B82F6">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold">PETE CRM</h2>
                  <p className="text-sm text-muted-foreground">Real estate lead tracking (via Browserless)</p>
                </div>
              </div>
              {isPeteConnected ? (
                <Badge variant="default" className="bg-success/10 text-success border-success/20 rounded-full">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground rounded-full">
                  <XCircle className="mr-1 h-3 w-3" />
                  Not Connected
                </Badge>
              )}
            </div>
          </div>
          <div className="p-5">
            <div className="rounded-xl bg-muted/40 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="text-base font-semibold">{selectedCompany.name}</p>
                </div>
                {isPeteConnected && peteIntegration?.last_sync_at && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="text-sm font-medium">
                      {new Date(peteIntegration.last_sync_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {isPeteConnected ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={handleSyncPete}
                  disabled={syncingPete}
                >
                  {syncingPete ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                PETE CRM integration requires session cookies. Contact admin to configure.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Labortech Integration Card - Show only for Unique Painting and ATI Security */}
      {(selectedCompany?.company_type === 'unique_painting' || selectedCompany?.company_type === 'ati_security') && (
        <div id="labortech-integration-card" className="rounded-2xl border border-border/50 bg-card">
          <div className="p-5 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#F97316">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold">Labortech</h2>
                  <p className="text-sm text-muted-foreground">Lead management (GoHighLevel)</p>
                </div>
              </div>
              {isLabortechConnected ? (
                <Badge variant="default" className="bg-success/10 text-success border-success/20 rounded-full">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground rounded-full">
                  <XCircle className="mr-1 h-3 w-3" />
                  Not Connected
                </Badge>
              )}
            </div>
          </div>
          <div className="p-5">
            {selectedCompany ? (
              <>
                <div className="rounded-xl bg-muted/40 p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="text-base font-semibold">{selectedCompany.name}</p>
                    </div>
                    {isLabortechConnected && labortechIntegration?.last_sync_at && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Last Sync</p>
                        <p className="text-sm font-medium">
                          {new Date(labortechIntegration.last_sync_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {isLabortechConnected ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={handleSyncLabortech}
                      disabled={syncingLabortech}
                    >
                      {syncingLabortech ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync Now
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      className="rounded-full"
                      onClick={handleDisconnectLabortech}
                      disabled={syncingLabortech}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full rounded-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={handleTestLabortech}
                    disabled={testingLabortech || loadingIntegrations}
                  >
                    {testingLabortech ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Connect to Labortech
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
          </div>
        </div>
      )}

      {/* Support Contact Card */}
      <div className="rounded-2xl border border-border/50 bg-card">
        <div className="p-5 border-b border-border/50">
          <h2 className="text-base font-semibold">Support</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Get help with the platform</p>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground mb-4">
            For questions about integrations or platform issues, contact your organization's administrator.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="rounded-full">
              <a href="/privacy" target="_blank">
                <ExternalLink className="mr-2 h-3 w-3" />
                Privacy Policy
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="rounded-full">
              <a href="/terms" target="_blank">
                <ExternalLink className="mr-2 h-3 w-3" />
                Terms of Service
              </a>
            </Button>
          </div>
        </div>
      </div>
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
