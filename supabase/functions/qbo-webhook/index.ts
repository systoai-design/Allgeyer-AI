// QBO Webhook v2
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, intuit-signature',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check for GET requests (Intuit validation)
  if (req.method === 'GET') {
    console.log("QBO Webhook health check received");
    return new Response(
      JSON.stringify({ 
        status: "active", 
        message: "QuickBooks Online webhook endpoint is active and ready to receive notifications",
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
      const intuitSignature = req.headers.get('intuit-signature');
      const intuitTid = req.headers.get('intuit-tid');
      
      console.log("QBO Webhook received - intuit_tid:", intuitTid);
      
      const body = await req.text();
      console.log("QBO Webhook payload:", body);

      // Parse the notification payload
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        console.log("Non-JSON payload received, treating as verification challenge");
        // Intuit might send a verification challenge
        return new Response(body, {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
          status: 200,
        });
      }

      // Log the webhook event for debugging
      console.log("Parsed webhook payload:", JSON.stringify(payload, null, 2));

      // Handle different event types from QBO
      if (payload.eventNotifications) {
        for (const notification of payload.eventNotifications) {
          const realmId = notification.realmId;
          const dataChangeEvent = notification.dataChangeEvent;
          
          console.log(`Processing notification for realm: ${realmId}`);
          
          if (dataChangeEvent?.entities) {
            for (const entity of dataChangeEvent.entities) {
              console.log(`Entity changed: ${entity.name}, ID: ${entity.id}, Operation: ${entity.operation}`);
              
              // Here we would process the change
              // For now, just log it
              // Future: trigger appropriate bot runs based on entity type
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Webhook notification received and processed",
          intuit_tid: intuitTid,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("QBO Webhook error:", errorMessage);
      
      // Always return 200 to prevent Intuit from retrying
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
