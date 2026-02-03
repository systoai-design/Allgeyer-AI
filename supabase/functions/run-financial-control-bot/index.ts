import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const QBO_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

interface QBOTokens {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  realm_id: string;
}

interface BotRunSummary {
  transactions_fetched: number;
  uncategorized_count: number;
  needs_clarification_count: number;
  duplicate_count: number;
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  bank_accounts: string[];
  period_start: string;
  period_end: string;
  kpis_generated: string[];
  exceptions_created: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('QBO_CLIENT_ID');
    const clientSecret = Deno.env.get('QBO_CLIENT_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { bot_run_id, company_id, cadence = 'daily' } = await req.json();

    if (!bot_run_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'bot_run_id and company_id are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Starting Financial Control bot run: ${bot_run_id} for company: ${company_id}`);

    // Update bot run status to running
    await supabase
      .from('bot_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', bot_run_id);

    // Get integration credentials
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('integration_type', 'quickbooks')
      .single();

    if (intError || !integration) {
      console.error('Integration not found:', intError);
      await updateBotRunFailed(supabase, bot_run_id, 'QuickBooks not connected for this company');
      return new Response(
        JSON.stringify({ error: 'QuickBooks not connected for this company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const config = integration.config as QBOTokens;
    if (!config.access_token || !config.realm_id) {
      await updateBotRunFailed(supabase, bot_run_id, 'Invalid QuickBooks configuration');
      return new Response(
        JSON.stringify({ error: 'Invalid QuickBooks configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if token needs refresh
    let accessToken = config.access_token;
    const tokenExpiresAt = new Date(config.token_expires_at);
    const now = new Date();
    
    if (now >= tokenExpiresAt) {
      console.log('Token expired, refreshing...');
      
      const tokenResponse = await fetch(QBO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: config.refresh_token,
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token refresh failed:', tokens);
        
        await supabase
          .from('integrations')
          .update({ is_connected: false })
          .eq('id', integration.id);

        await updateBotRunFailed(supabase, bot_run_id, 'Token refresh failed. Please reconnect QuickBooks.');
        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please reconnect QuickBooks.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      accessToken = tokens.access_token;
      await supabase
        .from('integrations')
        .update({
          config: {
            ...config,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          },
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', integration.id);

      console.log('Token refreshed successfully');
    }

    const realmId = config.realm_id;
    
    // Calculate date range based on cadence
    const { periodStart, periodEnd } = calculatePeriod(cadence);
    
    console.log(`Fetching QBO data for period: ${periodStart} to ${periodEnd}`);

    // Fetch transactions from QBO
    const transactions = await fetchQBOTransactions(accessToken, realmId, periodStart, periodEnd);
    console.log(`Fetched ${transactions.length} transactions from QBO`);

    // Fetch account balances
    const balances = await fetchQBOBalances(accessToken, realmId);
    console.log('Fetched account balances from QBO');

    // Process transactions and store them
    const summary = await processTransactions(supabase, company_id, transactions, balances, periodStart, periodEnd);

    // Get the Financial Control bot ID
    const { data: fcBot } = await supabase
      .from('bots')
      .select('id')
      .eq('bot_type', 'financial_control')
      .single();

    const botId = fcBot?.id;

    if (botId) {
      // Generate KPIs from the data
      await generateKPIs(supabase, company_id, botId, cadence, summary, periodStart, periodEnd);

      // Create exceptions based on thresholds
      const exceptionsCreated = await createExceptions(supabase, company_id, botId, summary);
      summary.exceptions_created = exceptionsCreated;
    }

    // Update bot run as completed
    await supabase
      .from('bot_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary: summary as unknown as Record<string, unknown>,
      })
      .eq('id', bot_run_id);

    // Update integration last sync
    await supabase
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id);

    console.log('Financial Control bot run completed successfully');

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Financial Control bot error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function calculatePeriod(cadence: string): { periodStart: string; periodEnd: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let periodStart: Date;
  let periodEnd: Date = today;

  switch (cadence) {
    case 'daily':
      periodStart = new Date(today);
      periodStart.setDate(periodStart.getDate() - 1);
      break;
    case 'weekly':
      periodStart = new Date(today);
      periodStart.setDate(periodStart.getDate() - 7);
      break;
    case 'monthly':
      periodStart = new Date(today);
      periodStart.setMonth(periodStart.getMonth() - 1);
      break;
    case 'quarterly':
      periodStart = new Date(today);
      periodStart.setMonth(periodStart.getMonth() - 3);
      break;
    default:
      periodStart = new Date(today);
      periodStart.setDate(periodStart.getDate() - 1);
  }

  return {
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
  };
}

async function fetchQBOTransactions(accessToken: string, realmId: string, startDate: string, endDate: string): Promise<any[]> {
  const query = encodeURIComponent(
    `SELECT * FROM Purchase WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' MAXRESULTS 1000`
  );
  
  const purchaseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${query}&minorversion=65`;
  
  const purchaseResp = await fetch(purchaseUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  const purchaseData = await purchaseResp.json();
  const purchases = purchaseData?.QueryResponse?.Purchase || [];

  // Also fetch deposits/income
  const depositQuery = encodeURIComponent(
    `SELECT * FROM Deposit WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' MAXRESULTS 1000`
  );
  
  const depositUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${depositQuery}&minorversion=65`;
  
  const depositResp = await fetch(depositUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  const depositData = await depositResp.json();
  const deposits = depositData?.QueryResponse?.Deposit || [];

  // Combine and normalize transactions
  const allTransactions = [
    ...purchases.map((p: any) => ({
      type: 'expense',
      id: p.Id,
      date: p.TxnDate,
      amount: -Math.abs(p.TotalAmt || 0),
      vendor: p.EntityRef?.name || 'Unknown',
      memo: p.PrivateNote || '',
      account: p.AccountRef?.name || 'Uncategorized',
      category: p.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name || 'Uncategorized',
    })),
    ...deposits.map((d: any) => ({
      type: 'income',
      id: d.Id,
      date: d.TxnDate,
      amount: Math.abs(d.TotalAmt || 0),
      vendor: d.DepositToAccountRef?.name || 'Bank Deposit',
      memo: d.PrivateNote || '',
      account: d.DepositToAccountRef?.name || 'Bank',
      category: 'Income',
    })),
  ];

  return allTransactions;
}

async function fetchQBOBalances(accessToken: string, realmId: string): Promise<any> {
  // Fetch Balance Sheet summary for bank accounts
  const balanceUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}/reports/BalanceSheet?minorversion=65`;
  
  const balanceResp = await fetch(balanceUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  const balanceData = await balanceResp.json();
  return balanceData;
}

async function processTransactions(
  supabase: any,
  companyId: string,
  transactions: any[],
  balances: any,
  periodStart: string,
  periodEnd: string
): Promise<BotRunSummary> {
  let uncategorizedCount = 0;
  let needsClarificationCount = 0;
  let duplicateCount = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  const bankAccountsSet = new Set<string>();

  // Check for existing transactions to detect duplicates
  const { data: existingTxns } = await supabase
    .from('transactions')
    .select('external_id')
    .eq('company_id', companyId);

  const existingIds = new Set(existingTxns?.map((t: any) => t.external_id) || []);

  for (const txn of transactions) {
    const isDuplicate = existingIds.has(txn.id);
    const isCategorized = txn.category && txn.category !== 'Uncategorized';
    const needsClarification = !isCategorized && Math.abs(txn.amount) > 500;

    if (isDuplicate) duplicateCount++;
    if (!isCategorized) uncategorizedCount++;
    if (needsClarification) needsClarificationCount++;

    if (txn.amount > 0) {
      totalIncome += txn.amount;
    } else {
      totalExpenses += Math.abs(txn.amount);
    }

    if (txn.account) {
      bankAccountsSet.add(txn.account);
    }

    // Insert or update transaction
    if (!isDuplicate) {
      await supabase.from('transactions').upsert({
        company_id: companyId,
        external_id: txn.id,
        transaction_date: txn.date,
        amount: txn.amount,
        vendor: txn.vendor,
        category: txn.category,
        memo: txn.memo,
        account_name: txn.account,
        is_categorized: isCategorized,
        is_duplicate: false,
        needs_clarification: needsClarification,
        classification_status: isCategorized ? 'categorized' : 'uncategorized',
      }, { onConflict: 'external_id' });
    }
  }

  return {
    transactions_fetched: transactions.length,
    uncategorized_count: uncategorizedCount,
    needs_clarification_count: needsClarificationCount,
    duplicate_count: duplicateCount,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_cash_flow: totalIncome - totalExpenses,
    bank_accounts: Array.from(bankAccountsSet),
    period_start: periodStart,
    period_end: periodEnd,
    kpis_generated: [],
    exceptions_created: 0,
  };
}

async function generateKPIs(
  supabase: any,
  companyId: string,
  botId: string,
  cadence: string,
  summary: BotRunSummary,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  // Calculate profit metrics
  // Note: In a full implementation, COGS would come from specific QBO accounts
  // For now, we estimate gross profit as income minus 60% (typical COGS for service businesses)
  const estimatedCogs = summary.total_income * 0.4; // 40% COGS estimate
  const grossProfit = summary.total_income - estimatedCogs;
  const netProfit = summary.total_income - summary.total_expenses;
  
  const kpis = [
    // Universal KPIs (ALL companies)
    {
      kpi_name: 'Sales Revenue',
      kpi_value: summary.total_income,
      kpi_status: 'on_track',
    },
    {
      kpi_name: 'Gross Profit',
      kpi_value: grossProfit,
      kpi_status: grossProfit >= 0 ? 'on_track' : 'critical',
    },
    {
      kpi_name: 'Net Profit',
      kpi_value: netProfit,
      kpi_status: netProfit >= 0 ? 'on_track' : netProfit > -10000 ? 'warning' : 'critical',
    },
    // Existing operational KPIs
    {
      kpi_name: 'Net Cash Flow',
      kpi_value: summary.net_cash_flow,
      kpi_status: summary.net_cash_flow >= 0 ? 'on_track' : 'warning',
    },
    {
      kpi_name: 'Categorization Rate',
      kpi_value: summary.transactions_fetched > 0 
        ? Math.round(((summary.transactions_fetched - summary.uncategorized_count) / summary.transactions_fetched) * 100)
        : 100,
      kpi_status: summary.uncategorized_count === 0 ? 'on_track' : summary.uncategorized_count > 10 ? 'critical' : 'warning',
    },
    {
      kpi_name: 'Total Income',
      kpi_value: summary.total_income,
      kpi_status: 'on_track',
    },
    {
      kpi_name: 'Total Expenses',
      kpi_value: summary.total_expenses,
      kpi_status: 'on_track',
    },
    {
      kpi_name: 'Transactions Processed',
      kpi_value: summary.transactions_fetched,
      kpi_status: 'on_track',
    },
  ];

  for (const kpi of kpis) {
    await supabase.from('kpi_history').insert({
      company_id: companyId,
      bot_id: botId,
      cadence,
      period_start: periodStart,
      period_end: periodEnd,
      kpi_name: kpi.kpi_name,
      kpi_value: kpi.kpi_value,
      kpi_status: kpi.kpi_status,
      metadata: { source: 'quickbooks', generated_at: new Date().toISOString() },
    });
    summary.kpis_generated.push(kpi.kpi_name);
  }
}

async function createExceptions(
  supabase: any,
  companyId: string,
  botId: string,
  summary: BotRunSummary
): Promise<number> {
  let exceptionsCreated = 0;

  // Create exception for uncategorized transactions
  if (summary.uncategorized_count > 0) {
    await supabase.from('exceptions').insert({
      company_id: companyId,
      bot_id: botId,
      exception_type: 'uncategorized_transactions',
      title: `${summary.uncategorized_count} Uncategorized Transactions`,
      description: `Found ${summary.uncategorized_count} transactions that need categorization.`,
      severity: summary.uncategorized_count > 10 ? 'high' : summary.uncategorized_count > 5 ? 'medium' : 'low',
      status: 'open',
      data: {
        count: summary.uncategorized_count,
        period_start: summary.period_start,
        period_end: summary.period_end,
      },
    });
    exceptionsCreated++;
  }

  // Create exception for large uncategorized transactions
  if (summary.needs_clarification_count > 0) {
    await supabase.from('exceptions').insert({
      company_id: companyId,
      bot_id: botId,
      exception_type: 'needs_clarification',
      title: `${summary.needs_clarification_count} Large Transactions Need Review`,
      description: `Found ${summary.needs_clarification_count} large transactions (>$500) that are uncategorized and need manual review.`,
      severity: 'high',
      status: 'open',
      data: {
        count: summary.needs_clarification_count,
        threshold: 500,
        period_start: summary.period_start,
        period_end: summary.period_end,
      },
    });
    exceptionsCreated++;
  }

  // Create exception for negative cash flow
  if (summary.net_cash_flow < 0) {
    await supabase.from('exceptions').insert({
      company_id: companyId,
      bot_id: botId,
      exception_type: 'negative_cash_flow',
      title: 'Negative Cash Flow Alert',
      description: `Net cash flow for the period is negative: $${Math.abs(summary.net_cash_flow).toLocaleString()}`,
      severity: 'critical',
      status: 'open',
      data: {
        net_cash_flow: summary.net_cash_flow,
        total_income: summary.total_income,
        total_expenses: summary.total_expenses,
        period_start: summary.period_start,
        period_end: summary.period_end,
      },
    });
    exceptionsCreated++;
  }

  return exceptionsCreated;
}

async function updateBotRunFailed(supabase: any, botRunId: string, errorMessage: string): Promise<void> {
  await supabase
    .from('bot_runs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', botRunId);
}
