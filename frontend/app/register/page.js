'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../lib/useAuth';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { ArrowLeft, Loader2 } from 'lucide-react';

/**
 * Register page - Multi-tenant signup flow
 */
export default function RegisterPage() {
  const router = useRouter();
  const { registerCompanyOwner } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm({
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

  const password = form.watch('ownerPassword');

  const onSubmit = async data => {
    setError('');
    setLoading(true);

    try {
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
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message || 'Failed to register company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 min-h-screen">
      <div className="max-w-2xl w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Create Your Shop / Créer mon magasin
          </h1>
          <p className="text-muted-foreground">
            Create your company account and get started
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              Create your company and owner account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {/* Company Information */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 pb-2 border-b">
                    Company Information
                  </h2>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      rules={{ required: 'Company name is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Company Name{' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="My Auto Parts Store"
                              disabled={loading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyEmail"
                      rules={{
                        required: 'Company email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Company Email{' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="company@example.com"
                              disabled={loading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Phone</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+216 XX XXX XXX"
                              disabled={loading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="TN"
                              disabled={loading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Owner Account */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 pb-2 border-b">
                    Owner Account
                  </h2>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="ownerFullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Doe"
                              disabled={loading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerEmail"
                      rules={{
                        required: 'Email address is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email Address{' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              disabled={loading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerPassword"
                      rules={{
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Password <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              disabled={loading}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Must be at least 6 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerPasswordConfirm"
                      rules={{
                        required: 'Please confirm your password',
                        validate: value =>
                          value === password || 'Passwords do not match',
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Confirm Password{' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              disabled={loading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating your shop...
                    </>
                  ) : (
                    'Create My Shop'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 pt-6 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Sign In to Your Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
