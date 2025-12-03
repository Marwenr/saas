'use client';

import { useState, useEffect } from 'react';
import { createCustomer, updateCustomer } from '../lib/customers';
import Input from './Input';

/**
 * CustomerForm component - Modal form for creating/editing customers
 */
export default function CustomerForm({ customer, onClose }) {
  const isEditing = !!customer;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
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
  });

  // Load customer data if editing
  useEffect(() => {
    if (customer) {
      setFormData({
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
  }, [customer]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePhoneChange = (index, value) => {
    const newPhones = [...formData.phones];
    newPhones[index] = value;
    setFormData(prev => ({
      ...prev,
      phones: newPhones,
    }));
  };

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...prev.phones, ''],
    }));
  };

  const removePhone = index => {
    if (formData.phones.length > 1) {
      const newPhones = formData.phones.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        phones: newPhones,
      }));
    }
  };

  const handleVehicleChange = (index, field, value) => {
    const newVehicles = [...formData.vehicles];
    if (!newVehicles[index]) {
      newVehicles[index] = {};
    }
    newVehicles[index][field] = value;
    setFormData(prev => ({
      ...prev,
      vehicles: newVehicles,
    }));
  };

  const addVehicle = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [
        ...prev.vehicles,
        {
          vin: '',
          brand: '',
          model: '',
          year: new Date().getFullYear(),
          engine: '',
          fuelType: 'essence',
          mileage: '',
          acquisitionDate: '',
        },
      ],
    }));
  };

  const removeVehicle = index => {
    const newVehicles = formData.vehicles.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      vehicles: newVehicles,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Prepare payload
      const phonesArray = formData.phones.filter(p => p && p.trim());
      const vehiclesArray = formData.vehicles
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
        .filter(v => v.vin && v.brand && v.model); // Only include vehicles with required fields

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phones: phonesArray,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        taxId: formData.taxId.trim() || undefined,
        internalCode: formData.internalCode.trim() || undefined,
        clientType: formData.clientType,
        classification: formData.classification,
        vehicles: vehiclesArray,
        isActive: formData.isActive,
        notes: formData.notes.trim() || undefined,
      };

      // Validate required fields
      if (!payload.firstName || !payload.lastName) {
        throw new Error('Le prénom et le nom sont obligatoires');
      }

      if (isEditing) {
        await updateCustomer(customer._id || customer.id, payload);
      } else {
        await createCustomer(payload);
      }

      // Call onClose with success indicator if it accepts a parameter
      if (typeof onClose === 'function') {
        onClose(true);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save customer:', err);
      setError(err.message || "Échec de l'enregistrement du client");
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-primary)] z-10">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {isEditing ? 'Modifier le client' : 'Ajouter un client'}
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
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Informations de base
              </h3>
              <div className="space-y-4">
                {/* First Name and Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    id="firstName"
                    name="firstName"
                    label="Prénom"
                    labelSuffix={<span className="text-red-500">*</span>}
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Prénom"
                    required
                    disabled={loading}
                  />
                  <Input
                    type="text"
                    id="lastName"
                    name="lastName"
                    label="Nom"
                    labelSuffix={<span className="text-red-500">*</span>}
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Nom"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Phones - Multiple */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Téléphones
                  </label>
                  {formData.phones.map((phone, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        type="tel"
                        id={`phone-${index}`}
                        value={phone}
                        onChange={e => handlePhoneChange(index, e.target.value)}
                        placeholder="+216 XX XXX XXX"
                        disabled={loading}
                        className="flex-1"
                      />
                      {formData.phones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhone(index)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPhone}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + Ajouter un téléphone
                  </button>
                </div>

                {/* Email */}
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

                {/* Address and City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                {/* Tax ID and Internal Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    id="taxId"
                    name="taxId"
                    label="Matricule fiscale"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="Matricule fiscale"
                    disabled={loading}
                  />
                  <Input
                    type="text"
                    id="internalCode"
                    name="internalCode"
                    label="Code interne (ID)"
                    value={formData.internalCode}
                    onChange={handleChange}
                    placeholder="Généré automatiquement si vide"
                    disabled={loading}
                  />
                </div>

                {/* Client Type and Classification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Type de client <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="clientType"
                      value={formData.clientType}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="particulier">Particulier</option>
                      <option value="professionnel">Professionnel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Classification
                    </label>
                    <select
                      name="classification"
                      value={formData.classification}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="vert">Vert</option>
                      <option value="jaune">Jaune</option>
                      <option value="rouge">Rouge</option>
                      <option value="noir">Noir</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicles Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Voitures
                </h3>
                <button
                  type="button"
                  onClick={addVehicle}
                  className="text-sm px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  + Ajouter une voiture
                </button>
              </div>
              {formData.vehicles.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Aucune voiture ajoutée
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.vehicles.map((vehicle, index) => (
                    <div
                      key={index}
                      className="border border-[var(--border-color)] rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-[var(--text-primary)]">
                          Voiture {index + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeVehicle(index)}
                          className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          type="text"
                          id={`vehicle-vin-${index}`}
                          label="VIN"
                          labelSuffix={<span className="text-red-500">*</span>}
                          value={vehicle.vin || ''}
                          onChange={e =>
                            handleVehicleChange(
                              index,
                              'vin',
                              e.target.value.toUpperCase()
                            )
                          }
                          placeholder="VIN"
                          required
                          disabled={loading}
                        />
                        <Input
                          type="text"
                          id={`vehicle-brand-${index}`}
                          label="Marque"
                          labelSuffix={<span className="text-red-500">*</span>}
                          value={vehicle.brand || ''}
                          onChange={e =>
                            handleVehicleChange(index, 'brand', e.target.value)
                          }
                          placeholder="Marque"
                          required
                          disabled={loading}
                        />
                        <Input
                          type="text"
                          id={`vehicle-model-${index}`}
                          label="Modèle"
                          labelSuffix={<span className="text-red-500">*</span>}
                          value={vehicle.model || ''}
                          onChange={e =>
                            handleVehicleChange(index, 'model', e.target.value)
                          }
                          placeholder="Modèle"
                          required
                          disabled={loading}
                        />
                        <Input
                          type="number"
                          id={`vehicle-year-${index}`}
                          label="Année"
                          labelSuffix={<span className="text-red-500">*</span>}
                          value={vehicle.year || new Date().getFullYear()}
                          onChange={e =>
                            handleVehicleChange(
                              index,
                              'year',
                              parseInt(e.target.value)
                            )
                          }
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          required
                          disabled={loading}
                        />
                        <Input
                          type="text"
                          id={`vehicle-engine-${index}`}
                          label="Moteur"
                          value={vehicle.engine || ''}
                          onChange={e =>
                            handleVehicleChange(index, 'engine', e.target.value)
                          }
                          placeholder="Moteur"
                          disabled={loading}
                        />
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                            Carburant
                          </label>
                          <select
                            value={vehicle.fuelType || 'essence'}
                            onChange={e =>
                              handleVehicleChange(
                                index,
                                'fuelType',
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="essence">Essence</option>
                            <option value="diesel">Diesel</option>
                            <option value="hybride">Hybride</option>
                            <option value="electrique">Électrique</option>
                            <option value="gpl">GPL</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                        <div>
                          <Input
                            type="number"
                            id={`vehicle-mileage-${index}`}
                            label="Kilométrage"
                            value={vehicle.mileage || ''}
                            onChange={e =>
                              handleVehicleChange(
                                index,
                                'mileage',
                                e.target.value
                              )
                            }
                            placeholder="Kilométrage"
                            min="0"
                            disabled={loading}
                          />
                        </div>
                        <Input
                          type="date"
                          id={`vehicle-acquisitionDate-${index}`}
                          label="Date d'acquisition"
                          value={vehicle.acquisitionDate || ''}
                          onChange={e =>
                            handleVehicleChange(
                              index,
                              'acquisitionDate',
                              e.target.value
                            )
                          }
                          disabled={loading}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                Client actif
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
