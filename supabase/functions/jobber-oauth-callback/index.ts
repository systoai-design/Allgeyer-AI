import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('Jobber OAuth callback received');

    // Handle user denial or errors
    if (error) {
      console.error('Jobber OAuth error:', error, errorDescription);
      return new Response(
        generateHtmlResponse('error', `Authorization failed: ${errorDescription || error}`),
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    if (!code || !state) {
      console.error('Missing required parameters - code:', !!code, 'state:', !!state);
      return new Response(
        generateHtmlResponse('error', 'Missing required OAuth parameters'),
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    // Parse state to get company ID
    const stateParts = state.split(':');
    if (stateParts.length < 2) {
      console.error('Invalid state format');
      return new Response(
        generateHtmlResponse('error', 'Invalid state parameter'),
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }
    const companyId = stateParts[1];

    // Get environment variables
    const clientId = Deno.env.get('JOBBER_CLIENT_ID');
    const clientSecret = Deno.env.get('JOBBER_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret) {
      console.error('Jobber credentials not configured');
      return new Response(
        generateHtmlResponse('error', 'Jobber credentials not configured'),
        { headers: { 'Content-Type': 'text/html' }, status: 500 }
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/jobber-oauth-callback`;

    console.log('Exchanging Jobber code for tokens...');

    // Exchange code for tokens
    const tokenResponse = await fetch(JOBBER_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Jobber token exchange failed:', tokens);
      return new Response(
        generateHtmlResponse('error', `Token exchange failed: ${tokens.error_description || tokens.error || 'Unknown error'}`),
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    console.log('Jobber token exchange successful');

    // Store tokens in database
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Calculate token expiry (Jobber tokens typically expire in 2 hours)
    const expiresIn = tokens.expires_in || 7200;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    
    // Refresh tokens typically last 30 days for Jobber
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Update or insert integration record
    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        company_id: companyId,
        integration_type: 'jobber',
        is_connected: true,
        last_sync_at: new Date().toISOString(),
        config: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt,
          refresh_token_expires_at: refreshTokenExpiresAt,
        },
      }, {
        onConflict: 'company_id,integration_type',
      });

    if (dbError) {
      console.error('Failed to store Jobber tokens:', dbError);
      return new Response(
        generateHtmlResponse('error', 'Failed to save connection'),
        { headers: { 'Content-Type': 'text/html' }, status: 500 }
      );
    }

    console.log('Jobber integration saved for company:', companyId);

    return new Response(
      generateHtmlResponse('success', 'Jobber connected successfully!'),
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Jobber OAuth callback error:', errorMessage);
    return new Response(
      generateHtmlResponse('error', `An error occurred: ${errorMessage}`),
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
});

function generateHtmlResponse(status: 'success' | 'error', message: string): string {
  const isSuccess = status === 'success';
  const color = isSuccess ? '#10b981' : '#ef4444';
  const icon = isSuccess ? '✓' : '✕';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Jobber Connection</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f8fafc;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${color};
      color: white;
      font-size: 32px;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 20px;
    }
    h1 {
      color: #1e293b;
      margin: 0 0 10px;
      font-size: 24px;
    }
    p {
      color: #64748b;
      margin: 0 0 20px;
    }
    .close-btn {
      background: ${color};
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${isSuccess ? 'Connected!' : 'Connection Failed'}</h1>
    <p>${message}</p>
    <button class="close-btn" onclick="window.close(); window.opener?.location.reload();">
      Close Window
    </button>
  </div>
  <script>
    // Auto-close after 3 seconds on success
    ${isSuccess ? 'setTimeout(() => { window.close(); window.opener?.location.reload(); }, 3000);' : ''}
  </script>
</body>
</html>
  `;
}
