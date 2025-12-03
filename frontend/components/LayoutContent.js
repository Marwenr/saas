'use client';

import { useAuth } from '../lib/useAuth';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';

/**
 * Client-side layout content wrapper
 * Conditionally adjusts padding based on sidebar visibility
 */
export default function LayoutContent({ children }) {
  const { isAuthenticated } = useAuth();
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

      {/* Main content area - adjust padding based on sidebar visibility */}
      <main className={`flex-1 ${isAuthenticated ? 'lg:pl-64' : ''}`}>
        {children}
      </main>
    </div>
  );
}
