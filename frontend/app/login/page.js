'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/useAuth';
import Button from '../../components/Button';
import Card from '../../components/Card';
import PageContainer from '../../components/PageContainer';
import Input from '../../components/Input';

/**
 * Login page (multi-tenant aware)
 *
 * After successful login, the backend sets httpOnly cookies with JWT tokens
 * containing user ID, companyId, and role. The auth state is automatically
 * updated via the global AuthContext.
 */
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth(); // Get login function from auth context
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login sets httpOnly cookies with JWT tokens and updates global auth state
      await login(email, password);

      // Redirect to dashboard/home
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer centered>
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">
            Welcome Back
          </h1>
          <p className="text-purple-700 dark:text-purple-300">
            Sign in to your account to continue
          </p>
        </div>

        <Card>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              id="email"
              name="email"
              label="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />

            <Input
              type="password"
              id="password"
              name="password"
              label="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-purple-300 dark:border-purple-700 rounded"
                  disabled={loading}
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-purple-700 dark:text-purple-300"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                fullWidth
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-800">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => router.push('/register')}
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
              Create Your Shop
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
