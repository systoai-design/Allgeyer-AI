import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Placeholder CRM Bot Runner
 * 
 * This edge function handles bot runs for:
 * - Property Halo Bot (PETE CRM)
 * - Unique Painting Bot (Labortech)
 * - ATI Security Bot (Jobber)
 * 
 * Currently returns placeholder data until integrations are implemented.
 */

interface CRMBotRunSummary {
  integration_status: 'not_connected' | 'connected';
  integration_type: string;
  bot_type: string;
  message: string;
  placeholder_kpis: Record<string, number>;
  period_start: string;
  period_end: string;
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
    integration_type: 'labortech',
    kpi_names: [
      'Jobs Completed',
      'Revenue This Period',
      'Active Crews',
      'Average Job Duration',
      'Customer Satisfaction',
      'Quote Acceptance Rate',
    ],
  },
  ati_security: {
    integration_type: 'jobber',
    kpi_names: [
      'Service Calls',
      'Response Time (mins)',
      'Active Contracts',
      'Monthly Recurring Revenue',
      'Technician Utilization',
      'Customer Retention Rate',
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
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
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('integration_type', crmConfig.integration_type)
      .single();

    const isConnected = integration?.is_connected ?? false;

    // Calculate date range
    const { periodStart, periodEnd } = calculatePeriod(cadence);

    // Get the bot ID
    const { data: bot } = await supabase
      .from('bots')
      .select('id')
      .eq('bot_type', bot_type)
      .single();

    const botId = bot?.id;

    let summary: CRMBotRunSummary;

    if (!isConnected) {
      // Return placeholder data with message about integration
      summary = {
        integration_status: 'not_connected',
        integration_type: crmConfig.integration_type,
        bot_type,
        message: `${crmConfig.integration_type.toUpperCase().replace('_', ' ')} integration not connected. Please connect the integration in Settings to pull live data.`,
        placeholder_kpis: generatePlaceholderKPIs(crmConfig.kpi_names),
        period_start: periodStart,
        period_end: periodEnd,
      };

      // Generate placeholder KPIs (marked as such in metadata)
      if (botId) {
        for (const kpiName of crmConfig.kpi_names) {
          await supabase.from('kpi_history').insert({
            company_id: company_id,
            bot_id: botId,
            cadence,
            period_start: periodStart,
            period_end: periodEnd,
            kpi_name: kpiName,
            kpi_value: summary.placeholder_kpis[kpiName],
            kpi_status: 'on_track',
            metadata: { 
              source: 'placeholder', 
              integration_type: crmConfig.integration_type,
              message: 'Placeholder data - integration not connected',
              generated_at: new Date().toISOString() 
            },
          });
        }

        // Create an informational exception about missing integration
        await supabase.from('exceptions').insert({
          company_id: company_id,
          bot_id: botId,
          exception_type: 'integration_missing',
          title: `${crmConfig.integration_type.toUpperCase().replace('_', ' ')} Not Connected`,
          description: `The ${crmConfig.integration_type.replace('_', ' ')} integration is not connected. Connect it in Settings to enable live data syncing for this bot.`,
          severity: 'medium',
          status: 'open',
          data: {
            integration_type: crmConfig.integration_type,
            bot_type,
          },
        });
      }
    } else {
      // Integration is connected - placeholder for future implementation
      summary = {
        integration_status: 'connected',
        integration_type: crmConfig.integration_type,
        bot_type,
        message: `${crmConfig.integration_type.toUpperCase().replace('_', ' ')} integration connected. Live data sync implementation pending.`,
        placeholder_kpis: generatePlaceholderKPIs(crmConfig.kpi_names),
        period_start: periodStart,
        period_end: periodEnd,
      };

      // TODO: Implement actual CRM data fetching when APIs are available
      // For now, still generate placeholder KPIs
      if (botId) {
        for (const kpiName of crmConfig.kpi_names) {
          await supabase.from('kpi_history').insert({
            company_id: company_id,
            bot_id: botId,
            cadence,
            period_start: periodStart,
            period_end: periodEnd,
            kpi_name: kpiName,
            kpi_value: summary.placeholder_kpis[kpiName],
            kpi_status: 'on_track',
            metadata: { 
              source: crmConfig.integration_type,
              message: 'API implementation pending',
              generated_at: new Date().toISOString() 
            },
          });
        }
      }
    }

    // Update bot run as completed
    await supabase
      .from('bot_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary: summary as unknown as Record<string, unknown>,
      })
      .eq('id', bot_run_id);

    console.log(`${bot_type} bot run completed`);

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

function generatePlaceholderKPIs(kpiNames: string[]): Record<string, number> {
  const kpis: Record<string, number> = {};
  
  for (const name of kpiNames) {
    // Generate somewhat realistic placeholder values
    if (name.includes('Rate') || name.includes('Satisfaction') || name.includes('Utilization')) {
      kpis[name] = Math.round(70 + Math.random() * 25); // 70-95%
    } else if (name.includes('Revenue')) {
      kpis[name] = Math.round(10000 + Math.random() * 40000); // $10k-$50k
    } else if (name.includes('Time')) {
      kpis[name] = Math.round(15 + Math.random() * 30); // 15-45 mins
    } else if (name.includes('Duration')) {
      kpis[name] = Math.round(2 + Math.random() * 6); // 2-8 days
    } else {
      kpis[name] = Math.round(5 + Math.random() * 45); // 5-50 count
    }
  }
  
  return kpis;
}

async function updateBotRunFailed(supabase: any, botRunId: string, errorMessage: string): Promise<void> {
  await supabase
    .from('bot_runs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', botRunId);
}
