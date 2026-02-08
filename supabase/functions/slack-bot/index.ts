import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-slack-signature, x-slack-request-timestamp",
};

// ---------- helpers ----------

async function verifySlackSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const secret = Deno.env.get("SLACK_SIGNING_SECRET");
  if (!secret) {
    console.error("SLACK_SIGNING_SECRET not set");
    return false;
  }

  const timestamp = req.headers.get("x-slack-request-timestamp");
  const slackSig = req.headers.get("x-slack-signature");
  if (!timestamp || !slackSig) return false;

  // Prevent replay attacks (5 min window)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(sigBasestring)
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const computed = `v0=${hex}`;

  return computed === slackSig;
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ---------- DB context helpers ----------

async function getKpiSummary(companyName?: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  let companyFilter: string | null = null;
  if (companyName) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .ilike("name", `%${companyName}%`);
    if (companies && companies.length > 0) {
      companyFilter = companies[0].id;
    }
  }

  let query = supabase
    .from("kpi_history")
    .select("kpi_name, kpi_value, kpi_status, period_start, period_end, company_id")
    .order("period_end", { ascending: false })
    .limit(50);

  if (companyFilter) {
    query = query.eq("company_id", companyFilter);
  }

  const { data: kpis, error } = await query;
  if (error || !kpis?.length) return "No KPI data available.";

  // Get company names
  const companyIds = [...new Set(kpis.map((k: any) => k.company_id))];
  const { data: companiesData } = await supabase
    .from("companies")
    .select("id, name")
    .in("id", companyIds);

  const companyMap: Record<string, string> = {};
  companiesData?.forEach((c: any) => {
    companyMap[c.id] = c.name;
  });

  const summary = kpis.map((k: any) => {
    const company = companyMap[k.company_id] || "Unknown";
    return `- ${company} | ${k.kpi_name}: ${k.kpi_value ?? "N/A"} (${k.kpi_status || "no status"}) [${k.period_start} to ${k.period_end}]`;
  });

  return summary.join("\n");
}

async function getExceptionsSummary(companyName?: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  let companyFilter: string | null = null;
  if (companyName) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .ilike("name", `%${companyName}%`);
    if (companies && companies.length > 0) {
      companyFilter = companies[0].id;
    }
  }

  let query = supabase
    .from("exceptions")
    .select("title, severity, status, exception_type, created_at, company_id")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (companyFilter) {
    query = query.eq("company_id", companyFilter);
  }

  const { data: exceptions, error } = await query;
  if (error || !exceptions?.length) return "No open exceptions.";

  const companyIds = [...new Set(exceptions.map((e: any) => e.company_id))];
  const { data: companiesData } = await supabase
    .from("companies")
    .select("id, name")
    .in("id", companyIds);

  const companyMap: Record<string, string> = {};
  companiesData?.forEach((c: any) => {
    companyMap[c.id] = c.name;
  });

  const summary = exceptions.map((e: any) => {
    const company = companyMap[e.company_id] || "Unknown";
    return `- ${company} | [${e.severity}] ${e.title} (${e.status}) - ${e.exception_type}`;
  });

  return summary.join("\n");
}

async function getBotStatus(): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: runs, error } = await supabase
    .from("bot_runs")
    .select("bot_id, company_id, status, cadence, started_at, completed_at, error_message")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !runs?.length) return "No recent bot runs.";

  const botIds = [...new Set(runs.map((r: any) => r.bot_id))];
  const companyIds = [...new Set(runs.map((r: any) => r.company_id))];

  const [{ data: bots }, { data: companies }] = await Promise.all([
    supabase.from("bots").select("id, name").in("id", botIds),
    supabase.from("companies").select("id, name").in("id", companyIds),
  ]);

  const botMap: Record<string, string> = {};
  bots?.forEach((b: any) => { botMap[b.id] = b.name; });
  const companyMap: Record<string, string> = {};
  companies?.forEach((c: any) => { companyMap[c.id] = c.name; });

  const summary = runs.map((r: any) => {
    const bot = botMap[r.bot_id] || "Unknown Bot";
    const company = companyMap[r.company_id] || "Unknown";
    const time = r.completed_at || r.started_at || "not started";
    return `- ${company} | ${bot} [${r.cadence}]: ${r.status} (${time})${r.error_message ? ` ⚠️ ${r.error_message}` : ""}`;
  });

  return summary.join("\n");
}

