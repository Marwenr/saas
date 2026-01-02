'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../lib/useAuth';
import Button from '../../components/Button';
import Card from '../../components/Card';
import PageContainer from '../../components/PageContainer';
import Input from '../../components/Input';
import { ArrowLeft } from 'lucide-react';

/**
 * Register page - Multi-tenant signup flow
 *
 * Creates a new company and owner user in a single transaction.
 * After successful registration, the backend sets httpOnly cookies with JWT tokens
 * containing user ID, companyId, and role. The auth state is automatically
 * updated via the global AuthContext.
 *
 * This replaces the old user-only signup flow with a company-based multi-tenant flow.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { registerCompanyOwner } = useAuth(); // Get registerCompanyOwner function from auth context

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      companyName: '',
      companyEmail: '',
      companyPhone: '',
      companyCountry: 'TN',
      ownerEmail: '',
      ownerPassword: '',
      ownerPasswordConfirm: '',
      ownerFullName: '',
    },
  });

  const password = watch('ownerPassword');

  const onSubmit = async data => {
    setError('');
    setLoading(true);

    try {
      // Register company and owner user using multi-tenant endpoint
      // Backend creates both in a transaction and sets httpOnly cookies
      // Global auth state is automatically updated via AuthContext
      await registerCompanyOwner({
        company: {
          name: data.companyName,
          email: data.companyEmail,
          phone: data.companyPhone || undefined,
          country: data.companyCountry,
        },
        user: {
          email: data.ownerEmail,
          password: data.ownerPassword,
          fullName: data.ownerFullName || undefined,
        },
      });

      // On success, redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Failed to register company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer centered>
      <div className="max-w-2xl w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">
            Create Your Shop / Créer mon magasin
          </h1>
          <p className="text-purple-700 dark:text-purple-300">
            Create your company account and get started
          </p>
        </div>

        <Card>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Company Information Section */}
            <div>
              <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4 pb-2 border-b border-purple-200 dark:border-purple-800">
                Company Information
              </h2>
              <div className="space-y-4">
                <div>
                  <Input
                    type="text"
                    id="companyName"
                    label="Company Name"
                    labelSuffix={<span className="text-red-500">*</span>}
                    placeholder="My Auto Parts Store"
                    disabled={loading}
                    {...register('companyName', {
                      required: 'Company name is required',
                    })}
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.companyName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    type="email"
                    id="companyEmail"
                    label="Company Email"
                    labelSuffix={<span className="text-red-500">*</span>}
                    placeholder="company@example.com"
                    disabled={loading}
                    {...register('companyEmail', {
                      required: 'Company email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {errors.companyEmail && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.companyEmail.message}
                    </p>
                  )}
                </div>

                <Input
                  type="tel"
                  id="companyPhone"
                  label="Company Phone"
                  placeholder="+216 XX XXX XXX"
                  disabled={loading}
                  {...register('companyPhone')}
                />

                <Input
                  type="text"
                  id="companyCountry"
                  label="Country"
                  placeholder="TN"
                  disabled={loading}
                  {...register('companyCountry')}
                />
              </div>
            </div>

            {/* Owner Account Section */}
            <div>
              <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4 pb-2 border-b border-purple-200 dark:border-purple-800">
                Owner Account
              </h2>
              <div className="space-y-4">
                <Input
                  type="text"
                  id="ownerFullName"
                  label="Full Name"
                  placeholder="John Doe"
                  disabled={loading}
                  {...register('ownerFullName')}
                />

                <div>
                  <Input
                    type="email"
                    id="ownerEmail"
                    label="Email Address"
                    labelSuffix={<span className="text-red-500">*</span>}
                    placeholder="you@example.com"
                    disabled={loading}
                    {...register('ownerEmail', {
                      required: 'Email address is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {errors.ownerEmail && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.ownerEmail.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    type="password"
                    id="ownerPassword"
                    label="Password"
                    labelSuffix={<span className="text-red-500">*</span>}
                    placeholder="••••••••"
                    disabled={loading}
                    {...register('ownerPassword', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                  />
                  {errors.ownerPassword && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.ownerPassword.message}
                    </p>
                  )}
                  {!errors.ownerPassword && (
                    <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                      Must be at least 6 characters
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    type="password"
                    id="ownerPasswordConfirm"
                    label="Confirm Password"
                    labelSuffix={<span className="text-red-500">*</span>}
                    placeholder="••••••••"
                    disabled={loading}
                    {...register('ownerPasswordConfirm', {
                      required: 'Please confirm your password',
                      validate: value =>
                        value === password || 'Passwords do not match',
                    })}
                  />
                  {errors.ownerPasswordConfirm && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.ownerPasswordConfirm.message}
                    </p>
                  )}
                </div>
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
                {loading ? 'Creating your shop...' : 'Create My Shop'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-800">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => router.push('/login')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Sign In to Your Account
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
