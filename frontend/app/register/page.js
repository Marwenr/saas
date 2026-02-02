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
      setError(
        err.message ||
          "Échec de l'inscription de l'entreprise. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 min-h-screen">
      <div className="max-w-2xl w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Créer votre magasin</h1>
          <p className="text-muted-foreground">
            Créez votre compte entreprise et commencez
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inscription</CardTitle>
            <CardDescription>
              Créez votre entreprise et votre compte propriétaire
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
                    Informations de l&apos;entreprise
                  </h2>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      rules={{ required: "Le nom de l'entreprise est requis" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Nom de l&apos;entreprise{' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Mon magasin de pièces auto"
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
                        required: "L'email de l'entreprise est requis",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Adresse email invalide',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email de l&apos;entreprise{' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="entreprise@exemple.com"
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
                          <FormLabel>Téléphone de l&apos;entreprise</FormLabel>
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
                          <FormLabel>Pays</FormLabel>
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
                    Compte propriétaire
                  </h2>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="ownerFullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom complet</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Jean Dupont"
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
                        required: "L'adresse email est requise",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Adresse email invalide',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Adresse email{' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="vous@exemple.com"
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
                        required: 'Le mot de passe est requis',
                        minLength: {
                          value: 6,
                          message:
                            'Le mot de passe doit contenir au moins 6 caractères',
                        },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Mot de passe{' '}
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
                          <FormDescription>
                            Doit contenir au moins 6 caractères
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerPasswordConfirm"
                      rules={{
                        required: 'Veuillez confirmer votre mot de passe',
                        validate: value =>
                          value === password ||
                          'Les mots de passe ne correspondent pas',
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Confirmer le mot de passe{' '}
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
                      Création de votre magasin...
                    </>
                  ) : (
                    'Créer mon magasin'
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
                Se connecter à votre compte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
