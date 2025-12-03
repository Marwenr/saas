'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/useAuth';

/**
 * PageBackground Component - Applies background to public pages (login, register, landing)
 * Should wrap the entire page content in layout
 */
export default function PageBackground({ children }) {
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Only apply background to public pages (not authenticated)
  const isPublicPage =
    !isAuthenticated &&
    (pathname === '/' || pathname === '/login' || pathname === '/register');

  useEffect(() => {
    if (!isPublicPage) return;

    // Check for dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    // Initial check
    checkDarkMode();

    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [isPublicPage]);

  if (!isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div
      className="min-h-screen bg-white relative overflow-hidden transition-all duration-200"
      style={{
        background: isDark
          ? 'linear-gradient(235deg, rgba(80, 18, 138, 1) 0%, rgba(0, 0, 0, 1) 19%, rgba(0, 0, 0, 1) 80%, rgba(80, 18, 138, 1) 100%)'
          : undefined,
      }}
    >
      {/* Purple gradient overlay - subtle transition from white to light purple (light mode only) */}
      {!isDark && (
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-purple-50/30 pointer-events-none transition-colors duration-200" />
      )}
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
