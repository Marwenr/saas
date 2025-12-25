'use client';

import { useAuth } from '../lib/useAuth';
import { useSidebar } from '../lib/useSidebar';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';

/**
 * Client-side layout content wrapper
 * Conditionally adjusts padding based on sidebar visibility
 */
export default function LayoutContent({ children }) {
  const { isAuthenticated } = useAuth();
  const { isOpen } = useSidebar();
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  // Don't show sidebar on landing page
  if (isLandingPage && !isAuthenticated) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="flex flex-1 pt-16">
      {/* Sidebar */}
      {isAuthenticated && <Sidebar />}

      {/* Main content area - adjust padding based on sidebar state (always visible but collapsed/expanded) */}
      <main
        className={`flex-1 transition-all duration-300 ${isAuthenticated ? (isOpen ? 'pl-64' : 'pl-16') : ''}`}
      >
        {children}
      </main>
    </div>
  );
}
