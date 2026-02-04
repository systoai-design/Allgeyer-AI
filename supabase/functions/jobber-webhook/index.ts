import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-jobber-signature',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check for GET requests (Jobber validation)
  if (req.method === 'GET') {
    console.log("Jobber Webhook health check received");
    return new Response(
      JSON.stringify({ 
        status: "active", 
        message: "Jobber webhook endpoint is active and ready to receive notifications",
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }

  // Handle POST requests (actual webhook notifications)
  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const body = await req.text();
      console.log("Jobber Webhook received, payload:", body);

      // Parse the notification payload
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        console.log("Non-JSON payload received");
        return new Response(
          JSON.stringify({ success: false, error: "Invalid JSON payload" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Log the webhook event
      console.log("Parsed Jobber webhook payload:", JSON.stringify(payload, null, 2));

      // Extract event type and data
      const eventType = payload.topic || payload.event_type || payload.type;
      const eventData = payload.data || payload;

      console.log(`Processing Jobber event: ${eventType}`);

      // Handle different Jobber webhook event types
      switch (eventType) {
        case 'APP_DISCONNECT':
          console.log('Jobber app disconnected, cleaning up integration...');
          // Find and mark integration as disconnected
          // Jobber sends account_id in the payload
          const accountId = eventData.account_id || eventData.accountId;
          if (accountId) {
            console.log(`Disconnecting Jobber for account: ${accountId}`);
            // Note: We'd need to store account_id during OAuth to match here
            // For now, just log the event
          }
          break;

        case 'CLIENT_UPDATE':
          console.log('Client updated in Jobber:', eventData);
          // Handle client updates - could sync to local CRM data
          break;

        case 'INVOICE_UPDATE':
          console.log('Invoice updated in Jobber:', eventData);
          // Handle invoice updates - trigger financial control checks
          break;

        case 'JOB_CLOSED':
          console.log('Job closed in Jobber:', eventData);
          // Handle completed jobs - update tracking, trigger reports
          break;

        case 'JOB_UPDATE':
          console.log('Job updated in Jobber:', eventData);
          // Handle job status changes
          break;

        case 'REQUEST_UPDATE':
          console.log('Request updated in Jobber:', eventData);
          // Handle service request changes
          break;

        default:
          console.log(`Unhandled Jobber event type: ${eventType}`, eventData);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Webhook notification received and processed",
          event_type: eventType,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Jobber Webhook error:", errorMessage);
      
      // Return 200 to prevent Jobber from retrying (handle errors gracefully)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  }

  // Method not allowed
  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    }
  );
});
