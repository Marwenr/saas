'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/useAuth';
import Header from './Header';
import Sidebar from './Sidebar';
import { cn } from '../../lib/utils';
import { useSidebar } from '../../lib/useSidebar';

/**
 * Dashboard Layout Component
 * Wrapper for dashboard pages with Header and Sidebar
 */
export default function DashboardLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const { isOpen } = useSidebar();
  const pathname = usePathname();

  // Don't apply dashboard layout to auth pages
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (!isAuthenticated || isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Fixed left (ONLY navigation) */}
      <Sidebar />

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          isOpen ? 'md:ml-64' : 'md:ml-16'
        )}
      >
        {/* Header (NO navigation, only search, theme, user menu) */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          <div className="container mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
