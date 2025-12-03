'use client';

import { useState, useEffect } from 'react';
import { createProduct } from '../lib/products';
import Input from './Input';

/**
 * NewProductModal component - Simplified modal for creating products from purchase order page
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} onCreated - Callback when product is created, receives the created product
 */
export default function NewProductModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    brand: '',
    purchasePrice: '',
    salePrice: '',
    taxRate: '0',
    marginRate: '0',
  });

  // Auto-calculate salePrice when purchasePrice or marginRate changes
  useEffect(() => {
    const purchasePrice = parseFloat(formData.purchasePrice);
    const marginRate = parseFloat(formData.marginRate) || 0;

    // Only auto-calculate if purchasePrice is provided and valid
    if (purchasePrice > 0 && !isNaN(purchasePrice) && marginRate >= 0) {
      const calculatedSalePrice = purchasePrice * (1 + marginRate / 100);
      setFormData(prev => ({
        ...prev,
        salePrice: calculatedSalePrice.toFixed(2),
      }));
    }
  }, [formData.purchasePrice, formData.marginRate]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
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
        purchasePrice: formData.purchasePrice
          ? parseFloat(formData.purchasePrice)
          : undefined,
        salePrice: formData.salePrice
          ? parseFloat(formData.salePrice)
          : undefined,
        taxRate: formData.taxRate ? parseFloat(formData.taxRate) : 0,
        marginRate: formData.marginRate ? parseFloat(formData.marginRate) : 0,
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

            {/* Brand */}
            <Input
              type="text"
              id="brand"
              name="brand"
              label="Marque"
              value={formData.brand}
              onChange={handleChange}
              placeholder="Marque (optionnel)"
              disabled={loading}
            />

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
                  placeholder="0"
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
                  label="Prix de vente (HT) (TND)"
                  labelSuffix={
                    <span className="text-gray-500 text-xs ml-2">
                      (calculé automatiquement)
                    </span>
                  }
                  value={formData.salePrice}
                  onChange={handleChange}
                  placeholder="0.00"
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
