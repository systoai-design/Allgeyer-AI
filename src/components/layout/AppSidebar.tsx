import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySelector, getCompanyColor } from '@/hooks/useCompanySelector';
import {
  Bot,
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Settings,
  Mail,
  Activity,
  ChevronDown,
  LogOut,
  Building2,
  Cog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/exceptions', icon: AlertTriangle, label: 'Exceptions' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/bot-runs', icon: Activity, label: 'Bot Runs' },
  { to: '/emails', icon: Mail, label: 'Email Archive' },
];

const adminItems = [
  { to: '/bots', icon: Bot, label: 'Bot Configuration' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut, isSuperAdmin } = useAuth();
  const { selectedCompany, setSelectedCompany, availableCompanies } = useCompanySelector();

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Bot className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-sidebar-foreground">Bot Platform</h1>
          <p className="text-xs text-sidebar-foreground/60">Automation Hub</p>
        </div>
      </div>

      {/* Company Selector */}
      <div className="px-3 py-2">
        <Select
          value={selectedCompany?.id || ''}
          onValueChange={(value) => {
            const company = availableCompanies.find(c => c.id === value);
            if (company) setSelectedCompany(company);
          }}
        >
          <SelectTrigger className="w-full bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
            <div className="flex items-center gap-2">
              {selectedCompany && (
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: getCompanyColor(selectedCompany.company_type) }}
                />
              )}
              <SelectValue placeholder="Select company" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableCompanies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: getCompanyColor(company.company_type) }}
                  />
                  {company.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="bg-sidebar-border/50 my-2" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full" />
                )}
                <item.icon className="h-4 w-4" />
                {item.label}
              </>
            )}
          </NavLink>
        ))}

        {isSuperAdmin && (
          <>
            <div className="pt-5 pb-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                Admin
              </p>
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full" />
                    )}
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border/50 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-accent/30">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || 'User'}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/50">
              {profile?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
