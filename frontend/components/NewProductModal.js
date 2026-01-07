'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { createProduct } from '../lib/products';
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
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from './ui/use-toast';

/**
 * NewProductModal component - Simplified modal for creating products from purchase order page
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} onCreated - Callback when product is created, receives the created product
 * @param {boolean} open - Whether the modal is open
 */
export default function NewProductModal({ onClose, onCreated, open = true }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const brandInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      sku: '',
      name: '',
      brand: '',
      brandId: null,
      purchasePrice: '',
      salePrice: '',
      taxRate: '0',
      marginRate: '0',
    },
  });

  const purchasePrice = watch('purchasePrice');
  const marginRate = watch('marginRate');
  const brand = watch('brand');

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setError(null);
      setBrandSuggestions([]);
      setShowBrandSuggestions(false);
      setBrandSearchTerm('');
    }
  }, [open, reset]);

  // Fetch brand suggestions when search term changes
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        brandInputRef.current &&
        !brandInputRef.current.contains(event.target)
      ) {
        setShowBrandSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-calculate salePrice when purchasePrice or marginRate changes
  useEffect(() => {
    const price = parseFloat(purchasePrice);
    const margin = parseFloat(marginRate) || 0;

    // Only auto-calculate if purchasePrice is provided and valid
    if (price > 0 && !isNaN(price) && margin >= 0) {
      const calculatedSalePrice = price * (1 + margin / 100);
      setValue('salePrice', calculatedSalePrice.toFixed(2));
    }
  }, [purchasePrice, marginRate, setValue]);

  const handleBrandChange = e => {
    const value = e.target.value;
    setBrandSearchTerm(value);
    setValue('brand', value);
    setValue('brandId', null); // Reset brandId when user types
  };

  const handleBrandSelect = selectedBrand => {
    setValue('brand', selectedBrand.name);
    setValue('brandId', selectedBrand._id);
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
    setLoading(true);

    try {
      // Prepare payload
      const brandPayload = data.brandId || data.brand.trim() || undefined;

      const payload = {
        sku: data.sku.trim(),
        name: data.name.trim(),
        brand: brandPayload,
        purchasePrice: data.purchasePrice
          ? parseFloat(data.purchasePrice)
          : undefined,
        salePrice: data.salePrice ? parseFloat(data.salePrice) : undefined,
        taxRate: data.taxRate ? parseFloat(data.taxRate) : 0,
        marginRate: data.marginRate ? parseFloat(data.marginRate) : 0,
      };

      // Validate required fields
      if (!payload.sku || !payload.name) {
        throw new Error('SKU et nom sont obligatoires');
      }

      if (
        payload.salePrice !== undefined &&
        (isNaN(payload.salePrice) || payload.salePrice < 0)
      ) {
        throw new Error('Le prix de vente doit être un nombre positif');
      }

      if (
        payload.purchasePrice !== undefined &&
        (isNaN(payload.purchasePrice) || payload.purchasePrice < 0)
      ) {
        throw new Error("Le prix d'achat doit être un nombre positif");
      }

      // Create product
      const response = await createProduct(payload);

      // Extract product from response
      const createdProduct = response.product || response;

      // Show success toast
      toast({
        title: 'Product created',
        description: `Product "${createdProduct.name}" has been created successfully.`,
      });

      // Call onCreated callback with the created product
      if (onCreated) {
        onCreated(createdProduct);
      }

      // Close modal
      onClose();
    } catch (err) {
      console.error('Failed to create product:', err);
      setError(err.message || 'Échec de la création du produit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle pièce</DialogTitle>
          <DialogDescription>
            Créez un nouveau produit avec les informations requises.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Error message */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Form fields */}
              <div className="space-y-4">
                {/* SKU and Name - Required */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">
                      SKU <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="sku"
                      placeholder="SKU-001"
                      disabled={loading}
                      {...register('sku', {
                        required: 'SKU is required',
                      })}
                    />
                    {errors.sku && (
                      <p className="text-sm text-destructive">
                        {errors.sku.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nom <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="name"
                      placeholder="Nom du produit"
                      disabled={loading}
                      {...register('name', {
                        required: 'Name is required',
                      })}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <Label htmlFor="brand">Marque</Label>
                  <div className="relative" ref={brandInputRef}>
                    <Input
                      type="text"
                      id="brand"
                      placeholder="Rechercher ou ajouter une marque"
                      disabled={loading}
                      value={brand}
                      onChange={handleBrandChange}
                      autoComplete="off"
                    />
                    {showBrandSuggestions && brandSuggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {brandSuggestions.map(brandItem => (
                          <button
                            key={brandItem._id}
                            type="button"
                            onClick={() => handleBrandSelect(brandItem)}
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
                              Ajouter &quot;{brandSearchTerm.trim()}&quot;
                            </span>
                          </button>
                        </div>
                      )}
                  </div>
                </div>

                {/* Prices */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchasePrice">
                        Prix d&apos;achat (HT) (TND)
                      </Label>
                      <Input
                        type="number"
                        id="purchasePrice"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={loading}
                        {...register('purchasePrice', {
                          min: { value: 0, message: 'Must be >= 0' },
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marginRate">
                        Taux de gain (%){' '}
                        <span className="text-xs text-muted-foreground">
                          (marginRate)
                        </span>
                      </Label>
                      <Input
                        type="number"
                        id="marginRate"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        disabled={loading}
                        {...register('marginRate', {
                          min: { value: 0, message: 'Must be >= 0' },
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salePrice">
                        Prix de vente (HT) (TND){' '}
                        <span className="text-xs text-muted-foreground">
                          (calculé automatiquement)
                        </span>
                      </Label>
                      <Input
                        type="number"
                        id="salePrice"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={loading}
                        {...register('salePrice', {
                          min: { value: 0, message: 'Must be >= 0' },
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Taux de TVA (%)</Label>
                      <Input
                        type="number"
                        id="taxRate"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                        disabled={loading}
                        {...register('taxRate', {
                          min: { value: 0, message: 'Must be >= 0' },
                          max: { value: 100, message: 'Must be <= 100' },
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
