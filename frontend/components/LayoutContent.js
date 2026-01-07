'use client';

import { useAuth } from '../lib/useAuth';
import { usePathname } from 'next/navigation';
import DashboardLayout from './dashboard/DashboardLayout';

/**
 * Client-side layout content wrapper
 * Uses DashboardLayout for authenticated pages, otherwise renders children directly
 */
export default function LayoutContent({ children }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isLandingPage = pathname === '/';

  // Use dashboard layout for authenticated pages (except auth pages)
  if (isAuthenticated && !isAuthPage) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  // Public pages (landing, login, register) render without dashboard layout
  if (isLandingPage && !isAuthenticated) {
    return <main className="flex-1">{children}</main>;
  }

  // Auth pages render without dashboard layout
  if (isAuthPage) {
    return <main className="flex-1">{children}</main>;
  }

  // Default: render children
  return <main className="flex-1">{children}</main>;
}
