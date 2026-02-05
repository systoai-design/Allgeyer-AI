import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// GoHighLevel/Labortech API base URL
const GHL_API_BASE = "https://services.leadconnectorhq.com";

interface LabortechRequest {
  company_id: string;
  action: "test_connection" | "get_contacts" | "get_opportunities" | "get_pipelines";
  location_id?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LABORTECH_API_KEY = Deno.env.get("LABORTECH_API_KEY");
    if (!LABORTECH_API_KEY) {
      console.error("LABORTECH_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Labortech API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: LabortechRequest = await req.json();
    const { company_id, action, location_id, limit = 20 } = body;

    console.log(`Labortech API request: action=${action}, company_id=${company_id}`);

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the integration config to check for location_id
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("company_id", company_id)
      .eq("integration_type", "labortech")
      .single();

    // Use location_id from request or from saved config
    const effectiveLocationId = location_id || 
      (integration?.config as { location_id?: string })?.location_id;

    // Common headers for GHL API
    const ghlHeaders = {
      "Authorization": `Bearer ${LABORTECH_API_KEY}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28",
    };

    let result: Record<string, unknown> = {};

    switch (action) {
      case "test_connection": {
        // Test connection by fetching locations (works with Private Integration Token)
        // First try to get the current user/agency info
        const locationsResponse = await fetch(
          `${GHL_API_BASE}/locations/search`,
          {
            method: "POST",
            headers: ghlHeaders,
            body: JSON.stringify({
              limit: 10,
              skip: 0,
            }),
          }
        );

        if (!locationsResponse.ok) {
          const errorText = await locationsResponse.text();
          console.error("GHL locations error:", locationsResponse.status, errorText);
          
          // Try alternative endpoint for sub-account tokens
          if (effectiveLocationId) {
            const locationResponse = await fetch(
              `${GHL_API_BASE}/locations/${effectiveLocationId}`,
              { headers: ghlHeaders }
            );
            
            if (locationResponse.ok) {
              const locationData = await locationResponse.json();
              result = {
                success: true,
                location: locationData.location,
                token_type: "sub_account",
              };
              break;
            }
          }
          
          return new Response(
            JSON.stringify({ 
              error: "Failed to connect to Labortech API",
              details: errorText,
              status: locationsResponse.status 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const locationsData = await locationsResponse.json();
        result = {
          success: true,
          locations: locationsData.locations || [],
          total: locationsData.total || 0,
          token_type: "agency",
        };
        break;
      }

      case "get_contacts": {
        if (!effectiveLocationId) {
          return new Response(
            JSON.stringify({ error: "location_id is required for contacts" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const contactsResponse = await fetch(
          `${GHL_API_BASE}/contacts/?locationId=${effectiveLocationId}&limit=${limit}`,
          { headers: ghlHeaders }
        );

        if (!contactsResponse.ok) {
          const errorText = await contactsResponse.text();
          console.error("GHL contacts error:", contactsResponse.status, errorText);
          return new Response(
            JSON.stringify({ error: "Failed to fetch contacts", details: errorText }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const contactsData = await contactsResponse.json();
        result = {
          success: true,
          contacts: contactsData.contacts || [],
          total: contactsData.meta?.total || contactsData.contacts?.length || 0,
        };
        break;
      }

      case "get_opportunities": {
        if (!effectiveLocationId) {
          return new Response(
            JSON.stringify({ error: "location_id is required for opportunities" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const oppsResponse = await fetch(
          `${GHL_API_BASE}/opportunities/search?location_id=${effectiveLocationId}&limit=${limit}`,
          {
            method: "POST",
            headers: ghlHeaders,
            body: JSON.stringify({
              location_id: effectiveLocationId,
              limit,
            }),
          }
        );

        if (!oppsResponse.ok) {
          const errorText = await oppsResponse.text();
          console.error("GHL opportunities error:", oppsResponse.status, errorText);
          return new Response(
            JSON.stringify({ error: "Failed to fetch opportunities", details: errorText }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const oppsData = await oppsResponse.json();
        result = {
          success: true,
          opportunities: oppsData.opportunities || [],
          total: oppsData.meta?.total || oppsData.opportunities?.length || 0,
        };
        break;
      }

      case "get_pipelines": {
        if (!effectiveLocationId) {
          return new Response(
            JSON.stringify({ error: "location_id is required for pipelines" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const pipelinesResponse = await fetch(
          `${GHL_API_BASE}/opportunities/pipelines?locationId=${effectiveLocationId}`,
          { headers: ghlHeaders }
        );

        if (!pipelinesResponse.ok) {
          const errorText = await pipelinesResponse.text();
          console.error("GHL pipelines error:", pipelinesResponse.status, errorText);
          return new Response(
            JSON.stringify({ error: "Failed to fetch pipelines", details: errorText }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const pipelinesData = await pipelinesResponse.json();
        result = {
          success: true,
          pipelines: pipelinesData.pipelines || [],
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Labortech API success: ${JSON.stringify(result).slice(0, 200)}...`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Labortech API error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
