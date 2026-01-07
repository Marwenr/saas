'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { createProduct, updateProduct } from '../lib/products';
import { fetchBrands, createBrand } from '../lib/brands';
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
 * ProductForm component - Modal form for creating/editing products
 */
export default function ProductForm({
  product,
  onClose,
  onCreated,
  open = true,
}) {
  const isEditing = !!product;
  const { toast } = useToast();
  const [error, setError] = useState(null);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const brandInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const form = useForm({
    defaultValues: {
      sku: '',
      name: '',
      brand: '',
      brandId: null,
      manufacturerRef: '',
      category: '',
      salePrice: '',
      description: '',
      oemRefs: '',
      purchasePrice: '',
      taxRate: '19.00',
      marginRate: '20.00',
      isActive: true,
    },
  });

  const purchasePrice = form.watch('purchasePrice');
  const marginRate = form.watch('marginRate');
  const taxRate = form.watch('taxRate');
  const brand = form.watch('brand');

  // Load product data if editing
  useEffect(() => {
    if (product) {
      const oemRefsString =
        product.oemRefs && Array.isArray(product.oemRefs)
          ? product.oemRefs.filter(ref => ref && ref.trim()).join(', ')
          : '';

      form.reset({
        sku: product.sku || '',
        name: product.name || '',
        brand: product.brand?.name || product.brand || '',
        brandId: product.brand?._id || product.brand || null,
        manufacturerRef: product.manufacturerRef || '',
        category: product.category || '',
        salePrice:
          product.salePrice !== undefined && product.salePrice !== null
            ? parseFloat(product.salePrice).toFixed(2)
            : '',
        description: product.description || '',
        oemRefs: oemRefsString,
        purchasePrice:
          product.purchasePrice !== undefined && product.purchasePrice !== null
            ? parseFloat(product.purchasePrice).toFixed(2)
            : '',
        taxRate:
          product.taxRate !== undefined && product.taxRate !== null
            ? parseFloat(product.taxRate).toFixed(2)
            : '19.00',
        marginRate:
          product.marginRate !== undefined && product.marginRate !== null
            ? parseFloat(product.marginRate).toFixed(2)
            : '20.00',
        isActive: product.isActive !== undefined ? product.isActive : true,
      });
    }
  }, [product, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setError(null);
      setBrandSuggestions([]);
      setShowBrandSuggestions(false);
      setBrandSearchTerm('');
    }
  }, [open, form]);

  // Fetch brand suggestions
  useEffect(() => {
    const searchBrands = async () => {
      if (brandSearchTerm.trim().length > 0) {
        try {
          const response = await fetchBrands({ search: brandSearchTerm });
          setBrandSuggestions(response.brands || []);
          setShowBrandSuggestions(true);
        } catch (err) {
          console.error('Failed to fetch brands:', err);
          setBrandSuggestions([]);
        }
      } else {
        setBrandSuggestions([]);
        setShowBrandSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(searchBrands, 300);
    return () => clearTimeout(debounceTimer);
  }, [brandSearchTerm]);

  // Auto-calculate salePrice
  useEffect(() => {
    const purchase = parseFloat(purchasePrice) || 0;
    const margin = parseFloat(marginRate) || 0;
    const tax = parseFloat(taxRate) || 19;

    if (purchase > 0 && !isNaN(purchase)) {
      const priceHT =
        purchase > 0 && margin > 0 ? purchase * (1 + margin / 100) : purchase;
      const priceTTC = priceHT > 0 ? priceHT * (1 + tax / 100) : 0;

      if (priceTTC > 0) {
        form.setValue('salePrice', priceTTC.toFixed(2), { shouldDirty: false });
      }
    }
  }, [purchasePrice, marginRate, taxRate, form]);

  const handleBrandChange = value => {
    setBrandSearchTerm(value);
    form.setValue('brand', value);
    form.setValue('brandId', null);
  };

  const handleBrandSelect = selectedBrand => {
    form.setValue('brand', selectedBrand.name);
    form.setValue('brandId', selectedBrand._id);
    setBrandSearchTerm(selectedBrand.name);
    setShowBrandSuggestions(false);
  };

  const handleBrandCreate = async () => {
    if (!brandSearchTerm.trim()) return;

    try {
      const response = await createBrand({ name: brandSearchTerm.trim() });
      const newBrand = response.brand;
      handleBrandSelect(newBrand);
      toast({
        title: 'Brand created',
        description: `Brand "${newBrand.name}" has been created.`,
      });
    } catch (err) {
      console.error('Failed to create brand:', err);
      setError(err.message || 'Échec de la création de la marque');
    }
  };

  const onSubmit = async data => {
    setError(null);

    try {
      const brandPayload = data.brandId || data.brand.trim() || undefined;

      const payload = {
        sku: data.sku.trim(),
        name: data.name.trim(),
        brand: brandPayload,
        manufacturerRef: data.manufacturerRef.trim() || undefined,
        category: data.category.trim() || undefined,
        salePrice: parseFloat(data.salePrice),
        description: data.description.trim() || undefined,
        oemRefs: data.oemRefs.trim() || undefined,
        purchasePrice: data.purchasePrice
          ? parseFloat(data.purchasePrice)
          : undefined,
        taxRate: data.taxRate ? parseFloat(data.taxRate) : 19,
        marginRate: data.marginRate ? parseFloat(data.marginRate) : 20,
        isActive: data.isActive,
      };

      if (
        !payload.sku ||
        !payload.name ||
        isNaN(payload.salePrice) ||
        payload.salePrice < 0
      ) {
        throw new Error('SKU, nom et prix de vente sont obligatoires');
      }

      let result;
      if (isEditing) {
        await updateProduct(product._id || product.id, payload);
        toast({
          title: 'Product updated',
          description: `Product "${payload.name}" has been updated successfully.`,
        });
      } else {
        result = await createProduct(payload);
        const createdProduct = result.product || result;
        toast({
          title: 'Product created',
          description: `Product "${createdProduct.name}" has been created successfully.`,
        });
        if (onCreated) {
          onCreated(createdProduct);
        }
      }

      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      setError(err.message || "Échec de l'enregistrement du produit");
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la pièce' : 'Ajouter une pièce'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations du produit'
              : 'Créez un nouveau produit avec les informations requises'}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sku"
                    rules={{ required: 'SKU is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          SKU <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="SKU-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: 'Name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nom <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Nom du produit" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marque</FormLabel>
                        <FormControl>
                          <div className="relative" ref={brandInputRef}>
                            <Input
                              placeholder="Rechercher ou ajouter une marque"
                              {...field}
                              value={brand}
                              onChange={e => handleBrandChange(e.target.value)}
                              autoComplete="off"
                            />
                            {showBrandSuggestions &&
                              brandSuggestions.length > 0 && (
                                <div
                                  ref={suggestionsRef}
                                  className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                                >
                                  {brandSuggestions.map(brandItem => (
                                    <button
                                      key={brandItem._id}
                                      type="button"
                                      onClick={() =>
                                        handleBrandSelect(brandItem)
                                      }
                                      className="w-full text-left px-4 py-2 hover:bg-accent text-foreground transition-colors"
                                    >
                                      {brandItem.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            {showBrandSuggestions &&
                              brandSearchTerm.trim() &&
                              brandSuggestions.length === 0 && (
                                <div
                                  ref={suggestionsRef}
                                  className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg"
                                >
                                  <button
                                    type="button"
                                    onClick={handleBrandCreate}
                                    className="w-full text-left px-4 py-2 hover:bg-accent text-foreground transition-colors flex items-center gap-2"
                                  >
                                    <span>+</span>
                                    <span>
                                      Ajouter &quot;{brandSearchTerm.trim()}
                                      &quot;
                                    </span>
                                  </button>
                                </div>
                              )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégorie</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Freinage" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="manufacturerRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence fabricant</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Valeo 123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oemRefs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Références OEM</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Séparées par des virgules, ex: REF1, REF2"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Séparez plusieurs références par des virgules
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Description du produit"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix d'achat (HT) (TND)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="marginRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Taux de gain (%){' '}
                            <span className="text-xs text-muted-foreground">
                              (marginRate)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="20"
                              min="0"
                              step="0.01"
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
                      name="salePrice"
                      rules={{
                        required: 'Sale price is required',
                        min: { value: 0, message: 'Must be >= 0' },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Prix de vente (TTC) (TND){' '}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            (calculé automatiquement avec TVA)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taux de TVA (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              min="0"
                              max="100"
                              step="0.01"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

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
                        <FormLabel>Produit actif</FormLabel>
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
