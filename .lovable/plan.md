

# Multi-Bot Automation Platform

A comprehensive automation and reporting system for three companies (Property Halo, Unique Painting, ATI Security) with intelligent bots that pull data from multiple sources, generate professional reports, and trigger exception alerts.

---

## Core Platform Architecture

### 1. Dashboard & Reporting Hub
A central web application where team members can:
- **View real-time KPIs** across all companies (with role-based visibility)
- **Browse historical reports** (Daily, Weekly, Monthly, Quarterly)
- **Track exceptions** that need attention with status management
- **See trend charts** comparing current vs. historical performance
- **Access the email archive** of all sent reports

### 2. Bot Configuration System
An admin interface to:
- **Configure bot schedules** (when daily/weekly/monthly/quarterly runs execute)
- **Manage email recipients** per company and report type
- **Set exception thresholds** (e.g., "flag if uncategorized transactions > 5")
- **Define KPI targets** for visual indicators (green/yellow/red)
- **Test integrations** and preview email outputs

### 3. Integration Framework
Placeholder architecture for external systems:
- **QuickBooks Online** - Financial data for all 3 companies
- **PETE CRM** - Property Halo lead and deal tracking
- **Labortech** - Lead tracking for Unique Painting and ATI Security
- **Jobber** - Estimates, jobs, and collections for painting/security

---

## The Four Bots

### Bot 2 — Financial Control Bot (Foundation)
*All other bots depend on this one*

**Daily Operations:**
- Pull and classify bank/card transactions
- Flag uncategorized, duplicate, or incomplete transactions
- Maintain rolling transaction logs

**Weekly Operations:**
- Generate reconciliation statements
- Report cash positions per company
- Track unresolved items

**Monthly Operations:**
- Finalized P&L and KPIs per company
- Asset summaries (bought/sold/under contract)
- Recurring expense and debt tracking

**Quarterly Operations:**
- KPI rollups and net worth statements
- Investment summaries and credit snapshots

---

### Bot 1 — Property Halo (Real Estate)

**Daily:** Leads, appointments, calls, offers made/accepted  
**Weekly:** Contract status, pipeline, cash position  
**Monthly:** Closings, revenue, profit, asset movement  
**Quarterly:** ROI analysis, capital deployment, portfolio valuation

---

### Bot 3 — Unique Painting

**Daily:** Leads, estimates sent, jobs completed  
**Weekly:** Jobs sold, revenue booked, cash available  
**Monthly:** Profit per job, crew utilization  
**Quarterly:** Revenue growth, margin trends, customer acquisition

---

### Bot 4 — ATI Security

**Daily:** Leads, estimates, active projects, installations  
**Weekly:** Contracts signed, pipeline value  
**Monthly:** Revenue, gross margin, recurring vs. project revenue  
**Quarterly:** Contract backlog, deal size trends, client concentration

---

## Email System

### Professional HTML Reports
- Company-branded headers with logos
- Color-coded KPI indicators (on-track/warning/critical)
- Clean data tables with proper formatting
- Clear separation of finalized vs. provisional data
- Exception call-outs with required actions

### Smart Routing
- Todd@upsellhomes.com → Unique Painting + ATI reports
- Ben@benallgeyer.com → Property Halo reports
- Configurable CC/BCC per report type

---

## User Management & Security

### Role-Based Access
- **Super Admin** — Full access to all companies and configuration
- **Company Admin** — Full access to their company only
- **Team Member** — View reports and exceptions for their company

### Company Isolation
- Users only see data for companies they're assigned to
- Each company's data is completely separated
- Audit trail of all bot actions and report deliveries

---

## Data & Storage

### Historical Database
- All transaction classifications stored with timestamps
- Complete KPI history for trend analysis
- Email delivery logs and content archives
- Exception tracking with resolution history

### Analytics-Ready
- Compare any period to previous periods
- Track KPI trends over time
- Exportable data for external analysis

---

## Initial Build Scope

**Phase 1** will deliver:
1. Complete database schema with all tables
2. User authentication with role-based permissions
3. Dashboard with company selector and KPI displays
4. Bot configuration interface
5. Exception management system
6. Email template system with Resend integration
7. Scheduled job infrastructure (daily/weekly/monthly/quarterly)
8. Mock data generators for each integration point

The integration connectors (QuickBooks, PETE, Labortech, Jobber) will be structured with placeholder functions, ready for API credentials when available.

