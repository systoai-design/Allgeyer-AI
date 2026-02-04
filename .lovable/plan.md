
# Apple/Mac Design System Implementation Plan

## Overview
This plan transforms the entire Bot Automation Platform to follow Apple/Mac design principles: clean whitespace, subtle shadows, rounded containers, smooth transitions, minimal borders, and refined typography. The new Emails page serves as the reference design.

---

## Design Principles to Apply

### Core Apple Aesthetic
- **Generous whitespace** - More breathing room between elements
- **Subtle, rounded containers** - `rounded-2xl` with `border-border/50`
- **Minimal visual noise** - Remove heavy borders, use soft shadows
- **Pill-shaped controls** - Rounded-full buttons and tabs
- **Progressive disclosure** - Actions appear on hover
- **Smooth transitions** - 200ms duration on all interactive elements
- **Muted backgrounds** - `bg-muted/40` for inputs, `bg-card` for containers
- **Simplified typography** - Less bold, more refined headings

---

## Files to Modify

### 1. Global Styles & Layout

**`src/components/layout/DashboardLayout.tsx`**
- Add more padding to main content area
- Softer background with subtle gradient

**`src/index.css`**
- Add new utility classes for Apple-style components
- Refine scrollbar styling to be more minimal

### 2. Dashboard Page

**`src/pages/Dashboard.tsx`**
- Simplify header with refined typography
- Convert tabs to pill-shaped navigation
- Add subtle card borders with `border-border/50`
- Improve quick stats with rounded-full containers
- Add staggered entrance animations

**`src/components/dashboard/KpiCard.tsx`**
- Softer card styling with `rounded-2xl`
- Gentler hover effects
- Refined icon containers

**`src/components/dashboard/ExceptionsList.tsx`**
- Clean list-style layout (similar to Emails)
- Hover-reveal actions
- Rounded container

**`src/components/dashboard/RecentReportsCard.tsx`**
- Match the card styling to new system
- Cleaner list items

**`src/components/dashboard/KpiTrendChart.tsx`**
**`src/components/dashboard/ExceptionBarChart.tsx`**
**`src/components/dashboard/PerformanceDonutChart.tsx`**
- Wrap in cleaner containers
- Add subtle entrance animations

### 3. Reports Page

**`src/pages/Reports.tsx`**
- Convert tabs to pill-shaped filter buttons
- Simplify card design to match Emails style
- Add search with borderless input
- Clean modal/dialog styling

### 4. Exceptions Page

**`src/pages/Exceptions.tsx`**
- Pill-shaped filter controls
- Convert table to clean list view (like Emails)
- Softer stat cards with rounded corners
- Progressive disclosure for actions

### 5. Bot Runs Page

**`src/pages/BotRuns.tsx`**
- Clean card-based bot status display
- Simplified stat cards
- Convert table to list-style rows
- Pill-shaped filter controls

### 6. Bots Configuration Page

**`src/pages/Bots.tsx`**
- Refined bot selector with subtle selection state
- Clean tab navigation
- Softer card containers
- Simplified list items for schedules/recipients/thresholds

### 7. Settings Page

**`src/pages/Settings.tsx`**
- Cleaner integration cards
- Softer button styling
- Refined visual hierarchy

### 8. Sidebar

**`src/components/layout/AppSidebar.tsx`**
- Softer active states
- More refined hover effects
- Cleaner user section
- Subtle separator styling

---

## Technical Implementation Details

### New CSS Utilities (index.css)
```css
/* Apple-style container */
.apple-card {
  @apply bg-card rounded-2xl border border-border/50 shadow-sm;
}

/* Apple-style input */
.apple-input {
  @apply bg-muted/40 border-0 rounded-xl;
}

/* Apple-style pill button */
.apple-pill {
  @apply px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200;
}

.apple-pill-active {
  @apply bg-foreground text-background shadow-sm;
}

.apple-pill-inactive {
  @apply bg-muted/60 text-muted-foreground hover:bg-muted;
}
```

### Component Pattern Changes

