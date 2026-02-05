const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    console.log(`Labortech API: action=${action}, company=${company_id}, location=${location_id}`);

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GHL_API_BASE = "https://services.leadconnectorhq.com";
    const ghlHeaders = {
      "Authorization": `Bearer ${LABORTECH_API_KEY}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28",
    };

    // For test_connection, we need a location_id to test with Private Integration tokens
    if (action === "test_connection") {
      // If no location_id provided, we can't fully test but we can verify the token format
      // Try getting contacts which requires location_id - if provided
      if (location_id) {
        const response = await fetch(
          `${GHL_API_BASE}/contacts/?locationId=${location_id}&limit=1`,
          { headers: ghlHeaders }
        );

        console.log("Test connection - contacts response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("GHL test error:", response.status, errorText);
          return new Response(
            JSON.stringify({ 
              error: "Failed to connect to Labortech/GHL", 
              details: errorText, 
              status: response.status,
              hint: "Please verify the API key has access to this location"
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data = await response.json();
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Successfully connected to Labortech",
            contacts_available: data.meta?.total || 0,
            token_type: "private_integration" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Without location_id, try the calendars endpoint which may work
      // This is a lighter test - just validates token format
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "API key is configured. Provide a location_id to fully test connection.",
          needs_location_id: true,
          token_type: "private_integration" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_contacts") {
      if (!location_id) {
        return new Response(
          JSON.stringify({ error: "location_id is required for get_contacts" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(
        `${GHL_API_BASE}/contacts/?locationId=${location_id}&limit=${limit}`,
        { headers: ghlHeaders }
      );

      console.log("Contacts API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Contacts error:", response.status, errorText);
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

    if (action === "get_opportunities") {
      if (!location_id) {
        return new Response(
          JSON.stringify({ error: "location_id is required for get_opportunities" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const response = await fetch(
        `${GHL_API_BASE}/opportunities/search?location_id=${location_id}&limit=${limit}`,
        { 
          method: "POST",
          headers: ghlHeaders,
          body: JSON.stringify({})
        }
      );

      console.log("Opportunities API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Opportunities error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch opportunities", details: errorText }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ success: true, opportunities: data.opportunities || [], total: data.meta?.total || 0 }),
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
