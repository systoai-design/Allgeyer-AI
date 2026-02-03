import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookUrl = "https://services.leadconnectorhq.com/hooks/ZEK48FxR4zmclT6I5cp5/webhook-trigger/76e0c15d-14cc-4468-9de0-e3439fc59229";

    // Sample bot report data
    const testPayload = {
      report_type: "daily_financial_control",
      company: "Property Halo",
      generated_at: new Date().toISOString(),
      cadence: "daily",
      kpis: {
        uncategorized_transactions: { value: 3, status: "on_track", trend: -40 },
        duplicate_flags: { value: 1, status: "on_track", trend: 0 },
        incomplete_transactions: { value: 7, status: "warning", trend: 16 },
        cash_position: { value: 485000, status: "on_track", trend: 5 },
      },
      exceptions: [
        {
          title: "Missing vendor for $2,450 transaction",
          severity: "medium",
          status: "open",
          created_at: new Date().toISOString(),
        },
        {
          title: "Duplicate payment detected - Invoice #1234",
          severity: "high", 
          status: "open",
          created_at: new Date().toISOString(),
        },
      ],
      summary: "Daily financial control report for Property Halo. 3 uncategorized transactions, 2 open exceptions requiring attention.",
      source: "Systo Bot Platform",
    };

    console.log("Sending test payload to GHL webhook:", JSON.stringify(testPayload, null, 2));

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    console.log("GHL webhook response:", response.status, responseText);

    return new Response(
      JSON.stringify({
        success: true,
        webhook_status: response.status,
        webhook_response: responseText,
        payload_sent: testPayload,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending to webhook:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
