import "https://deno.land/std@0.224.0/dotenv/load.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KpiData {
  label: string;
  value: string | number;
  status: "on_track" | "warning" | "critical";
  trend?: number;
}

interface ExceptionData {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  created_at: string;
}

interface ReportEmailRequest {
  to: string[];
  cc?: string[];
  company_name: string;
  report_type: string;
  cadence: string;
  kpis: KpiData[];
  exceptions: ExceptionData[];
  summary: string;
  generated_at: string;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "on_track": return "#22c55e";
    case "warning": return "#f59e0b";
    case "critical": return "#ef4444";
    default: return "#6b7280";
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "low": return "#6b7280";
    case "medium": return "#f59e0b";
    case "high": return "#f97316";
    case "critical": return "#ef4444";
    default: return "#6b7280";
  }
}

function getTrendIcon(trend?: number): string {
  if (!trend) return "";
  if (trend > 0) return `<span style="color: #22c55e;">↑ ${trend}%</span>`;
  if (trend < 0) return `<span style="color: #ef4444;">↓ ${Math.abs(trend)}%</span>`;
  return `<span style="color: #6b7280;">→ 0%</span>`;
}

function generateEmailHtml(data: ReportEmailRequest): string {
  const kpiRows = data.kpis.map(kpi => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${kpi.label}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 18px; font-weight: 600;">${kpi.value}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; background-color: ${getStatusColor(kpi.status)}20; color: ${getStatusColor(kpi.status)};">
          ${kpi.status.replace('_', ' ').toUpperCase()}
        </span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px;">
        ${getTrendIcon(kpi.trend)}
      </td>
    </tr>
  `).join("");

  const exceptionRows = data.exceptions.length > 0 
    ? data.exceptions.map(ex => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${getSeverityColor(ex.severity)}; margin-right: 8px;"></span>
          ${ex.title}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; background-color: ${getSeverityColor(ex.severity)}20; color: ${getSeverityColor(ex.severity)};">
            ${ex.severity.toUpperCase()}
          </span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280; font-size: 14px;">
          ${new Date(ex.created_at).toLocaleDateString()}
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="3" style="padding: 24px; text-align: center; color: #6b7280;">No open exceptions 🎉</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.company_name} - ${data.report_type}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">SYSTO</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Bot Automation Platform</p>
            </td>
            <td style="text-align: right;">
              <span style="display: inline-block; padding: 8px 16px; background-color: rgba(255,255,255,0.2); border-radius: 6px; color: #ffffff; font-size: 14px; font-weight: 500;">
                ${data.cadence.charAt(0).toUpperCase() + data.cadence.slice(1)} Report
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Company Name & Summary -->
    <tr>
      <td style="padding: 32px 40px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0 0 8px; color: #1f2937; font-size: 24px; font-weight: 600;">${data.company_name}</h2>
        <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">Generated: ${new Date(data.generated_at).toLocaleString()}</p>
        <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">${data.summary}</p>
      </td>
    </tr>

    <!-- KPIs Section -->
    <tr>
      <td style="padding: 32px 40px;">
        <h3 style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
          📊 Key Performance Indicators
        </h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Metric</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Value</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Status</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Trend</th>
            </tr>
          </thead>
          <tbody>
            ${kpiRows}
          </tbody>
        </table>
      </td>
    </tr>

    <!-- Exceptions Section -->
    <tr>
      <td style="padding: 0 40px 32px;">
        <h3 style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: 600;">
          ⚠️ Open Exceptions
        </h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Issue</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Severity</th>
              <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Created</th>
            </tr>
          </thead>
          <tbody>
            ${exceptionRows}
          </tbody>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color: #6b7280; font-size: 14px;">
              <p style="margin: 0 0 8px;">This is an automated report from your Systo bots.</p>
              <p style="margin: 0;">Questions? Reply to this email or contact your admin.</p>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">Powered by Systo</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
</body>
</html>
  `;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ReportEmailRequest = await req.json();

    // Validate required fields
    if (!data.to || !data.company_name || !data.report_type) {
      throw new Error("Missing required fields: to, company_name, report_type");
    }

    const html = generateEmailHtml(data);

    console.log(`Sending ${data.cadence} report email to:`, data.to);

    // Use Resend API directly via fetch
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Systo Reports <onboarding@resend.dev>",
        to: data.to,
        cc: data.cc,
        subject: `${data.company_name} - ${data.report_type} (${data.cadence.charAt(0).toUpperCase() + data.cadence.slice(1)})`,
        html: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, email_id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending email:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
