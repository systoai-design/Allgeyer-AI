

## Problem Analysis

### Issue 1: KPI Data Only Shows for "Last 30 Days" but Not "Last Quarter"
The root cause is that KPI data is stored with **specific period_start/period_end dates** based on when the bot was run. Looking at the database:
- All KPI records have `period_start: 2026-02-03` and `period_end: 2026-02-04` (yesterday to today)
- When you select "Last Quarter" (Oct-Dec 2025), the dashboard queries for KPIs where `period_end` falls within that range
- Since all data was generated today with today's period_end, no data appears for historical ranges

### Issue 2: No Automated Bot Runs
Currently:
- Bot schedules exist in the database (e.g., daily at 8:00 AM)
- But there's no cron job or scheduler actually triggering the bots automatically
- Bots only run when manually triggered from the Bot Runs page

### Issue 3: Missing "Run Bot" Button on Dashboard
Users have to navigate to the Bot Runs page to trigger bots manually.

---

## Proposed Solution

### Part 1: Add "Run Bot" Button to Dashboard
Add a quick-action button on the dashboard to trigger bot runs without leaving the page. This provides immediate feedback and convenience.

**Changes:**
- Add a "Sync Data" button next to the date picker that triggers both Financial Control and CRM bots
- Show a loading state while bots are running
- Refresh dashboard data after bots complete

### Part 2: Fix KPI Storage to Support Date Ranges
Modify the Financial Control and CRM bots to store KPIs with period dates that match the actual data being fetched, not just the cadence period. This allows historical queries to work correctly.

**Key insight:** Currently the bot calculates `period_start` and `period_end` based on cadence (daily = yesterday to today). Instead, we should:
1. When triggered manually from dashboard, use the selected date range
2. Support a "full sync" option that backfills historical data

### Part 3: Set Up Automated Cron Jobs
Create a cron job that automatically triggers bot runs on schedule using the pg_cron extension.

---

## Implementation Plan

### Step 1: Add "Sync Data" Button to Dashboard

Add to `src/pages/Dashboard.tsx`:
- Import necessary functions and state
- Add `isSyncing` state and `handleSyncData` function
- Add a "Sync Data" button next to the Export button
- Button triggers both Financial Control and CRM bots for the selected company
- Shows toast notifications for progress
- Auto-refreshes dashboard data after completion

### Step 2: Update Edge Functions to Accept Date Range Parameters

Modify `supabase/functions/run-financial-control-bot/index.ts`:
- Accept optional `period_start` and `period_end` parameters
- If provided, use those dates instead of calculating from cadence
- This allows the dashboard to request data for specific date ranges

Modify `supabase/functions/run-crm-bot/index.ts`:
- Same changes to accept date range parameters

### Step 3: Add Historical Data Backfill Capability

Create a "Full Sync" option that:
- Fetches data for the last 3-6 months from QuickBooks/Jobber
- Stores KPIs with appropriate period dates
- Enables historical date range queries to show real data

### Step 4: Set Up Automated Cron Scheduling

Create a database cron job using pg_cron:
- Schedule daily bot runs at 8:00 AM for each company with active schedules
- This runs automatically without manual intervention

---

## Technical Details

### Dashboard Sync Button Implementation

```text
Location: src/pages/Dashboard.tsx

New State:
- isSyncing: boolean
- syncProgress: string

New Function: handleSyncData()
1. Set isSyncing = true
2. Get Financial Control bot ID and CRM bot ID for company
3. Create bot_runs records for both
4. Call edge functions for both in parallel
5. Wait for completion
6. Refresh dashboard data
7. Set isSyncing = false
8. Show success toast
```

### Edge Function Date Range Support

```text
Request Body Changes:
{
  bot_run_id: string,
  company_id: string,
  cadence: string,
  period_start?: string,  // NEW: Optional override
  period_end?: string     // NEW: Optional override
}

If period_start/period_end provided:
- Use those dates for fetching QBO/Jobber data
- Store KPIs with those period dates

If not provided:
- Fall back to current cadence-based calculation
```

### Cron Job Setup

```text
SQL to execute:

1. Enable pg_cron and pg_net extensions
2. Schedule a job that:
   - Runs every hour
   - Checks bot_schedules for any due runs
   - Triggers the appropriate edge functions
```

---

## Expected Outcome

After implementation:
1. Users can click "Sync Data" on the dashboard to immediately fetch latest data
2. Historical date ranges will show data once a backfill sync is run
3. Bots will run automatically on their configured schedules
4. Data will accumulate over time, making all date range views useful