async function triggerBotRun(companyName: string, botType: string, cadence: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  // Find company
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", `%${companyName}%`);

  if (!companies?.length) return `❌ Company "${companyName}" not found.`;

  const company = companies[0];

  // Find bot
  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, bot_type")
    .ilike("bot_type", `%${botType}%`);

  if (!bots?.length) return `❌ Bot type "${botType}" not found.`;

  const bot = bots[0];
  const validCadences = ["daily", "weekly", "monthly", "quarterly"];
  const normalizedCadence = cadence.toLowerCase();
  if (!validCadences.includes(normalizedCadence)) {
    return `❌ Invalid cadence "${cadence}". Use: ${validCadences.join(", ")}`;
  }

  // Determine which edge function to call
  let functionName = "";
  if (bot.bot_type === "financial_control") {
    functionName = "run-financial-control-bot";
  } else {
    functionName = "run-crm-bot";
  }

  // Invoke the bot
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: {
      company_id: company.id,
      bot_id: bot.id,
      cadence: normalizedCadence,
    },
  });

  if (error) {
    return `❌ Failed to trigger ${bot.name} for ${company.name}: ${error.message}`;
  }

  return `✅ Successfully triggered **${bot.name}** for **${company.name}** (${normalizedCadence} cadence). Run ID: ${data?.run_id || "pending"}`;
}

// ---------- AI response ----------

