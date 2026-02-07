// CRM Bot v2
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
const GHL_API_BASE = "https://services.leadconnectorhq.com";

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
  labortech_data?: {
    open_opportunities: number;
    pipeline_names: string[];
  };
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
      'New Leads',
      'New Requests',
      'Converted Quotes',
      'Quote Value',
      'New Jobs',
      'Invoiced Value',
      'Total Receivables',
      'Avg Job Value',
      'Open Opportunities',
    ],
  },
  ati_security: {
    integration_type: 'jobber',
    kpi_names: [
      'New Leads',
      'New Requests',
      'Converted Quotes',
      'Quote Value',
      'New Jobs',
      'Invoiced Value',
      'Total Receivables',
      'Avg Job Value',
      'Open Opportunities',
    ],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jobberClientId = Deno.env.get('JOBBER_CLIENT_ID');
    const jobberClientSecret = Deno.env.get('JOBBER_CLIENT_SECRET');
    const labortechApiKey = Deno.env.get('LABORTECH_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Accept optional period_start and period_end for date range support
    const { bot_run_id, company_id, bot_type, cadence = 'daily', period_start, period_end } = await req.json();

    if (!bot_run_id || !company_id || !bot_type) {
      return new Response(
        JSON.stringify({ error: 'bot_run_id, company_id, and bot_type are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Starting ${bot_type} bot run: ${bot_run_id} for company: ${company_id}`);
    console.log(`Date range override: ${period_start || 'none'} to ${period_end || 'none'}`);

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

    // Use provided date range or calculate based on cadence
    let periodStart: string;
    let periodEnd: string;
    
    if (period_start && period_end) {
      periodStart = period_start;
      periodEnd = period_end;
      console.log(`Using provided date range: ${periodStart} to ${periodEnd}`);
    } else {
      const calculated = calculatePeriod(cadence);
      periodStart = calculated.periodStart;
      periodEnd = calculated.periodEnd;
      console.log(`Calculated date range from cadence '${cadence}': ${periodStart} to ${periodEnd}`);
    }

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
      
      // Token refresh function - can be called if API returns expired error
      const refreshToken = async (): Promise<string | null> => {
        console.log('Force refreshing Jobber token...');
        
        // Re-fetch integration to get latest refresh token
        const { data: latestInt } = await supabase
          .from('integrations')
          .select('config')
          .eq('id', integration.id)
          .single();
        
        const latestConfig = (latestInt?.config || config) as JobberTokens;
        
        const tokenResponse = await fetch(JOBBER_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: jobberClientId!,
            client_secret: jobberClientSecret!,
            refresh_token: latestConfig.refresh_token,
          }),
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
          console.error('Jobber token refresh failed:', tokens);
          await supabase.from('integrations').update({ is_connected: false }).eq('id', integration.id);
          return null;
        }

        accessToken = tokens.access_token;
        const expiresIn = tokens.expires_in || 7200;
        
        await supabase.from('integrations').update({
          config: {
            ...latestConfig,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          },
          last_sync_at: new Date().toISOString(),
        }).eq('id', integration.id);
        
        console.log('Jobber token refreshed successfully');
        return tokens.access_token;
      };
      
      // Check if token needs refresh before starting
      const tokenExpiresAt = new Date(config.token_expires_at);
      const now = new Date();
      
      if (now >= new Date(tokenExpiresAt.getTime() - 5 * 60 * 1000)) {
        const newToken = await refreshToken();
        if (!newToken) {
          await updateBotRunFailed(supabase, bot_run_id, 'Token refresh failed. Please reconnect Jobber.');
          return new Response(
            JSON.stringify({ error: 'Token refresh failed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
          );
        }
        accessToken = newToken;
      }

      // Fetch KPIs from Jobber GraphQL API with token refresh callback
      kpis = await fetchJobberKPIs(accessToken, periodStart, periodEnd, refreshToken);
      
      console.log('Jobber KPIs fetched:', kpis);

      // Also fetch Labortech open opportunities if connected
      let labortechData: { open_opportunities: number; pipeline_names: string[] } | undefined;
      
      if (labortechApiKey && (bot_type === 'unique_painting' || bot_type === 'ati_security')) {
        // Check if Labortech is connected for this company
        const { data: labortechIntegration } = await supabase
          .from('integrations')
          .select('*')
          .eq('company_id', company_id)
          .eq('integration_type', 'labortech')
          .eq('is_connected', true)
          .single();

        if (labortechIntegration) {
          const labortechConfig = labortechIntegration.config as Record<string, string>;
          const locationId = labortechConfig?.location_id;

          if (locationId) {
            console.log(`Fetching Labortech open opportunities for location: ${locationId}`);
            labortechData = await fetchLabortechOpportunities(labortechApiKey, locationId, periodStart, periodEnd);
            
            if (labortechData) {
              kpis['Open Opportunities'] = labortechData.open_opportunities;
              // For Unique Painting & ATI Security, New Requests = Labortech open opportunities
              kpis['New Requests'] = labortechData.open_opportunities;
              console.log(`Labortech: ${labortechData.open_opportunities} open opportunities (mapped to New Requests) across ${labortechData.pipeline_names.length} pipelines`);
            }
          } else {
            console.log('Labortech connected but no location_id configured');
          }
        } else {
          console.log('Labortech not connected for this company, skipping');
        }
      }

      // Update last sync
      await supabase.from('integrations').update({
        last_sync_at: new Date().toISOString(),
      }).eq('id', integration.id);

      summary = {
        integration_status: 'connected',
        integration_type: 'jobber',
        bot_type,
        message: 'Live data fetched from Jobber successfully.' + (labortechData ? ` Labortech: ${labortechData.open_opportunities} open opportunities.` : ''),
        kpis,
        period_start: periodStart,
        period_end: periodEnd,
        source: 'jobber',
        labortech_data: labortechData,
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
              source: (kpiName === 'Open Opportunities' || kpiName === 'New Requests') ? 'labortech' : 'jobber',
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

// Fetch open opportunities from Labortech (GHL) - all pipelines, status open, filtered by date range
async function fetchLabortechOpportunities(apiKey: string, locationId: string, periodStart?: string, periodEnd?: string): Promise<{ open_opportunities: number; pipeline_names: string[] }> {
  const ghlHeaders = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Version": "2021-07-28",
  };

  try {
    // First, get all pipelines for this location
    const pipelinesResponse = await fetch(
      `${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`,
      { headers: ghlHeaders }
    );

    if (!pipelinesResponse.ok) {
      const errorText = await pipelinesResponse.text();
      console.error('Failed to fetch pipelines:', pipelinesResponse.status, errorText);
      return { open_opportunities: 0, pipeline_names: [] };
    }

    const pipelinesData = await pipelinesResponse.json();
    const pipelines = pipelinesData.pipelines || [];
    console.log(`Found ${pipelines.length} pipelines in Labortech`);

    let totalOpenOpportunities = 0;
    const pipelineNames: string[] = [];

    // For each pipeline, search for open opportunities
    for (const pipeline of pipelines) {
      pipelineNames.push(pipeline.name || 'Unknown Pipeline');
      
      // Fetch open opportunities - use larger limit to minimize pagination
      let allOpportunities: any[] = [];
      let startAfter = 0;
      let hasMore = true;

      while (hasMore) {
        const searchParams = new URLSearchParams({
          location_id: locationId,
          pipeline_id: pipeline.id,
          status: "open",
          limit: "100",
        });
        if (startAfter > 0) {
          searchParams.set("startAfter", String(startAfter));
        }

        const searchResponse = await fetch(
          `${GHL_API_BASE}/opportunities/search?${searchParams.toString()}`,
          { headers: ghlHeaders }
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const opportunities = searchData.opportunities || [];
          allOpportunities = allOpportunities.concat(opportunities);
          
          const total = searchData.meta?.total || 0;
          if (allOpportunities.length >= total || opportunities.length < 100) {
            hasMore = false;
          } else {
            startAfter = allOpportunities.length;
          }
        } else {
          const errorText = await searchResponse.text();
          console.error(`Failed to search pipeline ${pipeline.name}:`, searchResponse.status, errorText);
          hasMore = false;
        }
      }

      // Filter by creation date if date range provided
      let count = allOpportunities.length;
      if (periodStart && periodEnd) {
        const startDate = new Date(`${periodStart}T00:00:00Z`);
        const endDate = new Date(`${periodEnd}T23:59:59Z`);
        const filtered = allOpportunities.filter((opp: any) => {
          const created = new Date(opp.createdAt || opp.dateAdded || opp.created_at || '');
          return !isNaN(created.getTime()) && created >= startDate && created <= endDate;
        });
        console.log(`Pipeline "${pipeline.name}": ${allOpportunities.length} total open, ${filtered.length} created in ${periodStart} to ${periodEnd}`);
        count = filtered.length;
      } else {
        console.log(`Pipeline "${pipeline.name}": ${count} open opportunities (no date filter)`);
      }

      totalOpenOpportunities += count;
    }

    return {
      open_opportunities: totalOpenOpportunities,
      pipeline_names: pipelineNames,
    };
  } catch (error) {
    console.error('Error fetching Labortech opportunities:', error);
    return { open_opportunities: 0, pipeline_names: [] };
  }
}

async function fetchJobberKPIs(accessToken: string, periodStart: string, periodEnd: string, onTokenExpired?: () => Promise<string | null>): Promise<Record<string, number>> {
  const kpis: Record<string, number> = {};
  let currentToken = accessToken;

  // Build date filter for createdAt - Jobber uses ISO 8601 format
  const startDate = `${periodStart}T00:00:00Z`;
  const endDate = `${periodEnd}T23:59:59Z`;
  
  console.log(`Fetching Jobber data for date range: ${startDate} to ${endDate}`);

  // Query for requests with date filter
  const requestsQuery = `
    query GetRequests($after: ISO8601DateTime!, $before: ISO8601DateTime!) {
      requests(filter: { createdAt: { after: $after, before: $before } }, first: 250) {
        nodes {
          id
          createdAt
          title
        }
        totalCount
      }
    }
  `;

  // Query for leads with date filter (new leads in the period)
  const leadsQuery = `
    query GetLeads($after: ISO8601DateTime!, $before: ISO8601DateTime!) {
      clients(filter: { createdAt: { after: $after, before: $before } }, first: 250) {
        totalCount
      }
    }
  `;

  // Query for quotes with date filter
  const quotesQuery = `
    query GetQuotes($after: ISO8601DateTime!, $before: ISO8601DateTime!) {
      quotes(filter: { createdAt: { after: $after, before: $before } }, first: 250) {
        nodes {
          id
          quoteStatus
          createdAt
          amounts {
            total
          }
        }
        totalCount
      }
    }
  `;

  // Query for jobs with date filter
  const jobsQuery = `
    query GetJobs($after: ISO8601DateTime!, $before: ISO8601DateTime!) {
      jobs(filter: { createdAt: { after: $after, before: $before } }, first: 250) {
        nodes {
          id
          jobStatus
          createdAt
          total
        }
        totalCount
      }
    }
  `;

  // Query for invoices with date filter
  const invoicesQuery = `
    query GetInvoices($after: ISO8601DateTime!, $before: ISO8601DateTime!) {
      invoices(filter: { createdAt: { after: $after, before: $before } }, first: 250) {
        nodes {
          id
          invoiceStatus
          createdAt
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
  
  const dateVariables = { after: startDate, before: endDate };

  try {
    // Fetch requests with date filter - check for token expiration on first call
    let requestsResponse = await makeJobberRequest(currentToken, requestsQuery, dateVariables);
    console.log('Requests response:', JSON.stringify(requestsResponse));
    
    // If token expired during request, try to refresh and retry
    if (requestsResponse?.message === 'Access token expired' && onTokenExpired) {
      console.log('Token expired during request, attempting refresh...');
      const newToken = await onTokenExpired();
      if (newToken) {
        currentToken = newToken;
        requestsResponse = await makeJobberRequest(currentToken, requestsQuery, dateVariables);
      }
    }
    
    if (requestsResponse?.data?.requests) {
      const totalCount = requestsResponse.data.requests.totalCount || 0;
      const requests = requestsResponse.data.requests.nodes || [];
      console.log(`Found ${totalCount} requests in date range, ${requests.length} in response`);
      kpis['New Requests'] = totalCount;
    } else {
      kpis['New Requests'] = 0;
    }

    // Fetch leads (new clients) with date filter
    const leadsResponse = await makeJobberRequest(currentToken, leadsQuery, dateVariables);
    console.log('Leads response:', JSON.stringify(leadsResponse));
    if (leadsResponse?.data?.clients) {
      kpis['New Leads'] = leadsResponse.data.clients.totalCount || 0;
    } else {
      kpis['New Leads'] = 0;
    }

    // Fetch quotes with date filter
    const quotesResponse = await makeJobberRequest(currentToken, quotesQuery, dateVariables);
    console.log('Quotes response totalCount:', quotesResponse?.data?.quotes?.totalCount);
    if (quotesResponse?.data?.quotes) {
      const quotes = quotesResponse.data.quotes.nodes || [];
      
      // Converted/Approved quotes
      const convertedQuotes = quotes.filter((q: any) => 
        q.quoteStatus === 'APPROVED' || q.quoteStatus === 'CONVERTED'
      );
      kpis['Converted Quotes'] = convertedQuotes.length;
      
      // Calculate total quote value (sent quotes)
      const totalQuoteValue = quotes.reduce((sum: number, q: any) => {
        return sum + (q.amounts?.total || 0);
      }, 0);
      kpis['Quote Value'] = Math.round(totalQuoteValue * 100) / 100;
      
      // Total quotes count
      kpis['Total Quotes'] = quotes.length;
    }

    // Fetch jobs with date filter
    const jobsResponse = await makeJobberRequest(currentToken, jobsQuery, dateVariables);
    console.log('Jobs response totalCount:', jobsResponse?.data?.jobs?.totalCount);
    if (jobsResponse?.data?.jobs) {
      const jobs = jobsResponse.data.jobs.nodes || [];
      kpis['New Jobs'] = jobs.length;
      
      // Calculate average job value
      if (jobs.length > 0) {
        const totalJobValue = jobs.reduce((sum: number, j: any) => sum + (j.total || 0), 0);
        kpis['Avg Job Value'] = Math.round((totalJobValue / jobs.length) * 100) / 100;
      }
    }

    // Fetch invoices with date filter
    const invoicesResponse = await makeJobberRequest(currentToken, invoicesQuery, dateVariables);
    console.log('Invoices response totalCount:', invoicesResponse?.data?.invoices?.totalCount);
    if (invoicesResponse?.data?.invoices) {
      const invoices = invoicesResponse.data.invoices.nodes || [];
      
      // Calculate invoiced value (total of all invoices in period)
      const invoicedValue = invoices.reduce((sum: number, i: any) => {
        return sum + (i.amounts?.total || 0);
      }, 0);
      kpis['Invoiced Value'] = Math.round(invoicedValue * 100) / 100;
      
      // Calculate total receivables (outstanding balance)
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
