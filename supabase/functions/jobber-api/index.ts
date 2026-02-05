const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { company_id, query, variables } = body;

    console.log(`Jobber API: company=${company_id}`);

    if (!company_id || !query) {
      return new Response(
        JSON.stringify({ error: 'company_id and query are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('JOBBER_CLIENT_ID');
    const clientSecret = Deno.env.get('JOBBER_CLIENT_SECRET');

    // Fetch integration directly via REST
    const intResponse = await fetch(
      `${supabaseUrl}/rest/v1/integrations?company_id=eq.${company_id}&integration_type=eq.jobber&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const integrations = await intResponse.json();
    const integration = integrations?.[0];

    if (!integration) {
      return new Response(
        JSON.stringify({ error: 'Jobber not connected for this company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const config = integration.config;
    if (!config?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Invalid Jobber configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let accessToken = config.access_token;
    const tokenExpiresAt = new Date(config.token_expires_at);
    
    // Refresh token if expired
    if (new Date() >= new Date(tokenExpiresAt.getTime() - 5 * 60 * 1000)) {
      console.log('Refreshing Jobber token...');
      
      const tokenResponse = await fetch("https://api.getjobber.com/api/oauth/token", {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: config.refresh_token,
        }),
      });

      if (!tokenResponse.ok) {
        // Mark as disconnected
        await fetch(
          `${supabaseUrl}/rest/v1/integrations?id=eq.${integration.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_connected: false }),
          }
        );
        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please reconnect Jobber.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;
      
      // Update tokens
      await fetch(
        `${supabaseUrl}/rest/v1/integrations?id=eq.${integration.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expires_at: new Date(Date.now() + (tokens.expires_in || 7200) * 1000).toISOString(),
            },
          }),
        }
      );
      console.log('Jobber token refreshed');
    }

    // Make GraphQL request
    const jobberResponse = await fetch("https://api.getjobber.com/api/graphql", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-JOBBER-GRAPHQL-VERSION': '2023-08-18',
      },
      body: JSON.stringify({ query, variables: variables || {} }),
    });

    const data = await jobberResponse.json();

    if (!jobberResponse.ok || data.errors) {
      console.error('Jobber API error:', data);
      return new Response(
        JSON.stringify({ error: 'Jobber API error', details: data.errors || data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update last sync
    await fetch(
      `${supabaseUrl}/rest/v1/integrations?id=eq.${integration.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ last_sync_at: new Date().toISOString() }),
      }
    );

    return new Response(
      JSON.stringify({ data: data.data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Jobber API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
