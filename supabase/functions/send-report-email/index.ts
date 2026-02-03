import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { ReportData, CompanyBranding } from './_templates/base.ts';
import { generateDailyReport } from './_templates/daily.ts';
import { generateWeeklyReport } from './_templates/weekly.ts';
import { generateMonthlyReport } from './_templates/monthly.ts';
import { generateQuarterlyReport } from './_templates/quarterly.ts';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportEmailRequest {
  to: string[];
  cc?: string[];
  company: {
    name: string;
    primary_color?: string;
    logo_url?: string;
    company_type: 'property_halo' | 'unique_painting' | 'ati_security';
  };
  cadence: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  kpis: Array<{
    label: string;
    value: string | number;
    status: "on_track" | "warning" | "critical";
    trend?: number;
    target?: string | number;
  }>;
  exceptions: Array<{
    title: string;
    severity: "low" | "medium" | "high" | "critical";
    status: string;
    created_at: string;
    description?: string;
  }>;
  summary: string;
  generated_at: string;
  period_start?: string;
  period_end?: string;
  highlights?: string[];
  insights?: string[];
}

function generateEmailHtml(request: ReportEmailRequest): string {
  const reportData: ReportData = {
    company: {
      name: request.company.name,
      primaryColor: request.company.primary_color || '#3B82F6',
      logoUrl: request.company.logo_url,
      companyType: request.company.company_type
    },
    cadence: request.cadence,
    kpis: request.kpis,
    exceptions: request.exceptions,
    summary: request.summary,
    generated_at: request.generated_at,
    period_start: request.period_start,
    period_end: request.period_end,
    highlights: request.highlights,
    insights: request.insights
  };

  switch (request.cadence) {
    case 'daily':
      return generateDailyReport(reportData);
    case 'weekly':
      return generateWeeklyReport(reportData);
    case 'monthly':
      return generateMonthlyReport(reportData);
    case 'quarterly':
      return generateQuarterlyReport(reportData);
    default:
      return generateDailyReport(reportData);
  }
}

function getCadenceTitle(cadence: string): string {
  const titles: Record<string, string> = {
    daily: 'Daily Report',
    weekly: 'Weekly Summary',
    monthly: 'Monthly Review',
    quarterly: 'Quarterly Analysis'
  };
  return titles[cadence] || 'Report';
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ReportEmailRequest = await req.json();

    // Validate required fields
    if (!data.to || !data.company?.name || !data.cadence) {
      throw new Error("Missing required fields: to, company.name, cadence");
    }

    const html = generateEmailHtml(data);
    const subject = `${data.company.name} - ${getCadenceTitle(data.cadence)}`;

    console.log(`Sending ${data.cadence} report email to:`, data.to);
    console.log(`Company: ${data.company.name}, Type: ${data.company.company_type}`);

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
        subject: subject,
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
      JSON.stringify({ 
        success: true, 
        email_id: result.id,
        subject: subject,
        recipients: data.to.length
      }),
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
