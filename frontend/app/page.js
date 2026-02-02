'use client';

import { useAuth } from '../lib/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Play, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

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
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-32 pb-20">
      {/* Hero Section */}
      <div className="text-center">
        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight px-4">
          <span className="text-foreground">
            Gérez toute votre entreprise depuis un seul{' '}
          </span>
          <span className="text-primary relative inline-block">
            CloudERP
            {/* Decorative sparkles icon */}
            <Sparkles className="absolute -top-2 -right-6 sm:-right-8 w-8 h-8 sm:w-12 sm:h-12 text-primary opacity-90" />
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg sm:text-xl md:text-2xl text-foreground/80 mb-12 max-w-3xl mx-auto px-4 font-normal">
          Un système ERP intelligent qui unifie les ventes, la comptabilité, les
          RH et l&apos;inventaire dans un tableau de bord puissant
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          {/* Watch Demo Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleWatchDemo}
            className="gap-2"
          >
            <Play className="w-5 h-5" />
            Voir la démo
          </Button>

          {/* Start Free Trial Button */}
          <Button
            variant="default"
            size="lg"
            onClick={handleGetStarted}
            className="gap-2"
          >
            Démarrer votre essai gratuit
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
