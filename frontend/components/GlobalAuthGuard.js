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
    // Don't redirect if we're already on a public route (login/register)
    // This prevents redirect loops and unwanted refreshes on login page
    if (!loading && !isAuthenticated && !publicRoutes.includes(pathname)) {
      // Use replace instead of push to avoid adding to history
      router.replace('/login');
    }
  }, [loading, isAuthenticated, pathname, router]);

  // Show loading state while checking auth
  // But don't block public routes during loading
  if (loading && !publicRoutes.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If not authenticated and on a protected route, don't render children (redirect will happen)
  // But allow public routes to render even if not authenticated
  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  // Show children for authenticated users or public routes
  // Always show public routes, even if not authenticated
  return <>{children}</>;
}
