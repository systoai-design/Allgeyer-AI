// QBO OAuth v2
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// QBO OAuth endpoints
const QBO_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    const clientId = Deno.env.get('QBO_CLIENT_ID');
    const clientSecret = Deno.env.get('QBO_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'QBO credentials not configured' }),
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

      // Generate CSRF state token
      const state = crypto.randomUUID() + ':' + companyId;
      
      const redirectUri = `${supabaseUrl}/functions/v1/qbo-oauth-callback`;
      
      const authParams = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'com.intuit.quickbooks.accounting',
        state: state,
      });

      const authUrl = `${QBO_AUTH_URL}?${authParams.toString()}`;

      console.log('Generated QBO auth URL for company:', companyId);

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

      const tokenResponse = await fetch(QBO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refresh_token,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token refresh failed:', tokens);
        return new Response(
          JSON.stringify({ error: 'Token refresh failed', details: tokens }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Token refreshed successfully');

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
    console.error('QBO OAuth error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
