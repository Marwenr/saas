'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { createProduct } from '../lib/products';
import { fetchBrands, createBrand } from '../lib/brands';
import Input from './Input';

/**
 * NewProductModal component - Simplified modal for creating products from purchase order page
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} onCreated - Callback when product is created, receives the created product
 */
export default function NewProductModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const brandInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
      // Use brandId if available, otherwise use brand name (for backward compatibility or new creation)
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

      // Extract product from response (could be { product } or just the product object)
      const createdProduct = response.product || response;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Ajouter une nouvelle pièce
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Fermer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-4">
            {/* SKU and Name - Required */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  type="text"
                  id="sku"
                  label="SKU"
                  labelSuffix={<span className="text-red-500">*</span>}
                  placeholder="SKU-001"
                  disabled={loading}
                  {...register('sku', {
                    required: 'SKU is required',
                  })}
                />
                {errors.sku && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.sku.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  type="text"
                  id="name"
                  label="Nom"
                  labelSuffix={<span className="text-red-500">*</span>}
                  placeholder="Nom du produit"
                  disabled={loading}
                  {...register('name', {
                    required: 'Name is required',
                  })}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Brand */}
            <div className="relative" ref={brandInputRef}>
              <Input
                type="text"
                id="brand"
                label="Marque"
                placeholder="Rechercher ou ajouter une marque"
                disabled={loading}
                value={brand}
                onChange={handleBrandChange}
                autoComplete="off"
              />
              {showBrandSuggestions && brandSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {brandSuggestions.map(brandItem => (
                    <button
                      key={brandItem._id}
                      type="button"
                      onClick={() => handleBrandSelect(brandItem)}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors"
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
                    className="absolute z-50 w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={handleBrandCreate}
                      className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors flex items-center gap-2"
                    >
                      <span>+</span>
                      <span>Ajouter &quot;{brandSearchTerm.trim()}&quot;</span>
                    </button>
                  </div>
                )}
            </div>

            {/* Prices */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  id="purchasePrice"
                  label="Prix d'achat (HT) (TND)"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={loading}
                  {...register('purchasePrice', {
                    min: { value: 0, message: 'Must be >= 0' },
                    valueAsNumber: true,
                  })}
                />
                <Input
                  type="number"
                  id="marginRate"
                  label="Taux de gain (%)"
                  labelSuffix={
                    <span className="text-gray-500 text-xs">(marginRate)</span>
                  }
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  id="salePrice"
                  label="Prix de vente (HT) (TND)"
                  labelSuffix={
                    <span className="text-gray-500 text-xs ml-2">
                      (calculé automatiquement)
                    </span>
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={loading}
                  {...register('salePrice', {
                    min: { value: 0, message: 'Must be >= 0' },
                    valueAsNumber: true,
                  })}
                />
                <Input
                  type="number"
                  id="taxRate"
                  label="Taux de TVA (%)"
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

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
