import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { CompanySelectorProvider } from '@/hooks/useCompanySelector';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <CompanySelectorProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>
    </CompanySelectorProvider>
  );
}
