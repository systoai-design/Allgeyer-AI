import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GHL_API_BASE = "https://services.leadconnectorhq.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LABORTECH_API_KEY = Deno.env.get("LABORTECH_API_KEY");
    if (!LABORTECH_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Labortech API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { company_id, action, location_id, limit = 20 } = body;

    console.log(`Labortech API: action=${action}, company=${company_id}`);

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", company_id)
      .eq("integration_type", "labortech")
      .single();

    const savedLocationId = integration?.config?.location_id;
    const effectiveLocationId = location_id || savedLocationId;

    const ghlHeaders = {
      "Authorization": `Bearer ${LABORTECH_API_KEY}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28",
    };

    if (action === "test_connection") {
      // Test with locations search endpoint
      const response = await fetch(`${GHL_API_BASE}/locations/search`, {
        method: "POST",
        headers: ghlHeaders,
        body: JSON.stringify({ limit: 10, skip: 0 }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GHL error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to connect", details: errorText, status: response.status }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ 
          success: true, 
          locations: data.locations || [], 
          total: data.total || 0,
          token_type: "agency" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_contacts") {
      if (!effectiveLocationId) {
        return new Response(
          JSON.stringify({ error: "location_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(
        `${GHL_API_BASE}/contacts/?locationId=${effectiveLocationId}&limit=${limit}`,
        { headers: ghlHeaders }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ error: "Failed to fetch contacts", details: errorText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ success: true, contacts: data.contacts || [], total: data.meta?.total || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Labortech API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
