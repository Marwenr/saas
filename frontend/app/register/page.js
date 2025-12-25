'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyCountry, setCompanyCountry] = useState('TN');

  // Owner user fields
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    // Validate password confirmation
    if (ownerPassword !== ownerPasswordConfirm) {
      setError('Passwords do not match');
      return;
    }

    // Validate minimum password length
    if (ownerPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Register company and owner user using multi-tenant endpoint
      // Backend creates both in a transaction and sets httpOnly cookies
      // Global auth state is automatically updated via AuthContext
      await registerCompanyOwner({
        company: {
          name: companyName,
          email: companyEmail,
          phone: companyPhone || undefined,
          country: companyCountry,
        },
        user: {
          email: ownerEmail,
          password: ownerPassword,
          fullName: ownerFullName || undefined,
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

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Company Information Section */}
            <div>
              <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4 pb-2 border-b border-purple-200 dark:border-purple-800">
                Company Information
              </h2>
              <div className="space-y-4">
                <Input
                  type="text"
                  id="companyName"
                  name="companyName"
                  label="Company Name"
                  labelSuffix={<span className="text-red-500">*</span>}
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="My Auto Parts Store"
                  required
                  disabled={loading}
                />

                <Input
                  type="email"
                  id="companyEmail"
                  name="companyEmail"
                  label="Company Email"
                  labelSuffix={<span className="text-red-500">*</span>}
                  value={companyEmail}
                  onChange={e => setCompanyEmail(e.target.value)}
                  placeholder="company@example.com"
                  required
                  disabled={loading}
                />

                <Input
                  type="tel"
                  id="companyPhone"
                  name="companyPhone"
                  label="Company Phone"
                  value={companyPhone}
                  onChange={e => setCompanyPhone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  disabled={loading}
                />

                <Input
                  type="text"
                  id="companyCountry"
                  name="companyCountry"
                  label="Country"
                  value={companyCountry}
                  onChange={e => setCompanyCountry(e.target.value)}
                  placeholder="TN"
                  disabled={loading}
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
                  name="ownerFullName"
                  label="Full Name"
                  value={ownerFullName}
                  onChange={e => setOwnerFullName(e.target.value)}
                  placeholder="John Doe"
                  disabled={loading}
                />

                <Input
                  type="email"
                  id="ownerEmail"
                  name="ownerEmail"
                  label="Email Address"
                  labelSuffix={<span className="text-red-500">*</span>}
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />

                <div>
                  <Input
                    type="password"
                    id="ownerPassword"
                    name="ownerPassword"
                    label="Password"
                    labelSuffix={<span className="text-red-500">*</span>}
                    value={ownerPassword}
                    onChange={e => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                    Must be at least 6 characters
                  </p>
                </div>

                <Input
                  type="password"
                  id="ownerPasswordConfirm"
                  name="ownerPasswordConfirm"
                  label="Confirm Password"
                  labelSuffix={<span className="text-red-500">*</span>}
                  value={ownerPasswordConfirm}
                  onChange={e => setOwnerPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                />
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
