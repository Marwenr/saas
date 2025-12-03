'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import Container from './Container';

/**
 * Conditionally wraps children in Container component
 * Skips Container for landing page when not authenticated
 */
export default function ConditionalContainer({ children }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const isLandingPage = pathname === '/';

  // Don't use Container on landing page when not authenticated
  if (isLandingPage && !isAuthenticated) {
    return <>{children}</>;
  }

  return <Container>{children}</Container>;
}
