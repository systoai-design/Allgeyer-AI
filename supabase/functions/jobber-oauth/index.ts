const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Jobber OAuth endpoints v2
const JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

Deno.serve(async (req) => {
  console.log('Jobber OAuth function called:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    const clientId = Deno.env.get('JOBBER_CLIENT_ID');
    const clientSecret = Deno.env.get('JOBBER_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!clientId || !clientSecret) {
      console.error('Jobber credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Jobber credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Generate authorization URL
    if (action === 'authorize') {
      const companyId = url.searchParams.get('company_id');
      
      if (!companyId) {
        return new Response(
          JSON.stringify({ error: 'company_id is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Generate CSRF state token with company ID
      const state = crypto.randomUUID() + ':' + companyId;
      
      const redirectUri = `${supabaseUrl}/functions/v1/jobber-oauth-callback`;
      
      const authParams = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state: state,
      });

      const authUrl = `${JOBBER_AUTH_URL}?${authParams.toString()}`;

      console.log('Generated Jobber auth URL for company:', companyId);

      return new Response(
        JSON.stringify({ 
          auth_url: authUrl,
          state: state 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh token
    if (action === 'refresh') {
      const body = await req.json();
      const { refresh_token } = body;

      if (!refresh_token) {
        return new Response(
          JSON.stringify({ error: 'refresh_token is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Refreshing Jobber token...');

      const tokenResponse = await fetch(JOBBER_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refresh_token,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Jobber token refresh failed:', tokens);
        return new Response(
          JSON.stringify({ error: 'Token refresh failed', details: tokens }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Jobber token refreshed successfully');

      return new Response(
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use ?action=authorize or ?action=refresh' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Jobber OAuth error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
