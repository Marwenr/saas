'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SidebarContext = createContext(null);

/**
 * SidebarProvider component - Provides global sidebar state via React Context
 */
export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Auto-open sidebar on dashboard page
  useEffect(() => {
    if (pathname === '/dashboard') {
      setIsOpen(true);
    }
  }, [pathname]);

  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };

  const openSidebar = () => {
    setIsOpen(true);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

/**
 * Hook to access sidebar context
 */
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
