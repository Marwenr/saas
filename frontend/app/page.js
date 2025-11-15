import Container from '../components/Container';

/**
 * Next.js App Router - Home page
 */
export default function Home() {
  return (
    <div className="py-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">
          Welcome to SaaS Starter
        </h1>
        <p className="text-lg text-[var(--text-secondary)] mb-6">
          A clean, flexible SaaS monorepo starter built with Next.js and Tailwind CSS.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="p-6 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <h2 className="text-xl font-semibold mb-2 text-primary-600 dark:text-primary-400">
              Frontend
            </h2>
            <p className="text-[var(--text-secondary)]">
              Next.js 14 with App Router, Tailwind CSS, and modern React patterns.
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

        <div className="mt-8">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}
