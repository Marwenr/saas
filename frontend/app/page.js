'use client';

import { useAuth } from '../lib/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Button from '../components/Button';
import PageContainer from '../components/PageContainer';

/**
 * Landing page - CloudERP
 */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleGetStarted = () => {
    router.push('/register');
  };

  const handleWatchDemo = () => {
    // TODO: Implement demo video modal or page
  };

  return (
    <PageContainer>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight px-4">
            <span className="text-purple-900 dark:text-purple-200">
              Manage Your Entire Business From One{' '}
            </span>
            <span className="text-purple-600 dark:text-purple-400 relative inline-block">
              CloudERP
              {/* Decorative sunburst icon */}
              <svg
                className="absolute -top-2 -right-6 sm:-right-8 w-8 h-8 sm:w-12 sm:h-12 text-purple-500 dark:text-purple-400 opacity-90"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L13.09 8.26L19 7L17.74 13.09L22 12L15.74 13.09L17 19L10.91 17.74L12 22L10.91 15.74L5 17L6.26 10.91L2 12L8.26 10.91L7 5L13.09 6.26L12 2Z" />
              </svg>
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg sm:text-xl md:text-2xl text-purple-900 dark:text-purple-200 mb-12 max-w-3xl mx-auto px-4 font-normal">
            A smart ERP system that unifies sales, accounting, HR, and inventory
            into one powerful dashboard
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {/* Watch Demo Button */}
            <Button
              variant="tertiary"
              size="lg"
              onClick={handleWatchDemo}
              icon={
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
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            >
              Watch Demo
            </Button>

            {/* Start Free Trial Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleGetStarted}
              rightIcon={
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
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              }
            >
              Start Your Free Trial
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
a;
