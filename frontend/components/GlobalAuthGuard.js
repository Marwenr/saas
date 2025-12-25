'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../lib/useAuth';

/**
 * GlobalAuthGuard component - redirects to login if not authenticated
 * Excludes /login and /register from redirection
 */
export default function GlobalAuthGuard({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register'];

  useEffect(() => {
    // Only redirect if auth check is complete and user is not authenticated
    if (!loading && !isAuthenticated) {
      // Check if current path is not a public route
      if (!publicRoutes.includes(pathname)) {
        router.push('/login');
      }
    }
  }, [loading, isAuthenticated, pathname, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-purple-700 dark:text-purple-300">Loading...</div>
      </div>
    );
  }

  // If not authenticated and on a protected route, don't render children (redirect will happen)
  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-purple-700 dark:text-purple-300">
          Redirecting...
        </div>
      </div>
    );
  }

  // Show children for authenticated users or public routes
  return <>{children}</>;
}