**Headers**
```
Before:
<h1 className="text-3xl font-bold">Title</h1>

After:
<h1 className="text-2xl font-semibold tracking-tight">Title</h1>
<p className="text-muted-foreground text-sm">Subtitle</p>
```

**Cards**
```
Before:
<Card className="border">

After:
<div className="bg-card rounded-2xl border border-border/50 shadow-sm">
```

**Tabs to Pills**
```
Before:
<TabsList><TabsTrigger>Daily</TabsTrigger></TabsList>

After:
<div className="flex gap-2">
  <button className={cn("apple-pill", active ? "apple-pill-active" : "apple-pill-inactive")}>
    Daily
  </button>
</div>
```

**List Items**
```
Before:
<TableRow><TableCell>...</TableCell></TableRow>

After:
<div className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/50 
  transition-colors duration-200 cursor-pointer rounded-xl">
  ...
</div>
```

---

## Specific Page Changes

### Dashboard
1. Header: Reduce from `text-3xl font-bold` to `text-2xl font-semibold tracking-tight`
2. Quick stats: Change to rounded-full pill shapes
3. Cadence tabs: Convert to pill-style navigation with counts
4. KPI sections: Add subtle section headers with muted backgrounds
5. Cards: Apply `rounded-2xl border-border/50`
6. Charts container: Wrap in clean containers

### Reports
1. Tabs: Convert to pill-style filter buttons (like Emails)
2. Search: Borderless with `bg-muted/40`
3. Cards: Simplify to match Emails style
4. Empty state: Larger icons, cleaner typography

### Exceptions
1. Stat cards: Rounder corners, softer shadows
2. Table: Convert to list-style rows with hover states
3. Filters: Pill-shaped controls
4. Actions: Appear on hover (progressive disclosure)

### Bot Runs
1. Bot status cards: Cleaner with subtle hover
2. Stats grid: Match new card style
3. Table: Convert to clean list rows
4. Filters: Pill-shaped dropdowns

### Bots
1. Bot selector: Subtle selection indicator
2. Tabs: Cleaner pill-style
3. Lists: Clean row-based layout
4. Dialogs: Refined modal styling

### Settings
1. Integration cards: Softer styling
2. Buttons: More refined with subtle borders
3. Overall: More whitespace

### Sidebar
1. Nav items: Softer hover with 0.5px translate
2. Company selector: Cleaner dropdown
3. User section: More refined styling

---

## Animation Refinements

All transitions use:
- Duration: `200ms`
- Easing: `ease-out`
- Hover translate: `translateY(-2px)` or `translateX(0.5px)`
- Active press: `scale-[0.98]`

---

## Files Summary

| File | Changes |
|------|---------|
| `src/index.css` | Add Apple-style utility classes |
| `src/components/layout/DashboardLayout.tsx` | Increase padding, softer background |
| `src/components/layout/AppSidebar.tsx` | Refine hover states, cleaner sections |
| `src/pages/Dashboard.tsx` | Pill tabs, refined cards, typography |
| `src/pages/Reports.tsx` | Pill filters, cleaner cards, list style |
| `src/pages/Exceptions.tsx` | List view, pill filters, refined stats |
| `src/pages/BotRuns.tsx` | Clean cards, list rows, pill filters |
| `src/pages/Bots.tsx` | Refined selector, cleaner tabs, lists |
| `src/pages/Settings.tsx` | Softer cards, refined buttons |
| `src/components/dashboard/KpiCard.tsx` | Rounded corners, softer hover |
| `src/components/dashboard/ExceptionsList.tsx` | List-style rows |
| `src/components/dashboard/RecentReportsCard.tsx` | Cleaner list items |
| `src/components/dashboard/KpiTrendChart.tsx` | Container styling |
| `src/components/dashboard/ExceptionBarChart.tsx` | Container styling |
| `src/components/dashboard/PerformanceDonutChart.tsx` | Container styling |

---

## Estimated Impact

- **13 files modified**
- **Consistent design language** across all pages
- **Improved perceived performance** with smooth transitions
- **Professional, modern aesthetic** matching Apple's design philosophy

