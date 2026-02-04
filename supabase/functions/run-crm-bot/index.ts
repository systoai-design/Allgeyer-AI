import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

interface JobberTokens {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

interface CRMBotRunSummary {
  integration_status: 'not_connected' | 'connected';
  integration_type: string;
  bot_type: string;
  message: string;
  kpis: Record<string, number>;
  period_start: string;
  period_end: string;
  source: string;
}

const CRM_CONFIGS: Record<string, { integration_type: string; kpi_names: string[] }> = {
  property_halo: {
    integration_type: 'pete_crm',
    kpi_names: [
      'New Leads',
      'Lead Conversion Rate',
      'Active Properties',
      'Tenant Satisfaction',
      'Maintenance Requests',
      'Occupancy Rate',
    ],
  },
  unique_painting: {
    integration_type: 'jobber',
    kpi_names: [
      'Open Requests',
      'Approved Quotes',
      'Active Jobs',
      'Pending Invoices',
      'Total Receivables',
      'Quote Value',
    ],
  },
  ati_security: {
    integration_type: 'jobber',
    kpi_names: [
      'Open Requests',
      'Approved Quotes',
      'Active Jobs',
      'Pending Invoices',
      'Total Receivables',
      'Quote Value',
    ],
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jobberClientId = Deno.env.get('JOBBER_CLIENT_ID');
    const jobberClientSecret = Deno.env.get('JOBBER_CLIENT_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bot_run_id, company_id, bot_type, cadence = 'daily' } = await req.json();

    if (!bot_run_id || !company_id || !bot_type) {
      return new Response(
        JSON.stringify({ error: 'bot_run_id, company_id, and bot_type are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Starting ${bot_type} bot run: ${bot_run_id} for company: ${company_id}`);

    // Update bot run status to running
    await supabase
      .from('bot_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', bot_run_id);

    const crmConfig = CRM_CONFIGS[bot_type];
    
    if (!crmConfig) {
      await updateBotRunFailed(supabase, bot_run_id, `Unknown bot type: ${bot_type}`);
      return new Response(
        JSON.stringify({ error: `Unknown bot type: ${bot_type}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if integration is connected
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('integration_type', crmConfig.integration_type)
      .single();

    const isConnected = integration?.is_connected ?? false;

    // Calculate date range based on cadence
    const { periodStart, periodEnd } = calculatePeriod(cadence);

    // Get the bot ID
    const { data: bot } = await supabase
      .from('bots')
      .select('id')
      .eq('bot_type', bot_type)
      .single();

    const botId = bot?.id;

    let summary: CRMBotRunSummary;
    let kpis: Record<string, number> = {};

    if (!isConnected) {
      console.log(`Integration ${crmConfig.integration_type} not connected for company ${company_id}`);
      
      summary = {
        integration_status: 'not_connected',
        integration_type: crmConfig.integration_type,
        bot_type,
        message: `${crmConfig.integration_type.toUpperCase().replace('_', ' ')} integration not connected. Please connect in Settings.`,
        kpis: {},
        period_start: periodStart,
        period_end: periodEnd,
        source: 'none',
      };

      // Create exception about missing integration
      if (botId) {
        await supabase.from('exceptions').insert({
          company_id: company_id,
          bot_id: botId,
          exception_type: 'integration_missing',
          title: `${crmConfig.integration_type.toUpperCase().replace('_', ' ')} Not Connected`,
          description: `Connect ${crmConfig.integration_type.replace('_', ' ')} in Settings to enable live data.`,
          severity: 'medium',
          status: 'open',
        });
      }
    } else if (crmConfig.integration_type === 'jobber') {
      // Fetch live data from Jobber
      console.log('Fetching live data from Jobber...');
      
      const config = integration.config as JobberTokens;
      let accessToken = config.access_token;
      
      // Check if token needs refresh
      const tokenExpiresAt = new Date(config.token_expires_at);
      const now = new Date();
      
      if (now >= new Date(tokenExpiresAt.getTime() - 5 * 60 * 1000)) {
        console.log('Jobber token expired, refreshing...');
        
        const tokenResponse = await fetch(JOBBER_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: jobberClientId!,
            client_secret: jobberClientSecret!,
            refresh_token: config.refresh_token,
          }),
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
          console.error('Jobber token refresh failed:', tokens);
          await supabase.from('integrations').update({ is_connected: false }).eq('id', integration.id);
          await updateBotRunFailed(supabase, bot_run_id, 'Token refresh failed. Please reconnect Jobber.');
          return new Response(
            JSON.stringify({ error: 'Token refresh failed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
          );
        }

        accessToken = tokens.access_token;
        const expiresIn = tokens.expires_in || 7200;
        
        await supabase.from('integrations').update({
          config: {
            ...config,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          },
          last_sync_at: new Date().toISOString(),
        }).eq('id', integration.id);
        
        console.log('Jobber token refreshed successfully');
      }

      // Fetch KPIs from Jobber GraphQL API
      kpis = await fetchJobberKPIs(accessToken, periodStart, periodEnd);
      
      console.log('Jobber KPIs fetched:', kpis);

      // Update last sync
      await supabase.from('integrations').update({
        last_sync_at: new Date().toISOString(),
      }).eq('id', integration.id);

      summary = {
        integration_status: 'connected',
        integration_type: 'jobber',
        bot_type,
        message: 'Live data fetched from Jobber successfully.',
        kpis,
        period_start: periodStart,
        period_end: periodEnd,
        source: 'jobber',
      };

      // Store KPIs in kpi_history
      if (botId) {
        for (const [kpiName, value] of Object.entries(kpis)) {
          await supabase.from('kpi_history').insert({
            company_id: company_id,
            bot_id: botId,
            cadence,
            period_start: periodStart,
            period_end: periodEnd,
            kpi_name: kpiName,
            kpi_value: value,
            kpi_status: 'on_track',
            metadata: {
              source: 'jobber',
              generated_at: new Date().toISOString(),
            },
          });
        }
      }
    } else {
      // PETE CRM or other - placeholder for now
      summary = {
        integration_status: 'connected',
        integration_type: crmConfig.integration_type,
        bot_type,
        message: `${crmConfig.integration_type} API implementation pending.`,
        kpis: {},
        period_start: periodStart,
        period_end: periodEnd,
        source: 'pending',
      };
    }

    // Update bot run as completed
    await supabase.from('bot_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      summary: summary as unknown as Record<string, unknown>,
    }).eq('id', bot_run_id);

    console.log(`${bot_type} bot run completed with ${Object.keys(kpis).length} KPIs`);

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('CRM bot error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function fetchJobberKPIs(accessToken: string, periodStart: string, periodEnd: string): Promise<Record<string, number>> {
  const kpis: Record<string, number> = {};

  // Query for requests count - just get totalCount and basic info
  const requestsQuery = `
    query GetRequests {
      requests(first: 100) {
        nodes {
          id
          createdAt
          title
        }
        totalCount
      }
    }
  `;

  // Query for quotes
  const quotesQuery = `
    query GetQuotes {
      quotes(first: 100) {
        nodes {
          id
          quoteStatus
          amounts {
            total
          }
        }
        totalCount
      }
    }
  `;

  // Query for jobs
  const jobsQuery = `
    query GetJobs {
      jobs(first: 100) {
        nodes {
          id
          jobStatus
          total
        }
        totalCount
      }
    }
  `;

  // Query for invoices - use correct InvoiceAmounts fields
  const invoicesQuery = `
    query GetInvoices {
      invoices(first: 100) {
        nodes {
          id
          invoiceStatus
          amounts {
            total
            depositAmount
            invoiceBalance
          }
        }
        totalCount
      }
    }
  `;

  try {
    // Fetch requests
    const requestsResponse = await makeJobberRequest(accessToken, requestsQuery);
    console.log('Requests response:', JSON.stringify(requestsResponse));
    if (requestsResponse?.data?.requests) {
      const totalCount = requestsResponse.data.requests.totalCount || 0;
      const requests = requestsResponse.data.requests.nodes || [];
      console.log(`Found ${totalCount} total requests, ${requests.length} in response`);
      kpis['Open Requests'] = totalCount;
    } else {
      kpis['Open Requests'] = 0;
    }

    // Fetch quotes
    const quotesResponse = await makeJobberRequest(accessToken, quotesQuery);
    if (quotesResponse?.data?.quotes) {
      const quotes = quotesResponse.data.quotes.nodes || [];
      const approvedQuotes = quotes.filter((q: any) => q.quoteStatus === 'APPROVED');
      kpis['Approved Quotes'] = approvedQuotes.length;
      
      // Calculate total quote value
      const totalQuoteValue = quotes.reduce((sum: number, q: any) => {
        return sum + (q.amounts?.total || 0);
      }, 0);
      kpis['Quote Value'] = Math.round(totalQuoteValue * 100) / 100;
    }

    // Fetch jobs
    const jobsResponse = await makeJobberRequest(accessToken, jobsQuery);
    if (jobsResponse?.data?.jobs) {
      const jobs = jobsResponse.data.jobs.nodes || [];
      const activeJobs = jobs.filter((j: any) => 
        j.jobStatus === 'ACTIVE' || j.jobStatus === 'IN_PROGRESS' || j.jobStatus === 'TODAY' || j.jobStatus === 'REQUIRES_INVOICING'
      );
      kpis['Active Jobs'] = activeJobs.length;
    }

    // Fetch invoices
    const invoicesResponse = await makeJobberRequest(accessToken, invoicesQuery);
    if (invoicesResponse?.data?.invoices) {
      const invoices = invoicesResponse.data.invoices.nodes || [];
      const pendingInvoices = invoices.filter((i: any) => 
        i.invoiceStatus === 'DRAFT' || i.invoiceStatus === 'AWAITING_PAYMENT'
      );
      kpis['Pending Invoices'] = pendingInvoices.length;
      
      // Calculate total receivables using invoiceBalance
      const totalReceivables = invoices.reduce((sum: number, i: any) => {
        return sum + (i.amounts?.invoiceBalance || 0);
      }, 0);
      kpis['Total Receivables'] = Math.round(totalReceivables * 100) / 100;
    }

  } catch (error) {
    console.error('Error fetching Jobber data:', error);
  }

  return kpis;
}

async function makeJobberRequest(accessToken: string, query: string, variables = {}): Promise<any> {
  const response = await fetch(JOBBER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-JOBBER-GRAPHQL-VERSION': '2023-08-18',
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  if (data.errors) {
    console.error('Jobber GraphQL errors:', data.errors);
  }

  return data;
}

function calculatePeriod(cadence: string): { periodStart: string; periodEnd: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let periodStart: Date;
  let periodEnd: Date = today;

  switch (cadence) {
    case 'daily':
      periodStart = new Date(today);
      periodStart.setDate(periodStart.getDate() - 1);
      break;
    case 'weekly':
      periodStart = new Date(today);
      periodStart.setDate(periodStart.getDate() - 7);
      break;
    case 'monthly':
      periodStart = new Date(today);
      periodStart.setMonth(periodStart.getMonth() - 1);
      break;
    case 'quarterly':
      periodStart = new Date(today);
      periodStart.setMonth(periodStart.getMonth() - 3);
      break;
    default:
      periodStart = new Date(today);
      periodStart.setDate(periodStart.getDate() - 1);
  }

  return {
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
  };
}

async function updateBotRunFailed(supabase: any, botRunId: string, errorMessage: string): Promise<void> {
  await supabase.from('bot_runs').update({
    status: 'failed',
    completed_at: new Date().toISOString(),
    error_message: errorMessage,
  }).eq('id', botRunId);
}
