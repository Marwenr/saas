'use client';

import { useState, useEffect } from 'react';
import { createSupplier, updateSupplier } from '../lib/suppliers';
import Input from './Input';

/**
 * SupplierForm component - Modal form for creating/editing suppliers
 */
export default function SupplierForm({ supplier, onClose }) {
  const isEditing = !!supplier;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
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
  });

  // Load supplier data if editing
  useEffect(() => {
    if (supplier) {
      setFormData({
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
  }, [supplier]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
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
        name: formData.name.trim(),
        contactName: formData.contactName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        taxNumber: formData.taxNumber.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        country: formData.country.trim() || undefined,
        isActive: formData.isActive,
        notes: formData.notes.trim() || undefined,
      };

      // Validate required fields
      if (!payload.name) {
        throw new Error('Le nom est obligatoire');
      }

      if (isEditing) {
        await updateSupplier(supplier._id || supplier.id, payload);
      } else {
        await createSupplier(payload);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save supplier:', err);
      setError(err.message || "Échec de l'enregistrement du fournisseur");
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
            {isEditing ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}
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
            {/* Name - Required */}
            <Input
              type="text"
              id="name"
              name="name"
              label="Nom"
              labelSuffix={<span className="text-red-500">*</span>}
              value={formData.name}
              onChange={handleChange}
              placeholder="Nom du fournisseur"
              required
              disabled={loading}
            />

            {/* Contact Name and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                id="contactName"
                name="contactName"
                label="Nom du contact"
                value={formData.contactName}
                onChange={handleChange}
                placeholder="Nom du contact"
                disabled={loading}
              />
              <Input
                type="email"
                id="email"
                name="email"
                label="Email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                disabled={loading}
              />
            </div>

            {/* Phone and Tax Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="tel"
                id="phone"
                name="phone"
                label="Téléphone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+216 XX XXX XXX"
                disabled={loading}
              />
              <Input
                type="text"
                id="taxNumber"
                name="taxNumber"
                label="Numéro fiscal"
                value={formData.taxNumber}
                onChange={handleChange}
                placeholder="Numéro fiscal"
                disabled={loading}
              />
            </div>

            {/* Address */}
            <Input
              type="text"
              id="address"
              name="address"
              label="Adresse"
              value={formData.address}
              onChange={handleChange}
              placeholder="Adresse"
              disabled={loading}
            />

            {/* City and Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                id="city"
                name="city"
                label="Ville"
                value={formData.city}
                onChange={handleChange}
                placeholder="Ville"
                disabled={loading}
              />
              <Input
                type="text"
                id="country"
                name="country"
                label="Pays"
                value={formData.country}
                onChange={handleChange}
                placeholder="TN"
                disabled={loading}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Notes supplémentaires"
              />
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
                Fournisseur actif
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
