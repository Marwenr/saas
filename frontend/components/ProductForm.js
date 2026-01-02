'use client';

import { useState, useEffect, useRef } from 'react';
import { createProduct, updateProduct } from '../lib/products';
import { fetchBrands, createBrand } from '../lib/brands';
import Input from './Input';

/**
 * ProductForm component - Modal form for creating/editing products
 * @param {Object} product - Product to edit (optional, if not provided, creates new product)
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} onCreated - Optional callback when product is created, receives the created product
 */
export default function ProductForm({ product, onClose, onCreated }) {
  const isEditing = !!product;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const brandInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [formData, setFormData] = useState({
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
  });

  // Load product data if editing
  useEffect(() => {
    if (product) {
      // Convert oemRefs array to comma-separated string for display
      const oemRefsString =
        product.oemRefs && Array.isArray(product.oemRefs)
          ? product.oemRefs.filter(ref => ref && ref.trim()).join(', ')
          : '';

      setFormData({
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
  }, [product]);

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

  // Auto-calculate salePrice
  // Calculation:
  // priceHT = purchasePrice * (1 + marginRate / 100) - price HT with gain
  // priceTTC = priceHT * (1 + taxRate / 100) - final price with tax
  useEffect(() => {
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const marginRate = parseFloat(formData.marginRate) || 0;
    const taxRate = parseFloat(formData.taxRate) || 19; // Default to 19% if not set

    // Only auto-calculate if purchasePrice is provided and valid
    if (purchasePrice > 0 && !isNaN(purchasePrice)) {
      // Calculate price HT with gain (marginRate)
      const priceHT =
        purchasePrice > 0 && marginRate > 0
          ? purchasePrice * (1 + marginRate / 100)
          : purchasePrice;

      // Add tax (taxRate)
      const priceTTC = priceHT > 0 ? priceHT * (1 + taxRate / 100) : 0;

      if (priceTTC > 0) {
        setFormData(prev => ({
          ...prev,
          salePrice: priceTTC.toFixed(2),
        }));
      }
    } else if (purchasePrice === 0 || formData.purchasePrice === '') {
      // If purchasePrice is cleared, keep salePrice as is (user can still edit manually)
      // Don't reset it to empty
    }
  }, [formData.purchasePrice, formData.marginRate, formData.taxRate]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;

    // Special handling for brand input
    if (name === 'brand') {
      setBrandSearchTerm(value);
      setFormData(prev => ({
        ...prev,
        brand: value,
        brandId: null, // Reset brandId when user types
      }));
      return;
    }

    // If user manually changes salePrice, don't auto-calculate
    // Otherwise, let the useEffect handle the calculation
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBrandSelect = brand => {
    setFormData(prev => ({
      ...prev,
      brand: brand.name,
      brandId: brand._id,
    }));
    setBrandSearchTerm(brand.name);
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

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Prepare payload
      // Use brandId if available, otherwise use brand name (for backward compatibility or new creation)
      const brandPayload =
        formData.brandId || formData.brand.trim() || undefined;

      const payload = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        brand: brandPayload,
        manufacturerRef: formData.manufacturerRef.trim() || undefined,
        category: formData.category.trim() || undefined,
        salePrice: parseFloat(formData.salePrice),
        description: formData.description.trim() || undefined,
        oemRefs: formData.oemRefs.trim() || undefined, // Backend will normalize to array
        purchasePrice: formData.purchasePrice
          ? parseFloat(formData.purchasePrice)
          : undefined,
        taxRate: formData.taxRate ? parseFloat(formData.taxRate) : 19,
        marginRate: formData.marginRate ? parseFloat(formData.marginRate) : 20,
        isActive: formData.isActive,
      };

      // Validate required fields
      if (
        !payload.sku ||
        !payload.name ||
        isNaN(payload.salePrice) ||
        payload.salePrice < 0
      ) {
        throw new Error('SKU, nom et prix de vente sont obligatoires');
      }

      if (isEditing) {
        await updateProduct(product._id || product.id, payload);
      } else {
        const response = await createProduct(payload);
        // Extract product from response (could be { product } or just the product object)
        const createdProduct = response.product || response;
        // Call onCreated callback if provided
        if (onCreated) {
          onCreated(createdProduct);
        }
      }

      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      setError(err.message || "Échec de l'enregistrement du produit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {isEditing ? 'Modifier la pièce' : 'Ajouter une pièce'}
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
        <form onSubmit={handleSubmit} className="p-6">
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
              <Input
                type="text"
                id="sku"
                name="sku"
                label="SKU"
                labelSuffix={<span className="text-red-500">*</span>}
                value={formData.sku}
                onChange={handleChange}
                placeholder="SKU-001"
                required
                disabled={loading}
              />
              <Input
                type="text"
                id="name"
                name="name"
                label="Nom"
                labelSuffix={<span className="text-red-500">*</span>}
                value={formData.name}
                onChange={handleChange}
                placeholder="Nom du produit"
                required
                disabled={loading}
              />
            </div>

            {/* Brand and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative" ref={brandInputRef}>
                <Input
                  type="text"
                  id="brand"
                  name="brand"
                  label="Marque"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Rechercher ou ajouter une marque"
                  disabled={loading}
                  autoComplete="off"
                />
                {showBrandSuggestions && brandSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {brandSuggestions.map(brand => (
                      <button
                        key={brand._id}
                        type="button"
                        onClick={() => handleBrandSelect(brand)}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors"
                      >
                        {brand.name}
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
                        <span>
                          Ajouter &quot;{brandSearchTerm.trim()}&quot;
                        </span>
                      </button>
                    </div>
                  )}
              </div>
              <Input
                type="text"
                id="category"
                name="category"
                label="Catégorie"
                value={formData.category}
                onChange={handleChange}
                placeholder="Ex: Freinage"
                disabled={loading}
              />
            </div>

            {/* Manufacturer Reference */}
            <Input
              type="text"
              id="manufacturerRef"
              name="manufacturerRef"
              label="Référence fabricant"
              value={formData.manufacturerRef}
              onChange={handleChange}
              placeholder="Ex: Valeo 123456, Bosch 0 123 456 789"
              disabled={loading}
            />

            {/* OEM References */}
            <div>
              <Input
                type="text"
                id="oemRefs"
                name="oemRefs"
                label="Références OEM"
                value={formData.oemRefs}
                onChange={handleChange}
                placeholder="Séparées par des virgules, ex: REF1, REF2, REF3"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Séparez plusieurs références par des virgules
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Description du produit"
              />
            </div>

            {/* Prices */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  id="purchasePrice"
                  name="purchasePrice"
                  label="Prix d'achat (HT) (TND)"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
                <Input
                  type="number"
                  id="marginRate"
                  name="marginRate"
                  label="Taux de gain (%)"
                  labelSuffix={
                    <span className="text-gray-500 text-xs">(marginRate)</span>
                  }
                  value={formData.marginRate}
                  onChange={handleChange}
                  placeholder="20"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  id="salePrice"
                  name="salePrice"
                  label="Prix de vente (TTC) (TND)"
                  labelSuffix={
                    <>
                      <span className="text-red-500">*</span>{' '}
                      <span className="text-gray-500 text-xs ml-2">
                        (calculé automatiquement avec TVA)
                      </span>
                    </>
                  }
                  value={formData.salePrice}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
                <Input
                  type="number"
                  id="taxRate"
                  name="taxRate"
                  label="Taux de TVA (%)"
                  value={formData.taxRate}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Active status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                id="isActive"
                className="w-4 h-4 text-primary-600 border-[var(--border-color)] rounded focus:ring-primary-500"
              />
              <label
                htmlFor="isActive"
                className="ml-2 text-sm font-medium text-[var(--text-primary)]"
              >
                Produit actif
              </label>
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
              {loading
                ? 'Enregistrement...'
                : isEditing
                  ? 'Mettre à jour'
                  : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
