'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  queueInfo = null, // { current: 1, total: 3 } for showing progress
}) {
  // If product has an _id or id, it's editing, otherwise it's creation with initial data
  const isEditing = !!(product && (product._id || product.id));
  const { toast } = useToast();
  const [error, setError] = useState(null);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const brandInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const form = useForm({
    defaultValues: {
      manufacturerRef: '',
      name: '',
      brand: '',
      brandId: null,
      manufacturerRef: '',
      category: '',
      salePrice: '',
      description: '',
      oemRefs: '',
      purchasePrice: '',
      taxRate: '0.00', // Default to 0, not 19
      marginRate: '40.00',
      isActive: true,
    },
  });

  const purchasePrice = form.watch('purchasePrice');
  const marginRate = form.watch('marginRate');
  const taxRate = form.watch('taxRate');
  const salePrice = form.watch('salePrice');
  const brand = form.watch('brand');

  // Function to recalculate sale price - use form.getValues to get latest values
  const recalculateSalePrice = useCallback(() => {
    const purchaseValue = form.getValues('purchasePrice');
    const marginValue = form.getValues('marginRate');
    const taxValue = form.getValues('taxRate');

    // Use nullish coalescing to only use defaults if value is null/undefined, not if it's 0
    const purchase =
      purchaseValue !== '' &&
      purchaseValue !== null &&
      purchaseValue !== undefined
        ? parseFloat(purchaseValue)
        : 0;
    const margin =
      marginValue !== '' && marginValue !== null && marginValue !== undefined
        ? parseFloat(marginValue)
        : 0;
    const tax =
      taxValue !== '' && taxValue !== null && taxValue !== undefined
        ? parseFloat(taxValue)
        : 0;

    if (purchase > 0 && !isNaN(purchase)) {
      // Calculate price HT: purchasePrice * (1 + marginRate/100)
      const priceHT = purchase * (1 + margin / 100);
      // Calculate price TTC: priceHT * (1 + taxRate/100)
      const priceTTC = priceHT * (1 + tax / 100);

      // Always update salePrice automatically - never set to 0
      if (priceTTC > 0 && !isNaN(priceTTC)) {
        form.setValue('salePrice', priceTTC.toFixed(3), { shouldDirty: false });
      }
    }
  }, [form]);

  // Load product data if editing or if initial data is provided
  useEffect(() => {
    if (product) {
      const oemRefsString =
        product.oemRefs && Array.isArray(product.oemRefs)
          ? product.oemRefs.filter(ref => ref && ref.trim()).join(', ')
          : '';

      form.reset({
        manufacturerRef: product.manufacturerRef || '',
        name: product.name || '',
        brand: product.brand?.name || product.brand || '',
        brandId: product.brand?._id || product.brand || null,
        manufacturerRef: product.manufacturerRef || '',
        category: product.category || '',
        salePrice:
          product.salePrice !== undefined && product.salePrice !== null
            ? parseFloat(product.salePrice).toFixed(3)
            : '',
        description: product.description || '',
        oemRefs: oemRefsString,
        purchasePrice:
          product.purchasePrice !== undefined && product.purchasePrice !== null
            ? parseFloat(product.purchasePrice).toFixed(3)
            : '',
        taxRate:
          product.taxRate !== undefined && product.taxRate !== null
            ? parseFloat(product.taxRate).toFixed(3)
            : '0.000', // Default to 0, not 19
        marginRate:
          product.marginRate !== undefined && product.marginRate !== null
            ? parseFloat(product.marginRate).toFixed(3)
            : '40.000',
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

  // Auto-calculate salePrice whenever purchasePrice, marginRate, or taxRate changes
  useEffect(() => {
    // Small delay to ensure form values are updated
    const timer = setTimeout(() => {
      recalculateSalePrice();
    }, 50);
    return () => clearTimeout(timer);
  }, [purchasePrice, marginRate, taxRate, recalculateSalePrice]);

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
        manufacturerRef: data.manufacturerRef.trim(),
        name: data.name.trim(),
        brand: brandPayload,
        manufacturerRef: data.manufacturerRef.trim() || undefined,
        category: data.category.trim() || undefined,
        // Do NOT send salePrice - it will be calculated on-the-fly from purchasePrice, marginRate, and taxRate
        description: data.description.trim() || undefined,
        oemRefs: data.oemRefs.trim() || undefined,
        purchasePrice: data.purchasePrice
          ? parseFloat(data.purchasePrice)
          : undefined,
        taxRate:
          data.taxRate !== undefined &&
          data.taxRate !== null &&
          data.taxRate !== ''
            ? parseFloat(data.taxRate)
            : 0, // Default to 0, not 19
        marginRate: data.marginRate ? parseFloat(data.marginRate) : 20,
        isActive: data.isActive,
      };

      if (
        !payload.manufacturerRef ||
        !payload.name ||
        !payload.purchasePrice ||
        payload.purchasePrice <= 0
      ) {
        throw new Error(
          "manufacturerRef, nom et prix d'achat sont obligatoires"
        );
      }

      let result;
      if (isEditing) {
        await updateProduct(product._id || product.id, payload);
        toast({
          title: 'Produit mis à jour',
          description: `Le produit "${payload.name}" a été mis à jour avec succès.`,
        });
        onClose();
      } else {
        result = await createProduct(payload);
        const createdProduct = result.product || result;
        toast({
          title: 'Produit créé',
          description: `Le produit "${createdProduct.name}" a été créé avec succès.`,
        });

        // Call onCreated callback first
        if (onCreated) {
          onCreated(createdProduct);
        }

        // Only close if not in queue mode or if it's the last product
        // In queue mode, onCreated will handle moving to next product
        if (!queueInfo || queueInfo.current >= queueInfo.total) {
          onClose();
        }
      }
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
            {isEditing
              ? 'Modifier la pièce'
              : queueInfo
                ? `Créer un nouveau produit (${queueInfo.current}/${queueInfo.total})`
                : 'Ajouter une pièce'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations du produit'
              : queueInfo
                ? `Produit détecté depuis la facture. Complétez les informations manquantes. (${queueInfo.current}/${queueInfo.total})`
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
                    name="manufacturerRef"
                    rules={{ required: 'manufacturerRef is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Référence fabricant{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="REF-001"
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              // Recalculate salePrice after any field change
                              recalculateSalePrice();
                            }}
                          />
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
                          <Input
                            placeholder="Nom du produit"
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              // Recalculate salePrice after any field change
                              recalculateSalePrice();
                            }}
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
                          <FormLabel>Prix d&apos;achat (HT) (TND)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              min="0"
                              step="0.001"
                              {...field}
                              onBlur={() => {
                                field.onBlur();
                                recalculateSalePrice();
                              }}
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
                              step="0.001"
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
                              placeholder="0.000"
                              min="0"
                              step="0.001"
                              {...field}
                              value={field.value || ''}
                              onChange={e => {
                                // Allow manual entry
                                field.onChange(e);
                              }}
                              onBlur={e => {
                                field.onBlur(e);
                                // Always recalculate on blur to ensure it's never 0
                                recalculateSalePrice();
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            (calculé automatiquement - se met à jour après
                            chaque modification)
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
                              step="0.001"
                              {...field}
                              onBlur={() => {
                                field.onBlur();
                                recalculateSalePrice();
                              }}
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

                {/* Detailed Pricing Information */}
                <div className="mt-6 p-4 border border-border rounded-lg bg-muted/30">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Détails des prix
                  </h3>
                  {(() => {
                    const purchase = parseFloat(purchasePrice) || 0;
                    const margin = parseFloat(marginRate) || 0;
                    const tax = parseFloat(taxRate) || 0;
                    const sale = parseFloat(salePrice) || 0;
                    // Use lastPurchasePrice if available (when editing), otherwise use purchasePrice
                    const lastPurchase = product?.lastPurchasePrice
                      ? parseFloat(product.lastPurchasePrice)
                      : purchase;

                    // Calculate price HT (without tax): priceHT = salePriceTTC / (1 + taxRate/100)
                    let priceHT = 0;
                    if (sale > 0 && tax >= 0) {
                      priceHT = sale / (1 + tax / 100);
                    }

                    // Price without margin = purchasePrice (CMP)
                    const priceWithoutMargin = purchase;

                    // Calculate margin amount: priceHT - priceWithoutMargin
                    const marginAmount = priceHT - priceWithoutMargin;

                    // Calculate tax amount: salePriceTTC - priceHT
                    const taxAmount = sale - priceHT;

                    const formatPrice = val => {
                      if (
                        val === undefined ||
                        val === null ||
                        isNaN(val) ||
                        val < 0
                      )
                        return '0.000';
                      return (Math.round(val * 1000) / 1000).toFixed(3);
                    };

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-3 border border-border rounded-lg bg-card">
                          <div className="text-xs text-muted-foreground mb-1">
                            Dernier prix acheté (HT)
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {formatPrice(lastPurchase)} TND
                          </div>
                        </div>
                        <div className="p-3 border border-border rounded-lg bg-card">
                          <div className="text-xs text-muted-foreground mb-1">
                            Prix après CMP (Coût Moyen Pondéré)
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {formatPrice(purchase)} TND
                          </div>
                        </div>
                        <div className="p-3 border border-border rounded-lg bg-card">
                          <div className="text-xs text-muted-foreground mb-1">
                            Prix sans marge de gain
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {formatPrice(priceWithoutMargin)} TND
                          </div>
                        </div>
                        <div className="p-3 border border-border rounded-lg bg-card">
                          <div className="text-xs text-muted-foreground mb-1">
                            Prix HT (sans taxe)
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {formatPrice(priceHT)} TND
                          </div>
                        </div>
                        <div className="p-3 border border-border rounded-lg bg-card">
                          <div className="text-xs text-muted-foreground mb-1">
                            Marge de gain
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {formatPrice(margin)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Montant: {formatPrice(marginAmount)} TND
                          </div>
                        </div>
                        <div className="p-3 border border-border rounded-lg bg-card">
                          <div className="text-xs text-muted-foreground mb-1">
                            Taux de TVA
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {formatPrice(tax)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Montant: {formatPrice(taxAmount)} TND
                          </div>
                        </div>
                        <div className="p-3 border border-border rounded-lg bg-primary/10 col-span-full md:col-span-2 lg:col-span-3">
                          <div className="text-xs text-muted-foreground mb-1">
                            Prix de vente TTC
                          </div>
                          <div className="text-lg font-bold text-foreground">
                            {formatPrice(sale)} TND
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            = {formatPrice(priceWithoutMargin)} TND (CMP) +{' '}
                            {formatPrice(marginAmount)} TND (Marge{' '}
                            {formatPrice(margin)}%) + {formatPrice(taxAmount)}{' '}
                            TND (TVA {formatPrice(tax)}%)
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
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
                    : queueInfo && queueInfo.current < queueInfo.total
                      ? 'Suivante'
                      : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