async function getAIResponse(userMessage: string, context: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompt = `You are Halo Bot, an AI assistant for Halo Cadence Flow — a financial control and CRM dashboard platform.
You help team members understand KPIs, exceptions, bot statuses, and can trigger bot runs.

When users ask about KPIs, exceptions, or bot status, use the context data provided.
When users want to run a bot, extract the company name, bot type, and cadence from their message.

Available bot types: financial_control, property_halo, unique_painting, ati_security
Available cadences: daily, weekly, monthly, quarterly
Companies in the system: Property Halo, Unique Painting, ATI Security

Be concise, use bullet points, and include relevant numbers. Use Slack-compatible formatting (*bold*, _italic_, \`code\`).

CONTEXT DATA:
${context}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    if (response.status === 429) return "⚠️ Rate limit exceeded. Please try again in a moment.";
    if (response.status === 402) return "⚠️ AI usage limit reached. Please contact your admin.";
    return "⚠️ I encountered an error generating a response. Please try again.";
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "I couldn't generate a response.";
}

// ---------- Slack messaging ----------

async function postSlackMessage(channel: string, text: string, threadTs?: string) {
  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) {
    console.error("SLACK_BOT_TOKEN not set");
    return;
  }

  const body: any = { channel, text };
  if (threadTs) body.thread_ts = threadTs;

  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await resp.json();
  if (!result.ok) {
    console.error("Slack API error:", result.error);
  }
}

// ---------- intent detection ----------

function detectIntent(text: string): { intent: string; company?: string; botType?: string; cadence?: string } {
  const lower = text.toLowerCase();

  // Bot trigger
  const runMatch = lower.match(/run\s+(financial|crm|property.?halo|unique.?painting|ati.?security)\s+(?:bot\s+)?(?:for\s+)?(property.?halo|unique.?painting|ati.?security)?\s*(?:(\w+)\s+cadence)?/i);
  if (runMatch || lower.includes("run bot") || lower.includes("trigger bot")) {
    let botType = "financial_control";
    let company = "";
    let cadence = "daily";

    if (lower.includes("financial")) botType = "financial_control";
    if (lower.includes("crm") || lower.includes("property halo")) botType = "property_halo";
    if (lower.includes("unique")) botType = "unique_painting";
    if (lower.includes("ati")) botType = "ati_security";

    if (lower.includes("property halo")) company = "Property Halo";
    if (lower.includes("unique painting") || lower.includes("unique")) company = "Unique Painting";
    if (lower.includes("ati")) company = "ATI Security";

    if (lower.includes("weekly")) cadence = "weekly";
    if (lower.includes("monthly")) cadence = "monthly";
    if (lower.includes("quarterly")) cadence = "quarterly";

    return { intent: "trigger_bot", company, botType, cadence };
  }

  // Exceptions
  if (lower.includes("exception") || lower.includes("alert") || lower.includes("issue") || lower.includes("problem")) {
    let company: string | undefined;
    if (lower.includes("property halo")) company = "Property Halo";
    if (lower.includes("unique")) company = "Unique Painting";
    if (lower.includes("ati")) company = "ATI Security";
    return { intent: "exceptions", company };
  }

  // Bot status
  if (lower.includes("bot status") || lower.includes("bot run") || lower.includes("last run")) {
    return { intent: "bot_status" };
  }

  // KPIs (default for data questions)
  if (lower.includes("kpi") || lower.includes("revenue") || lower.includes("profit") || lower.includes("cash") ||
      lower.includes("request") || lower.includes("quote") || lower.includes("job") || lower.includes("invoice") ||
      lower.includes("metric") || lower.includes("performance") || lower.includes("how") || lower.includes("what")) {
    let company: string | undefined;
    if (lower.includes("property halo")) company = "Property Halo";
    if (lower.includes("unique")) company = "Unique Painting";
    if (lower.includes("ati")) company = "ATI Security";
    return { intent: "kpi", company };
  }

  return { intent: "general" };
}

// ---------- main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const body = await req.text();

  try {
    const payload = JSON.parse(body);

    // Slack URL verification challenge
    if (payload.type === "url_verification") {
      console.log("Slack URL verification received");
      return new Response(JSON.stringify({ challenge: payload.challenge }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify Slack signature for all other requests
    const isValid = await verifySlackSignature(req, body);
    if (!isValid) {
      console.error("Invalid Slack signature");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // Handle events
    if (payload.type === "event_callback") {
      const event = payload.event;

      // Ignore bot messages to prevent loops
      if (event.bot_id || event.subtype === "bot_message") {
        return new Response("ok", { status: 200, headers: corsHeaders });
      }

      // Handle app_mention and direct messages
      if (event.type === "app_mention" || event.type === "message") {
        const userText = (event.text || "").replace(/<@[A-Z0-9]+>/g, "").trim();
        const channel = event.channel;
        const threadTs = event.thread_ts || event.ts;

        console.log(`Received message: "${userText}" in channel ${channel}`);

        // Detect intent and gather context
        const { intent, company, botType, cadence } = detectIntent(userText);
        console.log(`Detected intent: ${intent}, company: ${company || "all"}`);

        // Handle bot trigger
        if (intent === "trigger_bot" && company && botType) {
          const result = await triggerBotRun(company, botType, cadence || "daily");
          await postSlackMessage(channel, result, threadTs);
          return new Response("ok", { status: 200, headers: corsHeaders });
        }

        // Gather context based on intent
        let context = "";
        if (intent === "kpi" || intent === "general") {
          context += "## Recent KPIs:\n" + await getKpiSummary(company) + "\n\n";
        }
        if (intent === "exceptions" || intent === "general") {
          context += "## Open Exceptions:\n" + await getExceptionsSummary(company) + "\n\n";
        }
        if (intent === "bot_status" || intent === "general") {
          context += "## Recent Bot Runs:\n" + await getBotStatus() + "\n\n";
        }

        // If no specific context gathered, get everything
        if (!context) {
          const [kpis, exceptions, botStatus] = await Promise.all([
            getKpiSummary(company),
            getExceptionsSummary(company),
            getBotStatus(),
          ]);
          context = `## Recent KPIs:\n${kpis}\n\n## Open Exceptions:\n${exceptions}\n\n## Recent Bot Runs:\n${botStatus}`;
        }

        // Get AI response
        const aiResponse = await getAIResponse(userText, context);
        await postSlackMessage(channel, aiResponse, threadTs);

        return new Response("ok", { status: 200, headers: corsHeaders });
      }
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Slack bot error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
