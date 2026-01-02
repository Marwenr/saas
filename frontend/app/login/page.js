'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../lib/useAuth';
import Button from '../../components/Button';
import Card from '../../components/Card';
import PageContainer from '../../components/PageContainer';
import Input from '../../components/Input';
import { ArrowRight } from 'lucide-react';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async data => {
    setError('');
    setLoading(true);

    try {
      // Login sets httpOnly cookies with JWT tokens and updates global auth state
      await login(data.email, data.password);

      // Only redirect if login is successful (no error thrown)
      // Small delay to ensure state is updated
      setTimeout(() => {
        router.push('/');
      }, 100);
    } catch (err) {
      // Display the specific error message from backend
      // Backend returns: "email invalide" or "password invalide"
      console.error('Login error:', err); // Debug log

      // Extract error message from various possible locations
      let errorMessage = 'Login failed. Please check your credentials.';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.data?.error) {
        errorMessage = err.data.error;
      } else if (err?.error) {
        errorMessage = err.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);
      setLoading(false);
      // DO NOT redirect or refresh on error - stay on login page and show error
      // Prevent any navigation
      return;
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
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form
            onSubmit={e => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(onSubmit)(e);
            }}
            className="space-y-6"
            noValidate
          >
            <div>
              <Input
                type="email"
                id="email"
                label="Email address"
                placeholder="you@example.com"
                disabled={loading}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Input
                type="password"
                id="password"
                label="Password"
                placeholder="••••••••"
                disabled={loading}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

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
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Your Shop
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
