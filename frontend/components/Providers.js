'use client';

import { AuthProvider } from '../lib/useAuth';
import { SidebarProvider } from '../lib/useSidebar';

/**
 * Client-side providers wrapper
 * Wraps the app with necessary context providers
 */
export function Providers({ children }) {
  return (
    <AuthProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </AuthProvider>
  );
}
