'use client';

import { useEffect, useState } from 'react';

/**
 * PageBackground Component
 * Provides consistent background styling across the app
 * Removes decorative gradients for professional ERP look
 */
export default function PageBackground({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      const isDarkMode =
        document.documentElement.classList.contains('dark') ||
        (!document.documentElement.classList.contains('dark') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkTheme();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden transition-colors duration-200">
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
