'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createSupplier, updateSupplier } from '../lib/suppliers';
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
import { Textarea } from './ui/textarea';
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
import { Checkbox } from './ui/checkbox';

/**
 * SupplierForm component - Modal form for creating/editing suppliers
 */
export default function SupplierForm({ supplier, onClose, open = true }) {
  const isEditing = !!supplier;
  const { toast } = useToast();
  const [error, setError] = useState(null);

  const form = useForm({
    defaultValues: {
      name: '',
      contactName: '',
      email: '',
      phone: '',
      taxNumber: '',
      address: '',
      city: '',
      country: 'TN',
      isActive: true,
      notes: '',
    },
  });

  // Load supplier data if editing
  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name || '',
        contactName: supplier.contactName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        taxNumber: supplier.taxNumber || '',
        address: supplier.address || '',
        city: supplier.city || '',
        country: supplier.country || 'TN',
        isActive: supplier.isActive !== undefined ? supplier.isActive : true,
        notes: supplier.notes || '',
      });
    }
  }, [supplier, form]);

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
      const payload = {
        name: data.name.trim(),
        contactName: data.contactName.trim() || undefined,
        email: data.email.trim() || undefined,
        phone: data.phone.trim() || undefined,
        taxNumber: data.taxNumber.trim() || undefined,
        address: data.address.trim() || undefined,
        city: data.city.trim() || undefined,
        country: data.country.trim() || undefined,
        isActive: data.isActive,
        notes: data.notes.trim() || undefined,
      };

      if (!payload.name) {
        throw new Error('Le nom est obligatoire');
      }

      if (isEditing) {
        await updateSupplier(supplier._id || supplier.id, payload);
        toast({
          title: 'Supplier updated',
          description: `Supplier "${payload.name}" has been updated successfully.`,
        });
      } else {
        await createSupplier(payload);
        toast({
          title: 'Supplier created',
          description: `Supplier "${payload.name}" has been created successfully.`,
        });
      }

      onClose();
    } catch (err) {
      console.error('Failed to save supplier:', err);
      setError(err.message || "Échec de l'enregistrement du fournisseur");
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations du fournisseur'
              : 'Créez un nouveau fournisseur avec les informations requises'}
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
                  name="name"
                  rules={{ required: 'Le nom est obligatoire' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nom <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nom du fournisseur" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du contact</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom du contact" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+216 XX XXX XXX"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro fiscal</FormLabel>
                        <FormControl>
                          <Input placeholder="Numéro fiscal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input placeholder="Adresse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input placeholder="Ville" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un pays" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="TN">Tunisie</SelectItem>
                            <SelectItem value="FR">France</SelectItem>
                            <SelectItem value="DZ">Algérie</SelectItem>
                            <SelectItem value="MA">Maroc</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notes supplémentaires"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Fournisseur actif</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
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
                    ? 'Mettre à jour'
                    : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
