'use client';

import { AuthProvider } from '../lib/useAuth';
import { SidebarProvider } from '../lib/useSidebar';
import { Toaster } from './ui/toaster';

/**
 * Client-side providers wrapper
 * Wraps the app with necessary context providers
 */
export function Providers({ children }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        {children}
        <Toaster />
      </SidebarProvider>
    </AuthProvider>
  );
}
