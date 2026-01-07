'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { createCustomer, updateCustomer } from '../lib/customers';
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
import { Label } from './ui/label';
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Plus, Trash2 } from 'lucide-react';

/**
 * CustomerForm component - Modal form for creating/editing customers
 */
export default function CustomerForm({ customer, onClose, open = true }) {
  const isEditing = !!customer;
  const { toast } = useToast();
  const [error, setError] = useState(null);

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      phones: [''],
      email: '',
      address: '',
      city: '',
      taxId: '',
      internalCode: '',
      clientType: 'particulier',
      classification: 'vert',
      vehicles: [],
      isActive: true,
      notes: '',
    },
  });

  const {
    fields: phoneFields,
    append: appendPhone,
    remove: removePhone,
  } = useFieldArray({
    control: form.control,
    name: 'phones',
  });

  const {
    fields: vehicleFields,
    append: appendVehicle,
    remove: removeVehicle,
  } = useFieldArray({
    control: form.control,
    name: 'vehicles',
  });

  // Load customer data if editing
  useEffect(() => {
    if (customer) {
      form.reset({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        phones:
          customer.phones && customer.phones.length > 0
            ? customer.phones
            : [''],
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        taxId: customer.taxId || '',
        internalCode: customer.internalCode || '',
        clientType: customer.clientType || 'particulier',
        classification: customer.classification || 'vert',
        vehicles: customer.vehicles || [],
        isActive: customer.isActive !== undefined ? customer.isActive : true,
        notes: customer.notes || '',
      });
    }
  }, [customer, form]);

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
      const phonesArray = data.phones.filter(p => p && p.trim());
      const vehiclesArray = data.vehicles
        .map(v => ({
          vin: v.vin?.trim() || '',
          brand: v.brand?.trim() || '',
          model: v.model?.trim() || '',
          year: parseInt(v.year) || new Date().getFullYear(),
          engine: v.engine?.trim() || undefined,
          fuelType: v.fuelType || 'essence',
          mileage: v.mileage ? parseInt(v.mileage) : undefined,
          acquisitionDate: v.acquisitionDate || undefined,
        }))
        .filter(v => v.vin && v.brand && v.model);

      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phones: phonesArray,
        email: data.email.trim() || undefined,
        address: data.address.trim() || undefined,
        city: data.city.trim() || undefined,
        taxId: data.taxId.trim() || undefined,
        internalCode: data.internalCode.trim() || undefined,
        clientType: data.clientType,
        classification: data.classification,
        vehicles: vehiclesArray,
        isActive: data.isActive,
        notes: data.notes.trim() || undefined,
      };

      if (!payload.firstName || !payload.lastName) {
        throw new Error('Le prénom et le nom sont obligatoires');
      }

      if (isEditing) {
        await updateCustomer(customer._id || customer.id, payload);
        toast({
          title: 'Customer updated',
          description: `Customer "${payload.firstName} ${payload.lastName}" has been updated successfully.`,
        });
      } else {
        await createCustomer(payload);
        toast({
          title: 'Customer created',
          description: `Customer "${payload.firstName} ${payload.lastName}" has been created successfully.`,
        });
      }

      if (typeof onClose === 'function') {
        onClose(true);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save customer:', err);
      setError(err.message || "Échec de l'enregistrement du client");
    }
  };

  const classificationColors = {
    vert: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    jaune:
      'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    rouge: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    noir: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le client' : 'Ajouter un client'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations du client'
              : 'Créez un nouveau client avec les informations requises'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Informations de base
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        rules={{ required: 'Prénom is required' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Prénom <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Prénom" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        rules={{ required: 'Nom is required' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Nom <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Nom" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phones"
                      render={() => (
                        <FormItem>
                          <FormLabel>Téléphones</FormLabel>
                          <div className="space-y-2">
                            {phoneFields.map((field, index) => (
                              <div key={field.id} className="flex gap-2">
                                <FormField
                                  control={form.control}
                                  name={`phones.${index}`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
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
                                {phoneFields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => removePhone(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => appendPhone('')}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter un téléphone
                            </Button>
                          </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Matricule fiscale</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Matricule fiscale"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="internalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code interne (ID)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Généré automatiquement si vide"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Généré automatiquement si vide
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="clientType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Type de client{' '}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="particulier">
                                  Particulier
                                </SelectItem>
                                <SelectItem value="professionnel">
                                  Professionnel
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="classification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Classification</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une classification" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="vert">Vert</SelectItem>
                                <SelectItem value="jaune">Jaune</SelectItem>
                                <SelectItem value="rouge">Rouge</SelectItem>
                                <SelectItem value="noir">Noir</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Voitures</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          appendVehicle({
                            vin: '',
                            brand: '',
                            model: '',
                            year: new Date().getFullYear(),
                            engine: '',
                            fuelType: 'essence',
                            mileage: '',
                            acquisitionDate: '',
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une voiture
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {vehicleFields.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune voiture ajoutée
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {vehicleFields.map((field, index) => (
                          <Card key={field.id} className="border shadow-sm">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                  Voiture {index + 1}
                                </CardTitle>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeVehicle(index)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.vin`}
                                rules={{ required: 'VIN is required' }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      VIN{' '}
                                      <span className="text-destructive">
                                        *
                                      </span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="VIN"
                                        {...field}
                                        onChange={e =>
                                          field.onChange(
                                            e.target.value.toUpperCase()
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.brand`}
                                rules={{ required: 'Brand is required' }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Marque{' '}
                                      <span className="text-destructive">
                                        *
                                      </span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input placeholder="Marque" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.model`}
                                rules={{ required: 'Model is required' }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Modèle{' '}
                                      <span className="text-destructive">
                                        *
                                      </span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input placeholder="Modèle" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.year`}
                                rules={{ required: 'Year is required' }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Année{' '}
                                      <span className="text-destructive">
                                        *
                                      </span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="Année"
                                        min="1900"
                                        max={new Date().getFullYear() + 1}
                                        {...field}
                                        value={
                                          field.value ||
                                          new Date().getFullYear()
                                        }
                                        onChange={e =>
                                          field.onChange(
                                            parseInt(e.target.value)
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.engine`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Moteur</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Moteur" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.fuelType`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Carburant</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value || 'essence'}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Sélectionner un carburant" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="essence">
                                          Essence
                                        </SelectItem>
                                        <SelectItem value="diesel">
                                          Diesel
                                        </SelectItem>
                                        <SelectItem value="hybride">
                                          Hybride
                                        </SelectItem>
                                        <SelectItem value="electrique">
                                          Électrique
                                        </SelectItem>
                                        <SelectItem value="gpl">GPL</SelectItem>
                                        <SelectItem value="autre">
                                          Autre
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.mileage`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Kilométrage</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="Kilométrage"
                                        min="0"
                                        {...field}
                                        value={field.value || ''}
                                        onChange={e =>
                                          field.onChange(
                                            e.target.value
                                              ? parseInt(e.target.value)
                                              : ''
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.acquisitionDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Date d'acquisition</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
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
                  </CardContent>
                </Card>

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
                        <FormLabel>Client actif</FormLabel>
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
