'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createUser, updateUser } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from './ui/use-toast';

/**
 * UserForm component - Modal form for creating/editing users
 */
export default function UserForm({ user, onClose, onSuccess, open = true }) {
  const isEditing = !!user;
  const { toast } = useToast();
  const [error, setError] = useState(null);

  const form = useForm({
    defaultValues: {
      email: '',
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      name: '',
      role: 'cashier',
    },
  });

  const newPassword = form.watch('newPassword');
  const confirmPassword = form.watch('confirmPassword');

  // Load user data if editing
  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        name: user.name || '',
        role: user.role || 'cashier',
      });
    } else {
      form.reset({
        email: '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        name: '',
        role: 'cashier',
      });
    }
  }, [user, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setError(null);
    }
  }, [open, form]);

  const onSubmit = async data => {
    setError(null);

    try {
      // Validate required fields
      if (!data.email) {
        throw new Error('Email is required');
      }

      // For new users, password is required
      if (!isEditing) {
        if (!data.newPassword) {
          throw new Error('Mot de passe requis');
        }
        if (data.newPassword.length < 6) {
          throw new Error(
            'Le mot de passe doit contenir au moins 6 caractères'
          );
        }
        if (data.newPassword !== data.confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
      }

      // For editing, if changing password, validate old password and new password
      if (isEditing && data.newPassword) {
        if (!data.oldPassword) {
          throw new Error(
            "L'ancien mot de passe est requis pour changer le mot de passe"
          );
        }
        if (data.newPassword.length < 6) {
          throw new Error(
            'Le nouveau mot de passe doit contenir au moins 6 caractères'
          );
        }
        if (data.newPassword !== data.confirmPassword) {
          throw new Error('Les nouveaux mots de passe ne correspondent pas');
        }
      }

      const payload = {
        email: data.email.trim(),
        name: data.name.trim() || undefined,
        role: data.role,
      };

      // For new users, send the password
      if (!isEditing) {
        payload.password = data.newPassword;
      }

      // For editing, send old and new password if changing
      if (isEditing && data.newPassword) {
        payload.oldPassword = data.oldPassword;
        payload.newPassword = data.newPassword;
      }

      if (isEditing) {
        await updateUser(user.id, payload);
        toast({
          title: 'User updated',
          description: `User "${payload.email}" has been updated successfully.`,
        });
      } else {
        await createUser(payload);
        toast({
          title: 'User created',
          description: `User "${payload.email}" has been created successfully.`,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Failed to save user:', err);
      setError(err.message || 'Failed to save user');
    }
  };

  const roleLabels = {
    manager: 'Manager',
    cashier: 'Caissier',
    storekeeper: 'Magasinier',
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de l'utilisateur"
              : 'Créez un nouvel utilisateur avec les informations requises'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  rules={{ required: 'Email is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom complet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Rôle <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isEditing && user?.role === 'owner'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manager">
                            {roleLabels.manager}
                          </SelectItem>
                          <SelectItem value="cashier">
                            {roleLabels.cashier}
                          </SelectItem>
                          <SelectItem value="storekeeper">
                            {roleLabels.storekeeper}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {isEditing && user?.role === 'owner' && (
                        <FormDescription>
                          Le rôle owner ne peut pas être modifié
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password fields - different for new user vs editing */}
                {isEditing ? (
                  <>
                    <FormField
                      control={form.control}
                      name="oldPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Ancien mot de passe{' '}
                            {newPassword && (
                              <span className="text-destructive">*</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Ancien mot de passe"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Requis uniquement si vous changez le mot de passe
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Nouveau mot de passe (optionnel)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Laisser vide pour ne pas changer"
                              minLength={6}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Laisser vide si vous ne souhaitez pas changer le mot
                            de passe
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {newPassword && (
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Confirmer le nouveau mot de passe{' '}
                              {newPassword && (
                                <span className="text-destructive">*</span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirmer le nouveau mot de passe"
                                minLength={6}
                                {...field}
                              />
                            </FormControl>
                            {confirmPassword &&
                              newPassword !== confirmPassword && (
                                <p className="text-sm text-destructive">
                                  Les mots de passe ne correspondent pas
                                </p>
                              )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="newPassword"
                      rules={{
                        required: 'Mot de passe requis',
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
                              placeholder="Minimum 6 caractères"
                              minLength={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      rules={{
                        required: 'Confirmation du mot de passe requise',
                        validate: value =>
                          value === newPassword ||
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
                              placeholder="Confirmer le mot de passe"
                              minLength={6}
                              {...field}
                            />
                          </FormControl>
                          {confirmPassword &&
                            newPassword !== confirmPassword && (
                              <p className="text-sm text-destructive">
                                Les mots de passe ne correspondent pas
                              </p>
                            )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Enregistrement...'
                  : isEditing
                    ? 'Modifier'
                    : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
