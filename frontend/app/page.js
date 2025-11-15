'use client';

import Container from '../components/Container';
import AuthGuard from '../components/AuthGuard';

/**
 * Next.js App Router - Home page (Dashboard)
 */
function Dashboard() {
  return (
    <div className="py-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
          Dashboard
        </h1>
        <p className="text-lg text-[var(--text-secondary)] mb-6">
          Welcome to your SaaS dashboard
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="p-6 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <h2 className="text-xl font-semibold mb-2 text-primary-600 dark:text-primary-400">
              Frontend
            </h2>
            <p className="text-[var(--text-secondary)]">
              Next.js 14 with App Router, Tailwind CSS, and modern React
              patterns.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <h2 className="text-xl font-semibold mb-2 text-primary-600 dark:text-primary-400">
              Backend
            </h2>
            <p className="text-[var(--text-secondary)]">
              Fastify + MongoDB for scalable API development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
