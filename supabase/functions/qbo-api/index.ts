// QBO API v2
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const QBO_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QBO_SANDBOX_API_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

// Use sandbox in development, production in prod
const USE_SANDBOX = false;
const API_BASE = USE_SANDBOX ? QBO_SANDBOX_API_BASE : QBO_API_BASE;

interface QBOTokens {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  realm_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('QBO_CLIENT_ID');
    const clientSecret = Deno.env.get('QBO_CLIENT_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { company_id, endpoint, method = 'GET', params = {} } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get integration credentials
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('integration_type', 'quickbooks')
      .single();

    if (intError || !integration) {
      console.error('Integration not found:', intError);
      return new Response(
        JSON.stringify({ error: 'QuickBooks not connected for this company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const config = integration.config as QBOTokens;
    if (!config.access_token || !config.realm_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid QuickBooks configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if token needs refresh
    let accessToken = config.access_token;
    const tokenExpiresAt = new Date(config.token_expires_at);
    const now = new Date();
    
    if (now >= tokenExpiresAt) {
      console.log('Token expired, refreshing...');
      
      const tokenResponse = await fetch(QBO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: config.refresh_token,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token refresh failed:', tokens);
        
        // Mark integration as disconnected
        await supabase
          .from('integrations')
          .update({ is_connected: false })
          .eq('id', integration.id);

        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please reconnect QuickBooks.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      // Update stored tokens
      accessToken = tokens.access_token;
      await supabase
        .from('integrations')
        .update({
          config: {
            ...config,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          },
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', integration.id);

      console.log('Token refreshed successfully');
    }

    // Build QBO API URL
    const realmId = config.realm_id;
    let apiUrl = `${API_BASE}/${realmId}/${endpoint}`;
    
    // Add query parameters
    const queryParams = new URLSearchParams({ minorversion: '65', ...params });
    apiUrl += `?${queryParams.toString()}`;

    console.log(`QBO API request: ${method} ${apiUrl}`);

    // Make QBO API request
    const qboResponse = await fetch(apiUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const intuitTid = qboResponse.headers.get('intuit-tid');
    console.log('QBO response status:', qboResponse.status, 'intuit_tid:', intuitTid);

    const data = await qboResponse.json();

    if (!qboResponse.ok) {
      console.error('QBO API error:', data);
      return new Response(
        JSON.stringify({ 
          error: 'QuickBooks API error', 
          details: data,
          intuit_tid: intuitTid 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: qboResponse.status }
      );
    }

    // Update last sync time
    await supabase
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id);

    return new Response(
      JSON.stringify({ data, intuit_tid: intuitTid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('QBO API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
