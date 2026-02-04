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
  LogOut,
  PanelLeftClose,
  PanelLeft,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebarState } from '@/hooks/useSidebarState';

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

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
}

function NavItem({ to, icon: Icon, label, isCollapsed }: NavItemProps) {
  const content = (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isCollapsed && 'justify-center px-2',
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
          <Icon className={cn("h-4 w-4 flex-shrink-0", isCollapsed && "h-5 w-5")} />
          {!isCollapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function AppSidebar() {
  const { profile, signOut, isSuperAdmin } = useAuth();
  const { selectedCompany, setSelectedCompany, availableCompanies } = useCompanySelector();
  const { isCollapsed, toggleSidebar } = useSidebarState();

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex h-14 items-center gap-3 px-3 border-b border-sidebar-border/30",
        isCollapsed && "justify-center px-2"
      )}>
        <div className={cn(
          "flex items-center justify-center rounded-xl bg-sidebar-primary transition-all duration-200",
          isCollapsed ? "h-9 w-9" : "h-8 w-8"
        )}>
          <Bot className={cn("text-sidebar-primary-foreground", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm text-sidebar-foreground truncate">Bot Platform</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg transition-all duration-200",
            isCollapsed && "absolute right-2 top-3"
          )}
          onClick={toggleSidebar}
        >
          {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Company Selector */}
      {!isCollapsed && (
        <div className="px-3 py-3">
          <Select
            value={selectedCompany?.id || ''}
            onValueChange={(value) => {
              const company = availableCompanies.find(c => c.id === value);
              if (company) setSelectedCompany(company);
            }}
          >
            <SelectTrigger className="w-full bg-sidebar-accent/50 border-0 text-sidebar-foreground h-9 rounded-xl text-sm">
              <div className="flex items-center gap-2">
                {selectedCompany && (
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getCompanyColor(selectedCompany.company_type) }}
                  />
                )}
                <SelectValue placeholder="Select company" className="truncate" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {availableCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: getCompanyColor(company.company_type) }}
                    />
                    {company.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isCollapsed && selectedCompany && (
        <div className="flex justify-center py-3">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center bg-sidebar-accent/50 cursor-default"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: getCompanyColor(selectedCompany.company_type) }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {selectedCompany.name}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-0.5 py-2", isCollapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} isCollapsed={isCollapsed} />
        ))}

        {isSuperAdmin && (
          <>
            {!isCollapsed && (
              <div className="pt-5 pb-1">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/30">
                  Admin
                </p>
              </div>
            )}
            {isCollapsed && <div className="h-px bg-sidebar-border/30 my-3" />}
            {adminItems.map((item) => (
              <NavItem key={item.to} {...item} isCollapsed={isCollapsed} />
            ))}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className={cn(
        "border-t border-sidebar-border/30 p-2",
        isCollapsed && "flex flex-col items-center"
      )}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Avatar className="h-9 w-9 cursor-default">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {profile?.full_name || 'User'}
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-accent/30">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.full_name || 'User'}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/40">
                {profile?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-lg"
              onClick={() => signOut()}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
