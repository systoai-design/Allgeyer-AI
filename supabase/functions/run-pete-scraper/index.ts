import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BROWSERLESS_URL = "https://production-sfo.browserless.io";

interface ScrapedKpis {
  leads?: number;
  appointments?: number;
  calls?: number;
  completed_deals?: number;
  contracts_in_pipeline?: number;
  pipeline_value?: number;
  under_contract?: number;
  upcoming_closings?: number;
  assets_bought?: number;
  assets_sold?: number;
  closings?: number;
  roi?: number;
  capital_deployed?: number;
  portfolio_valuation?: number;
}

interface ScrapeResult {
  success: boolean;
  kpis: ScrapedKpis;
  error?: string;
  rawData?: unknown;
}

function parseSessionCookies(cookieString: string): Array<{ name: string; value: string; domain: string }> {
  const cookies: Array<{ name: string; value: string; domain: string }> = [];
  const pairs = cookieString.split(";").map((s) => s.trim()).filter(Boolean);
  
  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex > 0) {
      cookies.push({
        name: pair.substring(0, eqIndex).trim(),
        value: pair.substring(eqIndex + 1).trim(),
        domain: "app.thepete.io",
      });
    }
  }
  
  return cookies;
}

async function scrapePeteDashboard(
  browserlessToken: string,
  sessionCookies: string
): Promise<ScrapeResult> {
  console.log("[PETE Scraper] Starting browser automation with session cookies...");

  // Parse the session cookies
  const cookies = parseSessionCookies(sessionCookies);
  console.log(`[PETE Scraper] Parsed ${cookies.length} cookies`);

  if (cookies.length === 0) {
    return {
      success: false,
      kpis: {},
      error: "No valid session cookies found. Please update PETE_SESSION_COOKIES secret.",
    };
  }

  // Build cookies array for BQL
  const cookiesInput = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: ".thepete.io",
    path: "/",
  }));

  // BrowserQL mutation to set cookies, then navigate to dashboard
  const bqlQuery = `
    mutation ScrapeKpis($cookies: [CookieInput!]) {
      # First set all cookies
      setCookies: cookies(cookies: $cookies) {
        cookies {
          name
          value
        }
      }
      
      # Navigate to dashboard (cookies will authenticate us)
      goto(url: "https://app.thepete.io/dashboard", waitUntil: networkIdle) {
        status
        url
      }
      
      # Wait for page to load
      pageWait: waitForSelector(selector: "body", timeout: 20000) {
        selector
      }
      
      # Take screenshot for debugging
      screenshot: screenshot {
        base64
      }
      
      # Extract page content
      pageContent: text(selector: "body") {
        text
      }
    }
  `;

  try {
    console.log("[PETE Scraper] Sending request to Browserless...");
    console.log("[PETE Scraper] BQL Query:", bqlQuery.substring(0, 500) + "...");
    
    const response = await fetch(
      `${BROWSERLESS_URL}/chromium/bql?token=${browserlessToken}&stealth=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: bqlQuery,
          variables: {
            cookies: cookiesInput,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PETE Scraper] Browserless API error:", errorText);
      return {
        success: false,
        kpis: {},
        error: `Browserless API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    console.log("[PETE Scraper] Raw response received");
    console.log("[PETE Scraper] Full response:", JSON.stringify(result, null, 2).substring(0, 2000));
    
    // Check for BQL errors
    if (result.errors && result.errors.length > 0) {
      console.error("[PETE Scraper] BQL errors:", JSON.stringify(result.errors));
      return {
        success: false,
        kpis: {},
        error: `BQL execution error: ${result.errors.map((e: { message: string }) => e.message).join(", ")}`,
        rawData: result,
      };
    }
    
    const currentUrl = result?.data?.goto?.url || "";
    console.log("[PETE Scraper] Current URL after navigation:", currentUrl);

    // Check if we were redirected to login (session expired)
    if (currentUrl.includes("/login") || currentUrl.includes("/signin")) {
      console.log("[PETE Scraper] Session expired - redirected to login");
      return {
        success: false,
        kpis: {},
        error: "Session cookies expired. Please log in again and update PETE_SESSION_COOKIES secret with fresh cookies.",
        rawData: result,
      };
    }

    // Extract page content
    const pageContent = result?.data?.pageContent?.text || "";
    console.log("[PETE Scraper] Page content length:", pageContent.length);
    console.log("[PETE Scraper] Page content preview (first 2000 chars):", pageContent.substring(0, 2000));
    
    // Check for login/auth keywords that indicate we're not authenticated
    if (
      pageContent.toLowerCase().includes("sign in") ||
      pageContent.toLowerCase().includes("log in") ||
      pageContent.toLowerCase().includes("enter your email")
    ) {
      console.log("[PETE Scraper] Not authenticated - session may be invalid");
      return {
        success: false,
        kpis: {},
        error: "Session cookies appear invalid or expired. Please update PETE_SESSION_COOKIES with fresh cookies.",
        rawData: result,
      };
    }

    // Parse KPIs from page content
    const kpis = parseKpisFromContent(pageContent);
    console.log("[PETE Scraper] Extracted KPIs:", kpis);

    return {
      success: true,
      kpis,
      rawData: result,
    };
  } catch (error) {
    console.error("[PETE Scraper] Error:", error);
    return {
      success: false,
      kpis: {},
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

function parseKpisFromContent(content: string): ScrapedKpis {
  const kpis: ScrapedKpis = {};

  // Helper to extract numbers - handles patterns like "Leads\nToday\n2" or "Calls\n791"
  const extractAfterKeyword = (text: string, keywords: string[]): number | undefined => {
    for (const keyword of keywords) {
      // Pattern 1: "Keyword\n...\nNumber" (PETE format with time period)
      const multilineRegex = new RegExp(
        `${keyword}\\s*\\n[^\\d]*?\\n\\s*([\\d,]+)`,
        "i"
      );
      const multilineMatch = text.match(multilineRegex);
      if (multilineMatch) {
        const num = parseFloat(multilineMatch[1].replace(/,/g, ""));
        if (!isNaN(num)) return num;
      }

      // Pattern 2: "Keyword\nNumber" (direct)
      const directRegex = new RegExp(
        `${keyword}\\s*\\n\\s*([\\d,]+)`,
        "i"
      );
      const directMatch = text.match(directRegex);
      if (directMatch) {
        const num = parseFloat(directMatch[1].replace(/,/g, ""));
        if (!isNaN(num)) return num;
      }

      // Pattern 3: "Keyword: Number" or "Keyword Number"
      const inlineRegex = new RegExp(
        `${keyword}[:\\s]+[$]?([\\d,]+(?:\\.\\d+)?)`,
        "i"
      );
      const inlineMatch = text.match(inlineRegex);
      if (inlineMatch) {
        const num = parseFloat(inlineMatch[1].replace(/,/g, ""));
        if (!isNaN(num)) return num;
      }
    }
    return undefined;
  };

  // PETE Dashboard specific extractions based on actual content structure
  // "Leads\nToday\n2" - Extract leads from the "Leads Today" section
  const leadsMatch = content.match(/Leads\s*\n\s*Today\s*\n\s*(\d+)/i);
  if (leadsMatch) {
    kpis.leads = parseInt(leadsMatch[1], 10);
  }

  // "Appointments\nThis Week\n0" - Appointments section
  kpis.appointments = extractAfterKeyword(content, ["Appointments"]);

  // "Calls\n791" - from Inbound Messages & Calls section
  const callsMatch = content.match(/Calls\s*\n\s*([\d,]+)/i);
  if (callsMatch) {
    kpis.calls = parseInt(callsMatch[1].replace(/,/g, ""), 10);
  }

  // "New Contracts\nThis Week\n0"
  const contractsMatch = content.match(/New Contracts\s*\n[^0-9]*\n\s*(\d+)/i);
  if (contractsMatch) {
    kpis.contracts_in_pipeline = parseInt(contractsMatch[1], 10);
  }

  // Messages (inbound + outbound)
  const messagesMatch = content.match(/Messages\s*\n\s*([\d,]+)/i);
  const outboundMatch = content.match(/Outbound Messages[\s\S]*?Count\s*\n\s*([\d,]+)/i);
  
  // Chester Leads (total leads added)
  const chesterAllTimeMatch = content.match(/Chester(?:\s+Leads)?\s*\n\s*([\d,]+)/i);
  const chesterMonthMatch = content.match(/Chester Leads Added Month\s*\n\s*([\d,]+)/i);
  
  // Auction Dates count
  const auctionMatch = content.match(/Auction Dates[\s\S]*?Count\s*\n\s*([\d,]+)/i);
  if (auctionMatch) {
    kpis.upcoming_closings = parseInt(auctionMatch[1].replace(/,/g, ""), 10);
  }

  // Call Comp Ratio %
  const callRatioMatch = content.match(/Call Comp Ratio[\s\S]*?Ratio Count\s*\n\s*([\d.]+)/i);
  if (callRatioMatch) {
    // This could be useful for tracking performance
  }

  // For other KPIs, use generic extraction
  kpis.completed_deals = extractAfterKeyword(content, ["completed deals", "closed deals", "deals closed"]);
  kpis.pipeline_value = extractAfterKeyword(content, ["pipeline value", "pipeline \\$", "total pipeline"]);
  kpis.under_contract = extractAfterKeyword(content, ["under contract", "contracted"]);
  kpis.assets_bought = extractAfterKeyword(content, ["assets bought", "properties purchased", "acquisitions"]);
  kpis.assets_sold = extractAfterKeyword(content, ["assets sold", "properties sold", "dispositions"]);
  kpis.closings = extractAfterKeyword(content, ["closings", "closed"]);
  kpis.roi = extractAfterKeyword(content, ["roi", "return on investment"]);
  kpis.capital_deployed = extractAfterKeyword(content, ["capital deployed", "invested capital"]);
  kpis.portfolio_valuation = extractAfterKeyword(content, ["portfolio valuation", "portfolio value", "total valuation"]);

  return kpis;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get secrets
    const browserlessToken = Deno.env.get("BROWSERLESS_API_KEY");
    const sessionCookies = Deno.env.get("PETE_SESSION_COOKIES");

    if (!browserlessToken) {
      throw new Error("BROWSERLESS_API_KEY is not configured");
    }
    if (!sessionCookies) {
      throw new Error("PETE_SESSION_COOKIES is not configured. Please log in to PETE and export your session cookies.");
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { company_id, cadence = "daily", period_start, period_end } = body;

    if (!company_id) {
      throw new Error("company_id is required");
    }

    console.log(`[PETE Scraper] Starting scrape for company ${company_id}, cadence: ${cadence}`);

    // Run the scraper with session cookies
    const result = await scrapePeteDashboard(browserlessToken, sessionCookies);

    if (!result.success) {
      console.error("[PETE Scraper] Scrape failed:", result.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
          requiresManualAuth: result.error?.includes("2FA"),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client to store KPIs
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get bot ID for property_halo
    const { data: bot } = await supabase
      .from("bots")
      .select("id")
      .eq("bot_type", "property_halo")
      .single();

    if (!bot) {
      throw new Error("Property Halo bot not found");
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = period_end ? new Date(period_end) : now;
    let periodStart: Date;

    if (period_start) {
      periodStart = new Date(period_start);
    } else {
      switch (cadence) {
        case "daily":
          periodStart = new Date(periodEnd);
          periodStart.setDate(periodStart.getDate() - 1);
          break;
        case "weekly":
          periodStart = new Date(periodEnd);
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case "monthly":
          periodStart = new Date(periodEnd);
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        case "quarterly":
          periodStart = new Date(periodEnd);
          periodStart.setMonth(periodStart.getMonth() - 3);
          break;
        default:
          periodStart = new Date(periodEnd);
          periodStart.setDate(periodStart.getDate() - 1);
      }
    }

    // Store KPIs in kpi_history
    const kpiRecords = Object.entries(result.kpis)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([kpiName, kpiValue]) => ({
        company_id,
        bot_id: bot.id,
        cadence,
        kpi_name: kpiName,
        kpi_value: kpiValue as number,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        kpi_status: "on_track" as const,
        metadata: { source: "pete_scraper", scraped_at: new Date().toISOString() },
      }));

    if (kpiRecords.length > 0) {
      const { error: insertError } = await supabase
        .from("kpi_history")
        .insert(kpiRecords);

      if (insertError) {
        console.error("[PETE Scraper] Error inserting KPIs:", insertError);
        throw new Error(`Failed to store KPIs: ${insertError.message}`);
      }

      console.log(`[PETE Scraper] Stored ${kpiRecords.length} KPIs`);
    } else {
      console.log("[PETE Scraper] No KPIs extracted from page");
    }

    return new Response(
      JSON.stringify({
        success: true,
        kpis: result.kpis,
        kpiCount: kpiRecords.length,
        message: `Successfully scraped and stored ${kpiRecords.length} KPIs`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[PETE Scraper] Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
