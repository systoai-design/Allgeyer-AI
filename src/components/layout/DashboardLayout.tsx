import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, useSidebarState } from '@/hooks/useSidebarState';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const { isCollapsed } = useSidebarState();
  
  return (
    <div className="flex min-h-screen bg-background">
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-out",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <AppSidebar />
      </div>
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300 ease-out",
        isCollapsed ? "ml-16" : "ml-64"
      )}>
        <div className="container py-8 px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <DashboardContent>{children}</DashboardContent>
      </SidebarProvider>
    </TooltipProvider>
  );
}
