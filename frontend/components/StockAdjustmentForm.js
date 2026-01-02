'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createStockMovement } from '../lib/inventory';
import Input from './Input';
import { AlertTriangle, X } from 'lucide-react';

/**
 * StockAdjustmentForm component - Modal form for adjusting stock
 */
export default function StockAdjustmentForm({ product, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      type: 'IN',
      quantity: '',
      reason: '',
    },
  });

  const type = watch('type');

  const onSubmit = async data => {
    setError(null);
    setLoading(true);

    try {
      const quantity = parseFloat(data.quantity);

      // Validate quantity
      if (isNaN(quantity)) {
        throw new Error('La quantité doit être un nombre valide');
      }

      if (data.type === 'ADJUST') {
        if (quantity < 0) {
          throw new Error(
            'La quantité doit être supérieure ou égale à 0 pour un ajustement'
          );
        }
      } else {
        // For IN and OUT, quantity must be > 0
        if (quantity <= 0) {
          throw new Error(
            'La quantité doit être supérieure à 0 pour une entrée ou sortie'
          );
        }
      }

      // Prepare payload
      // For ADJUST type, quantity is the target stock level
      // For IN/OUT, quantity is the change amount
      const payload = {
        productId: product._id || product.id,
        type: data.type,
        quantity: quantity,
        reason: data.reason.trim() || undefined,
      };

      await createStockMovement(payload);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Failed to create stock movement:', err);
      setError(err.message || "Échec de l'ajustement de stock");
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = type => {
    switch (type) {
      case 'IN':
        return 'Entrée';
      case 'OUT':
        return 'Sortie';
      case 'ADJUST':
        return 'Ajustement';
      default:
        return type;
    }
  };

  const getTypeDescription = type => {
    switch (type) {
      case 'IN':
        return 'Ajouter du stock';
      case 'OUT':
        return 'Retirer du stock';
      case 'ADJUST':
        return 'Définir le stock à une valeur spécifique';
      default:
        return '';
    }
  };

  const currentStock = product.stockQty !== undefined ? product.stockQty : 0;
  const minStock = product.minStock !== undefined ? product.minStock : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Ajuster le stock
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {product.name || product.sku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current stock info */}
        <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-[var(--text-secondary)]">
                Stock actuel
              </div>
              <div className="text-lg font-semibold text-[var(--text-primary)]">
                {currentStock}
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)]">
                Stock minimum
              </div>
              <div className="text-lg font-semibold text-[var(--text-primary)]">
                {minStock}
              </div>
            </div>
          </div>
          {currentStock <= minStock && (
            <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700 rounded text-yellow-700 dark:text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Stock faible
            </div>
          )}
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
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Type d&apos;opération <span className="text-red-500">*</span>
              </label>
              <select
                {...register('type', { required: 'Type is required' })}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="IN">Entrée (Ajouter)</option>
                <option value="OUT">Sortie (Retirer)</option>
                <option value="ADJUST">Ajustement (Définir)</option>
              </select>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {getTypeDescription(type)}
              </p>
            </div>

            {/* Quantity */}
            <div>
              <Input
                type="number"
                id="quantity"
                label={type === 'ADJUST' ? 'Nouveau stock' : 'Quantité'}
                labelSuffix={<span className="text-red-500">*</span>}
                placeholder={type === 'ADJUST' ? '0' : '0.00'}
                disabled={loading}
                {...register('quantity', {
                  required: 'Quantity is required',
                  min: {
                    value: type === 'ADJUST' ? 0 : 0.01,
                    message:
                      type === 'ADJUST'
                        ? 'Quantity must be >= 0'
                        : 'Quantity must be > 0',
                  },
                  valueAsNumber: true,
                })}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Raison (optionnel)
              </label>
              <textarea
                {...register('reason')}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: Réception de commande, Inventaire, etc."
              />
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
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
