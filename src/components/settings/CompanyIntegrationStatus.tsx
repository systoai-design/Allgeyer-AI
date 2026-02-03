import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySelector } from '@/hooks/useCompanySelector';
import type { Company, Integration } from '@/types/database';

interface CompanyIntegrationStatusProps {
  onSelectCompany: (company: Company) => void;
  onConnectQBO: () => void;
  connecting: boolean;
}

interface CompanyWithIntegration extends Company {
  qboIntegration?: Integration;
}

export function CompanyIntegrationStatus({ 
  onSelectCompany, 
  onConnectQBO,
  connecting 
}: CompanyIntegrationStatusProps) {
  const { availableCompanies, selectedCompany, setSelectedCompany } = useCompanySelector();
  const [companiesWithIntegrations, setCompaniesWithIntegrations] = useState<CompanyWithIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Expose refresh function for parent to call after OAuth
  useEffect(() => {
    // Listen for storage events (cross-tab communication) or custom events
    const handleRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('qbo-connection-updated', handleRefresh);
    window.addEventListener('focus', handleRefresh); // Refresh when window gains focus
    
    return () => {
      window.removeEventListener('qbo-connection-updated', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, []);

  useEffect(() => {
    async function fetchAllIntegrations() {
      if (availableCompanies.length === 0) return;

      setLoading(true);
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('integration_type', 'quickbooks');

      if (error) {
        console.error('Error fetching integrations:', error);
        setLoading(false);
        return;
      }

      const companiesWithData: CompanyWithIntegration[] = availableCompanies.map(company => ({
        ...company,
        qboIntegration: (integrations as Integration[])?.find(i => i.company_id === company.id)
      }));

      setCompaniesWithIntegrations(companiesWithData);
      setLoading(false);
    }

    fetchAllIntegrations();
  }, [availableCompanies, refreshKey]);

  const handleManageClick = (company: Company) => {
    setSelectedCompany(company);
    onSelectCompany(company);
  };

  const handleConnectClick = (company: Company) => {
    setSelectedCompany(company);
    // Small delay to ensure state is updated before triggering OAuth
    setTimeout(() => {
      onConnectQBO();
    }, 100);
  };

  const connectedCount = companiesWithIntegrations.filter(c => c.qboIntegration?.is_connected).length;
  const totalCount = companiesWithIntegrations.length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QuickBooks Connections Overview</CardTitle>
          <CardDescription>Loading company integration status...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>QuickBooks Connections Overview</CardTitle>
            <CardDescription>
              {connectedCount} of {totalCount} companies connected
            </CardDescription>
          </div>
          <Badge 
            variant={connectedCount === totalCount ? "default" : "secondary"}
            className={connectedCount === totalCount 
              ? "bg-green-500/10 text-green-600 border-green-500/20" 
              : "bg-muted text-muted-foreground"
            }
          >
            {connectedCount}/{totalCount} Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companiesWithIntegrations.map((company) => {
              const isConnected = company.qboIntegration?.is_connected;
              const isSelected = selectedCompany?.id === company.id;
              const realmId = company.qboIntegration?.config && 
                typeof company.qboIntegration.config === 'object' && 
                'realm_id' in company.qboIntegration.config
                  ? (company.qboIntegration.config as { realm_id?: string }).realm_id
                  : null;

              return (
                <TableRow 
                  key={company.id}
                  className={isSelected ? "bg-muted/50" : undefined}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: company.primary_color || '#3B82F6' }}
                      />
                      <span className="font-medium">{company.name}</span>
                      {isSelected && (
                        <Badge variant="outline" className="text-xs">Selected</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isConnected ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Connected</span>
                        {realmId && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (Realm: {realmId})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Not Connected</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {company.qboIntegration?.last_sync_at ? (
                      <span className="text-sm text-muted-foreground">
                        {new Date(company.qboIntegration.last_sync_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageClick(company)}
                      >
                        <ExternalLink className="mr-1.5 h-3 w-3" />
                        Manage
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-[#2CA01C] hover:bg-[#248017] text-white"
                        onClick={() => handleConnectClick(company)}
                        disabled={connecting}
                      >
                        {connecting && isSelected ? (
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        ) : null}
                        Connect
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
