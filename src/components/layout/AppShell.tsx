import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
}

const AppShellInner = ({ children }: AppShellProps) => {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className={cn('transition-[margin] duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        <Topbar />

        <main className="min-h-[calc(100vh-4rem)] p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
};