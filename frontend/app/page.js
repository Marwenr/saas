'use client';

import { useAuth } from '../lib/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Button from '../components/Button';
import PageContainer from '../components/PageContainer';
import { Play, ArrowRight, Sparkles } from 'lucide-react';

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
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight px-4">
            <span className="text-purple-900 dark:text-purple-200">
              Manage Your Entire Business From One{' '}
            </span>
            <span className="text-purple-600 dark:text-purple-400 relative inline-block">
              CloudERP
              {/* Decorative sparkles icon */}
              <Sparkles className="absolute -top-2 -right-6 sm:-right-8 w-8 h-8 sm:w-12 sm:h-12 text-purple-500 dark:text-purple-400 opacity-90" />
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
              icon={<Play className="w-5 h-5" />}
            >
              Watch Demo
            </Button>

            {/* Start Free Trial Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleGetStarted}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Start Your Free Trial
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
