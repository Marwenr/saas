'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import Button from './Button';

/**
 * Navbar component - Top navigation bar with theme toggle and auth state
 */
export default function Navbar() {
  const [darkMode, setDarkMode] = useState(false);
  const { isAuthenticated, companyName, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleGetStarted = () => {
    router.push('/register');
  };

  // Determine active link
  const getActiveClass = href => {
    if (href === '/') {
      return pathname === '/' ? 'border-b-2 border-purple-600 pb-1' : '';
    }
    return pathname?.startsWith(href)
      ? 'border-b-2 border-purple-600 pb-1'
      : '';
  };

  // Unified navbar - landing page style throughout the app
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-purple-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            {/* Cloud icon */}
            <svg
              className="w-8 h-8 text-purple-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19.36 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.64-4.96z" />
            </svg>
            <Link href="/" className="text-2xl font-bold text-purple-900">
              CloudERP
            </Link>
            {/* Show company name when authenticated */}
            {!loading && isAuthenticated && companyName && (
              <span className="text-sm font-medium text-purple-700 hidden sm:inline ml-2">
                / {companyName}
              </span>
            )}
          </div>

          {/* Navigation Links - Centered */}
          <div className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
            {!loading && (
              <>
                {!isAuthenticated ? (
                  // Not authenticated - show public links
                  <>
                    <Link
                      href="/"
                      className={`text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors ${getActiveClass('/')}`}
                    >
                      Home
                    </Link>
                    <Link
                      href="#features"
                      className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
                    >
                      Features
                    </Link>
                    <Link
                      href="#demo"
                      className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
                    >
                      Demo
                    </Link>
                    <Link
                      href="#pricing"
                      className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
                    >
                      Pricing
                    </Link>
                    <Link
                      href="#contacts"
                      className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
                    >
                      Contacts
                    </Link>
                  </>
                ) : (
                  // Authenticated - show app links
                  <>
                    <Link
                      href="/dashboard"
                      className={`text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors ${getActiveClass('/dashboard')}`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/products"
                      className={`text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors ${getActiveClass('/products')}`}
                    >
                      Products
                    </Link>
                    <Link
                      href="/inventory"
                      className={`text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors ${getActiveClass('/inventory')}`}
                    >
                      Inventory
                    </Link>
                    <Link
                      href="/sales"
                      className={`text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors ${getActiveClass('/sales')}`}
                    >
                      Sales
                    </Link>
                    <Link
                      href="/pos"
                      className={`text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors ${getActiveClass('/pos')}`}
                    >
                      POS
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-purple-900 hover:text-purple-700 transition-colors rounded-lg hover:bg-purple-50"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                // Sun icon for light mode (clicking will switch to light)
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                // Moon icon for dark mode (clicking will switch to dark)
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
            {!loading && (
              <>
                {!isAuthenticated ? (
                  <>
                    <Link
                      href="/login"
                      className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors px-3 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    >
                      Sign In
                    </Link>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleGetStarted}
                      rightIcon={
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      }
                    >
                      Get Started
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="md" onClick={handleLogout}>
                    Logout
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
