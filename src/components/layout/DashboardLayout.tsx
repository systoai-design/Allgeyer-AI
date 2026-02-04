import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 z-50 w-64">
        <AppSidebar />
      </div>
      <main className="ml-64 flex-1 overflow-auto">
        <div className="container py-8 px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
