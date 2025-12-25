'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import Button from './Button';
import { Cloud, Sun, Moon, ArrowRight } from 'lucide-react';
import { useSidebar } from '../lib/useSidebar';

/**
 * Navbar component - Top navigation bar with theme toggle and auth state
 */
export default function Navbar() {
  const [darkMode, setDarkMode] = useState(false);
  const { isAuthenticated, companyName, loading, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
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
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo/Brand */}
          <div className="flex items-center space-x-2">
            {/* Cloud icon */}
            <Cloud className="w-8 h-8 text-purple-600" />
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  router.push('/login');
                } else {
                  router.push('/');
                }
              }}
              className="text-2xl font-bold text-purple-900 cursor-pointer"
            >
              CloudERP
            </button>
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
                  // Not authenticated - show public links that redirect to login
                  <>
                    <button
                      onClick={() => router.push('/login')}
                      className={`text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors ${getActiveClass('/')}`}
                    >
                      Home
                    </button>
                    <button
                      onClick={() => router.push('/login')}
                      className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
                    >
                      Features
                    </button>
                    <button
                      onClick={() => router.push('/login')}
                      className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
                    >
                      Demo
                    </button>
                    <button
                      onClick={() => router.push('/login')}
                      className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
                    >
                      Pricing
                    </button>
                    <button
                      onClick={() => router.push('/login')}
                      className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
                    >
                      Contacts
                    </button>
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
                <Sun className="w-5 h-5" />
              ) : (
                // Moon icon for dark mode (clicking will switch to dark)
                <Moon className="w-5 h-5" />
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
                      rightIcon={<ArrowRight className="w-4 h-4" />}
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
