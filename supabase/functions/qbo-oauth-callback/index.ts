// QBO OAuth Callback v2
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const realmId = url.searchParams.get('realmId');
    const error = url.searchParams.get('error');
    const intuitTid = req.headers.get('intuit-tid');

    console.log('QBO OAuth callback received - intuit_tid:', intuitTid);

    // Handle user denial or errors
    if (error) {
      console.error('QBO OAuth error:', error);
      return new Response(
        generateHtmlResponse('error', `Authorization failed: ${error}`),
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    if (!code || !state || !realmId) {
      console.error('Missing required parameters');
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

    // Exchange code for tokens
    const clientId = Deno.env.get('QBO_CLIENT_ID');
    const clientSecret = Deno.env.get('QBO_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret) {
      return new Response(
        generateHtmlResponse('error', 'QBO credentials not configured'),
        { headers: { 'Content-Type': 'text/html' }, status: 500 }
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/qbo-oauth-callback`;

    console.log('Exchanging code for tokens...');

    const tokenResponse = await fetch(QBO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      return new Response(
        generateHtmlResponse('error', `Token exchange failed: ${tokens.error_description || tokens.error}`),
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    console.log('Token exchange successful for realm:', realmId);

    // Store tokens in database
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Update or insert integration record
    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        company_id: companyId,
        integration_type: 'quickbooks',
        is_connected: true,
        last_sync_at: new Date().toISOString(),
        config: {
          realm_id: realmId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          refresh_token_expires_at: new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000).toISOString(),
        },
      }, {
        onConflict: 'company_id,integration_type',
      });

    if (dbError) {
      console.error('Failed to store tokens:', dbError);
      return new Response(
        generateHtmlResponse('error', 'Failed to save connection'),
        { headers: { 'Content-Type': 'text/html' }, status: 500 }
      );
    }

    console.log('QBO integration saved for company:', companyId);

    return new Response(
      generateHtmlResponse('success', 'QuickBooks Online connected successfully!'),
      { headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('QBO OAuth callback error:', errorMessage);
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
  <title>QuickBooks Connection</title>
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
