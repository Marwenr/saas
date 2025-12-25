'use client';

import { useState, useEffect } from 'react';
import { createUser, updateUser } from '../lib/api';
import Input from './Input';
import Button from './Button';

/**
 * UserForm component - Modal form for creating/editing users
 */
export default function UserForm({ user, onClose, onSuccess }) {
  const isEditing = !!user;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    name: '',
    role: 'cashier',
  });

  // Load user data if editing
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        name: user.name || '',
        role: user.role || 'cashier',
      });
    } else {
      // Reset for new user
      setFormData({
        email: '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        name: '',
        role: 'cashier',
      });
    }
  }, [user]);

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
      // Validate required fields
      if (!formData.email) {
        throw new Error('Email is required');
      }

      // For new users, password is required
      if (!isEditing) {
        if (!formData.newPassword) {
          throw new Error('Mot de passe requis');
        }
        if (formData.newPassword.length < 6) {
          throw new Error(
            'Le mot de passe doit contenir au moins 6 caractères'
          );
        }
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
      }

      // For editing, if changing password, validate old password and new password
      if (isEditing && formData.newPassword) {
        if (!formData.oldPassword) {
          throw new Error(
            "L'ancien mot de passe est requis pour changer le mot de passe"
          );
        }
        if (formData.newPassword.length < 6) {
          throw new Error(
            'Le nouveau mot de passe doit contenir au moins 6 caractères'
          );
        }
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Les nouveaux mots de passe ne correspondent pas');
        }
      }

      const payload = {
        email: formData.email.trim(),
        name: formData.name.trim() || undefined,
        role: formData.role,
      };

      // For new users, send the password
      if (!isEditing) {
        payload.password = formData.newPassword;
      }

      // For editing, send old and new password if changing
      if (isEditing && formData.newPassword) {
        payload.oldPassword = formData.oldPassword;
        payload.newPassword = formData.newPassword;
      }

      if (isEditing) {
        await updateUser(user.id, payload);
      } else {
        await createUser(payload);
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Failed to save user:', err);
      setError(err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    manager: 'Manager',
    cashier: 'Caissier',
    storekeeper: 'Magasinier',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {isEditing ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close"
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

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              id="email"
              name="email"
              label="Email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
              disabled={loading}
            />

            <Input
              type="text"
              id="name"
              name="name"
              label="Nom (optionnel)"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nom complet"
              disabled={loading}
            />

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-purple-900 dark:text-purple-200 mb-2"
              >
                Rôle <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                disabled={loading || (isEditing && user.role === 'owner')}
                className="w-full px-4 py-3 border border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-neutral-900/50 text-purple-900 dark:text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="manager">{roleLabels.manager}</option>
                <option value="cashier">{roleLabels.cashier}</option>
                <option value="storekeeper">{roleLabels.storekeeper}</option>
              </select>
              {isEditing && user.role === 'owner' && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Le rôle owner ne peut pas être modifié
                </p>
              )}
            </div>

            {/* Password fields - different for new user vs editing */}
            {isEditing ? (
              <>
                <Input
                  type="password"
                  id="oldPassword"
                  name="oldPassword"
                  label="Ancien mot de passe (requis pour changer)"
                  value={formData.oldPassword}
                  onChange={handleChange}
                  placeholder="Ancien mot de passe"
                  disabled={loading}
                />
                <Input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  label="Nouveau mot de passe (optionnel)"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Laisser vide pour ne pas changer"
                  minLength={6}
                  disabled={loading}
                />
                {formData.newPassword && (
                  <>
                    <Input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      label="Confirmer le nouveau mot de passe"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirmer le nouveau mot de passe"
                      minLength={6}
                      disabled={loading}
                    />
                    {formData.confirmPassword &&
                      formData.newPassword !== formData.confirmPassword && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Les mots de passe ne correspondent pas
                        </p>
                      )}
                  </>
                )}
              </>
            ) : (
              <>
                <Input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  label="Mot de passe"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Minimum 6 caractères"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirmer le mot de passe"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirmer le mot de passe"
                  required
                  minLength={6}
                  disabled={loading}
                />
                {formData.confirmPassword &&
                  formData.newPassword !== formData.confirmPassword && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Les mots de passe ne correspondent pas
                    </p>
                  )}
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                disabled={loading}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading
                  ? 'Enregistrement...'
                  : isEditing
                    ? 'Modifier'
                    : 'Créer'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
