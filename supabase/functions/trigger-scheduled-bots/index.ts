// Trigger Scheduled Bots v2
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BotSchedule {
  id: string;
  bot_id: string;
  company_id: string;
  cadence: string;
  schedule_time: string;
  timezone: string;
  is_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface Bot {
  id: string;
  bot_type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for scheduled bot runs...');

    // Get current time
    const now = new Date();
    
    // Fetch all enabled schedules
    const { data: schedules, error: scheduleError } = await supabase
      .from('bot_schedules')
      .select('*, bots:bot_id(id, bot_type)')
      .eq('is_enabled', true);

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      throw scheduleError;
    }

    if (!schedules || schedules.length === 0) {
      console.log('No enabled schedules found');
      return new Response(
        JSON.stringify({ success: true, message: 'No schedules to run', triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${schedules.length} enabled schedules`);

    let triggeredCount = 0;
    const triggeredRuns: string[] = [];

    for (const schedule of schedules) {
      const bot = schedule.bots as Bot;
      if (!bot) continue;

      // Check if it's time to run this schedule
      const shouldRun = checkShouldRun(schedule, now);
      
      if (!shouldRun) {
        console.log(`Schedule ${schedule.id} for ${bot.bot_type} - not due yet`);
        continue;
      }

      console.log(`Triggering ${bot.bot_type} bot for company ${schedule.company_id}`);

      // Create a bot run record
      const { data: botRun, error: runError } = await supabase
        .from('bot_runs')
        .insert({
          bot_id: bot.id,
          company_id: schedule.company_id,
          cadence: schedule.cadence,
          status: 'pending',
        })
        .select('id')
        .single();

      if (runError) {
        console.error(`Failed to create bot run for schedule ${schedule.id}:`, runError);
        continue;
      }

      // Determine which edge function to call
      const functionName = bot.bot_type === 'financial_control' 
        ? 'run-financial-control-bot' 
        : 'run-crm-bot';

      // Call the appropriate edge function
      try {
        const payload: Record<string, string> = {
          bot_run_id: botRun.id,
          company_id: schedule.company_id,
          cadence: schedule.cadence,
        };

        // For CRM bots, include the bot_type
        if (bot.bot_type !== 'financial_control') {
          payload.bot_type = bot.bot_type;
        }

        const { error: invokeError } = await supabase.functions.invoke(functionName, {
          body: payload,
        });

        if (invokeError) {
          console.error(`Failed to invoke ${functionName}:`, invokeError);
          // Update bot run as failed
          await supabase.from('bot_runs').update({
            status: 'failed',
            error_message: invokeError.message,
            completed_at: new Date().toISOString(),
          }).eq('id', botRun.id);
          continue;
        }

        // Update schedule with last run time
        await supabase.from('bot_schedules').update({
          last_run_at: now.toISOString(),
          next_run_at: calculateNextRun(schedule, now).toISOString(),
        }).eq('id', schedule.id);

        triggeredCount++;
        triggeredRuns.push(`${bot.bot_type}:${schedule.company_id}`);
        console.log(`Successfully triggered ${bot.bot_type} for ${schedule.company_id}`);

      } catch (err) {
        console.error(`Error invoking ${functionName}:`, err);
      }
    }

    console.log(`Triggered ${triggeredCount} bot runs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        triggered: triggeredCount,
        runs: triggeredRuns,
        checked_at: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Trigger scheduled bots error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function checkShouldRun(schedule: BotSchedule, now: Date): boolean {
  // Parse schedule time (HH:MM format)
  const [scheduleHour, scheduleMinute] = schedule.schedule_time.split(':').map(Number);
  
  // Get current hour and minute
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  
  // Simple check: if we're within 30 minutes of the scheduled time
  // and haven't run in the last hour, we should run
  const scheduleMinutes = scheduleHour * 60 + scheduleMinute;
  const currentMinutes = currentHour * 60 + currentMinute;
  const timeDiff = Math.abs(currentMinutes - scheduleMinutes);
  
  // Within 30 minute window of scheduled time
  if (timeDiff > 30 && timeDiff < (24 * 60 - 30)) {
    return false;
  }
  
  // Check last run time
  if (schedule.last_run_at) {
    const lastRun = new Date(schedule.last_run_at);
    const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
    
    // Based on cadence, check if enough time has passed
    switch (schedule.cadence) {
      case 'daily':
        return hoursSinceLastRun >= 20; // At least 20 hours since last run
      case 'weekly':
        return hoursSinceLastRun >= 6 * 24; // At least 6 days
      case 'monthly':
        return hoursSinceLastRun >= 27 * 24; // At least 27 days
      case 'quarterly':
        return hoursSinceLastRun >= 85 * 24; // At least ~3 months
      default:
        return hoursSinceLastRun >= 20;
    }
  }
  
  // Never run before, should run now
  return true;
}

function calculateNextRun(schedule: BotSchedule, now: Date): Date {
  const next = new Date(now);
  
  switch (schedule.cadence) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }
  
  // Set to schedule time
  const [hour, minute] = schedule.schedule_time.split(':').map(Number);
  next.setUTCHours(hour, minute, 0, 0);
  
  return next;
}
