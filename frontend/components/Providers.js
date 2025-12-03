'use client';

import { AuthProvider } from '../lib/useAuth';

/**
 * Client-side providers wrapper
 * Wraps the app with necessary context providers
 */
export function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
