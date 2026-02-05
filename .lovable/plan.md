

# PETE CRM Browser Automation Integration

## Overview

Since PETE CRM (app.thepete.io) has no API and CSV export isn't viable, we'll implement browser automation using **Browserless.io** - a cloud-based headless browser service that can handle authenticated sessions, cookies, and JavaScript-heavy SPAs.

## Architecture

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Dashboard     │────▶│  run-pete-scraper    │────▶│  Browserless    │
│   (Frontend)    │     │  (Edge Function)     │     │  API Service    │
└─────────────────┘     └──────────────────────┘     └────────┬────────┘
                                 │                            │
                                 │                            ▼
                                 │                   ┌─────────────────┐
                                 │                   │  app.thepete.io │
                                 │                   │  (Login & Scrape)│
                                 ▼                   └─────────────────┘
                        ┌──────────────────────┐
                        │   kpi_history table  │
                        │   (Supabase DB)      │
                        └──────────────────────┘
```

## Implementation Steps

### 1. Add Browserless Connector/Secret
Request the user to sign up for Browserless (free tier: 1k units/month) and provide their API token.

### 2. Create New Edge Function: `run-pete-scraper`
This function will:
- Connect to Browserless API with the user's token
- Use BrowserQL or Puppeteer-over-WebSocket to:
  1. Navigate to app.thepete.io login page
  2. Inject saved session cookies OR perform login with stored credentials
  3. Navigate to the dashboard/analytics pages
  4. Extract KPI data using CSS selectors
  5. Return structured data

### 3. Secure Credential Storage
Add secrets for PETE credentials:
- `PETE_EMAIL` - Login email
- `PETE_PASSWORD` - Login password  
- `BROWSERLESS_API_KEY` - Browserless token

### 4. Update run-crm-bot
Modify the existing CRM bot to call `run-pete-scraper` when company_type is `property_halo`.

### 5. KPI Extraction Targets
Based on Property Halo's defined KPIs, scrape:
- **Daily**: Leads, Appointments, Calls Made, Completed Deals
- **Weekly**: Contracts in Pipeline, Pipeline Value, Under Contract, Upcoming Closings
- **Monthly**: Assets Bought, Assets Sold, Under Contract, Closings, Completed Deals
- **Quarterly**: ROI, Capital Deployed, Portfolio Valuation

---

## Technical Details

### Browserless Integration Code Pattern

```typescript
// Edge function will use Browserless REST API
const BROWSERLESS_URL = 'https://production-sfo.browserless.io';

async function scrapePete(browserlessToken: string, credentials: { email: string; password: string }) {
  // Step 1: Create a session for cookie persistence
  const sessionResponse = await fetch(
    `${BROWSERLESS_URL}/session?token=${browserlessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ttl: 300000, // 5 minute session
        stealth: true, // Anti-bot detection
      }),
    }
  );
  
  // Step 2: Use BrowserQL to login and scrape
  const scrapeResponse = await fetch(
    `${BROWSERLESS_URL}/chromium/bql?token=${browserlessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            goto(url: "https://app.thepete.io/login")
            type(selector: "input[name='email']", text: "${credentials.email}")
            type(selector: "input[name='password']", text: "${credentials.password}")
            click(selector: "button[type='submit']")
            waitForNavigation
            goto(url: "https://app.thepete.io/dashboard")
            waitForSelector(selector: ".kpi-container")
            text(selector: ".leads-count") { value }
            text(selector: ".pipeline-value") { value }
          }
        `
      }),
    }
  );
  
  return scrapeResponse.json();
}
```

### Session Persistence Strategy
- First run: Login with credentials, save cookies
- Subsequent runs: Inject cookies to skip login
- If cookies expired: Re-login automatically

### Error Handling
- CAPTCHA detection: Alert user to manually login and retry
- MFA: Store TOTP secret if PETE supports it, or fallback to manual
- Rate limiting: Implement exponential backoff

---

## Cost Estimate
- **Browserless Free Tier**: 1,000 units/month
- Each scrape session: ~10-20 units
- Estimated monthly syncs: 30-60 (daily syncs)
- **Result**: Free tier should cover basic usage

For heavier usage, Prototyping tier ($25/month) provides 20k units.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| PETE UI changes break selectors | Build selector mapping config, easy to update |
| CAPTCHA challenges | Browserless includes automatic CAPTCHA solving |
| Session timeouts | Re-login flow with fresh credentials |
| Rate limiting by PETE | Throttle requests, respect robots.txt |

---

## Questions Before Implementation

1. **Do you have a Browserless account?** If not, you'll need to sign up at browserless.io (free tier available)

2. **What are your PETE login credentials?** (Email/password) - I'll store these securely as secrets

3. **Does PETE have 2FA/MFA enabled?** This affects the login flow

4. **What specific dashboard pages in PETE contain the KPI data you need?** (e.g., /dashboard, /reports, /analytics)

