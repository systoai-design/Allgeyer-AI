import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

interface JobberTokens {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('JOBBER_CLIENT_ID');
    const clientSecret = Deno.env.get('JOBBER_CLIENT_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { company_id, query, variables = {} } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'GraphQL query is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get integration credentials
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('integration_type', 'jobber')
      .single();

    if (intError || !integration) {
      console.error('Jobber integration not found:', intError);
      return new Response(
        JSON.stringify({ error: 'Jobber not connected for this company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const config = integration.config as JobberTokens;
    if (!config.access_token) {
      return new Response(
        JSON.stringify({ error: 'Invalid Jobber configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if token needs refresh
    let accessToken = config.access_token;
    const tokenExpiresAt = new Date(config.token_expires_at);
    const now = new Date();
    
    // Refresh if token expires within 5 minutes
    if (now >= new Date(tokenExpiresAt.getTime() - 5 * 60 * 1000)) {
      console.log('Jobber token expired or expiring soon, refreshing...');
      
      const tokenResponse = await fetch(JOBBER_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: config.refresh_token,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Jobber token refresh failed:', tokens);
        
        // Mark integration as disconnected
        await supabase
          .from('integrations')
          .update({ is_connected: false })
          .eq('id', integration.id);

        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please reconnect Jobber.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      // Update stored tokens
      accessToken = tokens.access_token;
      const expiresIn = tokens.expires_in || 7200;
      
      await supabase
        .from('integrations')
        .update({
          config: {
            ...config,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          },
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', integration.id);

      console.log('Jobber token refreshed successfully');
    }

    // Make Jobber GraphQL API request
    console.log('Making Jobber GraphQL request...');

    const jobberResponse = await fetch(JOBBER_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-JOBBER-GRAPHQL-VERSION': '2023-08-18',
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await jobberResponse.json();

    if (!jobberResponse.ok) {
      console.error('Jobber API error:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Jobber API error', 
          details: data,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: jobberResponse.status }
      );
    }

    // Check for GraphQL errors
    if (data.errors && data.errors.length > 0) {
      console.error('Jobber GraphQL errors:', data.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Jobber GraphQL error', 
          details: data.errors,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update last sync time
    await supabase
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id);

    console.log('Jobber API request successful');

    return new Response(
      JSON.stringify({ data: data.data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Jobber API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
