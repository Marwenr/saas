'use client';

import { useState, useEffect } from 'react';
import { createProduct, updateProduct } from '../lib/products';
import Input from './Input';

/**
 * ProductForm component - Modal form for creating/editing products
 */
export default function ProductForm({ product, onClose }) {
  const isEditing = !!product;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    brand: '',
    manufacturerRef: '',
    category: '',
    salePrice: '',
    description: '',
    oemRefs: '',
    purchasePrice: '',
    taxRate: '19.00',
    marginRate: '20.00',
    minMarginOnLastPurchase: '10.00',
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
        brand: product.brand || '',
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
        minMarginOnLastPurchase:
          product.minMarginOnLastPurchase !== undefined &&
          product.minMarginOnLastPurchase !== null
            ? parseFloat(product.minMarginOnLastPurchase).toFixed(2)
            : '10.00',
        isActive: product.isActive !== undefined ? product.isActive : true,
      });
    }
  }, [product]);

  // Auto-calculate salePrice using HYBRID pricing mode
  // All 3 parameters are independent and included in the calculation:
  // 1. marginRate (Taux de gain) - applied to purchasePrice
  // 2. minMarginOnLastPurchase (Marge min. sur dernier achat) - protection
  // 3. taxRate (Taux de TVA) - applied to final price
  //
  // Calculation:
  // priceTarget = purchasePrice * (1 + marginRate / 100) - price HT with gain
  // priceMinSafe = lastPurchasePrice * (1 + minMarginOnLast / 100) - price HT with protection
  // priceHT = max(priceTarget, priceMinSafe) - best HT price
  // priceTTC = priceHT * (1 + taxRate / 100) - final price with tax
  useEffect(() => {
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const lastPurchasePrice = purchasePrice; // When creating/editing, lastPurchasePrice = purchasePrice
    const marginRate = parseFloat(formData.marginRate) || 0;
    const minMarginOnLast = parseFloat(formData.minMarginOnLastPurchase) || 10;
    const taxRate = parseFloat(formData.taxRate) || 0;

    // Only auto-calculate if purchasePrice is provided and valid
    if (purchasePrice > 0 && !isNaN(purchasePrice)) {
      let priceHT = 0;

      // Step 1: Calculate price HT with gain (marginRate) - independent
      const priceTarget =
        purchasePrice > 0 && marginRate > 0
          ? purchasePrice * (1 + marginRate / 100)
          : 0;

      // Step 2: Calculate minimum safe price HT (minMarginOnLastPurchase) - independent
      const priceMinSafe =
        lastPurchasePrice > 0
          ? lastPurchasePrice * (1 + minMarginOnLast / 100)
          : 0;

      // Step 3: Get the best HT price (maximum of both to avoid losses)
      if (marginRate > 0 && priceTarget > 0) {
        priceHT = Math.max(priceTarget, priceMinSafe);
      } else {
        priceHT = priceMinSafe;
      }

      // Step 4: Add tax (taxRate) - independent
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
  }, [
    formData.purchasePrice,
    formData.marginRate,
    formData.minMarginOnLastPurchase,
    formData.taxRate,
  ]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;

    // If user manually changes salePrice, don't auto-calculate
    // Otherwise, let the useEffect handle the calculation
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Prepare payload
      const payload = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
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
        minMarginOnLastPurchase: formData.minMarginOnLastPurchase
          ? parseFloat(formData.minMarginOnLastPurchase)
          : 10,
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
        await createProduct(payload);
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
              <Input
                type="text"
                id="brand"
                name="brand"
                label="Marque"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Marque"
                disabled={loading}
              />
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
                <div>
                  <Input
                    type="number"
                    id="minMarginOnLastPurchase"
                    name="minMarginOnLastPurchase"
                    label="Marge min. sur dernier achat (%)"
                    labelSuffix={
                      <span className="text-gray-500 text-xs">
                        (minMarginOnLastPurchase)
                      </span>
                    }
                    value={formData.minMarginOnLastPurchase}
                    onChange={handleChange}
                    placeholder="10"
                    min="0"
                    step="0.01"
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                  {formData.minMarginOnLastPurchase &&
                    parseFloat(formData.minMarginOnLastPurchase) > 0 && (
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Marge min. sur dernier achat:{' '}
                        {formData.minMarginOnLastPurchase}%
                      </p>
                    )}
                </div>
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
