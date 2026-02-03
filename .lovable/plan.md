

# Fix Dashboard to Display Live KPI Data

## Problem Identified

1. **Key mismatch between database and frontend code**:
   - Database stores: `"Net Cash Flow"`, `"Categorization Rate"`, `"Total Income"`, `"Total Expenses"`, `"Transactions Processed"`
   - Frontend looks for: `"net_cash_flow"`, `"categorization_rate"`, `"total_income"`, `"total_expenses"`, `"transactions_processed"`
   - The `.find()` comparison fails because the strings don't match

2. **Company-specific KPIs (Property Halo, Unique Painting, ATI Security) still use mock data**:
   - The `getMockKpiValues()` function is called for company-specific KPIs
   - These CRM bots (PETE, Labortech, Jobber) are not connected yet, so no live data exists

3. **Financial Control KPIs show $0 because QuickBooks has no transactions in the selected period**:
   - The bot successfully fetched data from QBO
   - The connected QBO sandbox account has no transactions for 2026-02-02 to 2026-02-03
   - This is expected behavior - the data IS live, just empty

## Solution

### Step 1: Fix the KPI Key Matching Logic
Update the Dashboard to match KPI names correctly by comparing with the `kpi.label` (which matches the database format) instead of `kpi.key`.

File: `src/pages/Dashboard.tsx`
```typescript
// Change from:
const liveKpi = kpiHistory.find(
  k => k.kpi_name === kpi.key && k.cadence === tab.value
);

// Change to:
const liveKpi = kpiHistory.find(
  k => k.kpi_name === kpi.label && k.cadence === tab.value
);
```

### Step 2: Remove Mock Data for Company-Specific KPIs
Update the company-specific KPI section to show a "No data" state instead of mock values, since the CRM integrations (PETE CRM, Labortech, Jobber) are not connected.

File: `src/pages/Dashboard.tsx`
- Replace `getMockKpiValues()` usage with actual live data lookup from `kpi_history`
- Show appropriate empty state when no live data exists
- Display a message directing users to run the appropriate bot or connect the integration

### Step 3: Add Visual Indicators for Data Source
- Show a badge or indicator when data is from "quickbooks" (live) vs "placeholder"
- Display the period date range for the KPIs
- Show last sync time

## Implementation Details

### Dashboard Changes
```text
+-------------------------------------------+
| Financial Control KPIs                    |
| Live data from QuickBooks Online          |
+-------------------------------------------+
| Net Cash Flow  | $0        | ● On Track  |
| Categorization | 100%      | ● On Track  |
| Total Income   | $0        | ● On Track  |
| Total Expenses | $0        | ● On Track  |
| Transactions   | 0         | ● On Track  |
+-------------------------------------------+
| Period: Feb 2 - Feb 3, 2026               |
| (No transactions in this period)          |
+-------------------------------------------+
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Fix KPI matching logic; remove mock data usage; add period display |
| `src/config/kpiDefinitions.ts` | Optionally align key names to match database format |

## Technical Notes

- The Financial Control bot is working correctly - it stores KPIs with `source: "quickbooks"` in metadata
- The CRM bots (Property Halo, Unique Painting, ATI Security) require their integrations (PETE CRM, Labortech, Jobber) to be connected before they can pull live data
- Running the Financial Control bot with a "weekly" or "monthly" cadence will fetch more historical data from QBO if transactions exist

