
# Fix Intuit OAuth Logo + Enable Multi-Company QBO Connections

## Overview

Two issues to address:
1. **Broken Logo on Intuit Authorization Screen** - The "Systo Bot Platform" logo appears broken on Intuit's OAuth consent screen because Intuit fetches the logo from the app registration in your Intuit Developer account, not from your application code
2. **Multi-Company QBO Connections** - Good news! The current architecture already supports connecting multiple QBO accounts (one per company)

---

## Issue 1: Broken Intuit Logo

### Root Cause
The logo you see on Intuit's OAuth authorization screen is configured in **Intuit Developer Portal**, not in this application's code. Intuit hosts that page and displays your app's registered logo.

### Solution
You need to update the logo in your Intuit Developer account:

1. Go to [Intuit Developer Portal](https://developer.intuit.com/app/developer/dashboard)
2. Select your app (Systo Bot Platform)
3. Navigate to **App Settings** > **App Info**
4. Upload a proper logo image (requirements: PNG/JPG, typically 200x200px minimum)
5. Save changes

This is **not** something that can be fixed in the application code since Intuit controls that OAuth consent screen.

---

## Issue 2: Multi-Company QBO Connections

### Current Architecture (Already Supports This!)

The database schema already allows each company to have its own QBO connection:

```text
integrations table:
+--------------------+------------------+---------------+
| company_id         | integration_type | is_connected  |
+--------------------+------------------+---------------+
| Property Halo      | quickbooks       | true          |
| Unique Painting    | quickbooks       | (not yet)     |
| ATI Security       | quickbooks       | (not yet)     |
+--------------------+------------------+---------------+
```

**How it works:**
- Each company has its own row in `integrations` table
- The unique constraint is on `(company_id, integration_type)`
- When you select a different company in the sidebar, the Settings page shows that company's connection status

### Minor UX Improvement

I'll add a visual indicator on the Settings page showing which companies have QBO connected vs not connected, so you can easily see the status across all your companies at a glance.

---

## Implementation Plan

### Step 1: Add Multi-Company Integration Status Component
Create a new section on Settings page showing connection status for all companies (for super admins)

### Step 2: Improve Settings Page Layout
- Add a table/grid showing all companies and their QBO connection status
- Allow quick switching between companies to connect/manage each one
- Show realm ID and last sync time for connected companies

### Step 3: Add Company Switcher in QBO Card
Make it clearer which company you're connecting when initiating OAuth

---

## Technical Details

### New Component: CompanyIntegrationStatus
```text
File: src/components/settings/CompanyIntegrationStatus.tsx

Displays a grid of all companies with:
- Company name and color badge
- QBO connection status (connected/not connected)
- Last sync time (if connected)  
- Quick action button to connect or manage
```

### Modified Files
- `src/pages/Settings.tsx` - Add the new component and improve layout

---

## Summary

| Item | Action Required |
|------|----------------|
| Broken logo on Intuit screen | Update logo in Intuit Developer Portal (manual step) |
| Multi-company QBO support | Already works! I'll add a status overview for visibility |
