'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '../../../components/Container';
import AuthGuard from '../../../components/AuthGuard';
import CustomerForm from '../../../components/CustomerForm';
import { useAuth } from '../../../lib/useAuth';
import { fetchCustomer, deleteCustomer } from '../../../lib/customers';

function CustomerDetailsInner() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const customerId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const load = async () => {
      if (!customerId || authLoading || !isAuthenticated) return;
      try {
        setLoading(true);
        setError(null);
        const result = await fetchCustomer(customerId);
        setCustomer(result.customer);
      } catch (e) {
        console.error(e);
        setError(e.message || 'Failed to load customer');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [customerId, authLoading, isAuthenticated]);

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      return;
    }

    try {
      setDeleting(true);
      await deleteCustomer(customerId);
      router.push('/clients');
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to delete customer');
      setDeleting(false);
    }
  };

  const handleEditClose = () => {
    setShowEditForm(false);
    // Reload customer data
    const load = async () => {
      try {
        const result = await fetchCustomer(customerId);
        setCustomer(result.customer);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  };

  const getClassificationBadge = classification => {
    const colors = {
      vert: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      jaune:
        'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      rouge: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      noir: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
    };
    const labels = {
      vert: 'Vert',
      jaune: 'Jaune',
      rouge: 'Rouge',
      noir: 'Noir',
    };
    return (
      <span
        className={`inline-block px-3 py-1 rounded text-sm font-medium ${colors[classification] || colors.vert}`}
      >
        {labels[classification] || classification}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <Container>
          <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
          <button
            onClick={() => router.push('/clients')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retour à la liste des clients
          </button>
        </Container>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-8">
        <Container>
          <div className="text-center py-12">
            <div className="text-[var(--text-secondary)]">
              Client non trouvé
            </div>
            <button
              onClick={() => router.push('/clients')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retour à la liste des clients
            </button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
                {customer.firstName} {customer.lastName}
              </h1>
              {customer.internalCode && (
                <div className="text-sm text-[var(--text-secondary)]">
                  Code interne: {customer.internalCode}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/clients/${customerId}/sales`)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Historique des ventes
              </button>
              <button
                onClick={() => router.push(`/clients/${customerId}/finance`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Comptabilité
              </button>
              <button
                onClick={() => setShowEditForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Modifier
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
              <button
                onClick={() => router.push('/clients')}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
            <span>
              Créé le:{' '}
              {customer.createdAt
                ? new Date(customer.createdAt).toLocaleDateString()
                : '-'}
            </span>
            <span>
              Modifié le:{' '}
              {customer.updatedAt
                ? new Date(customer.updatedAt).toLocaleDateString()
                : '-'}
            </span>
            <span>
              Statut:{' '}
              {customer.isActive ? (
                <span className="text-green-600">Actif</span>
              ) : (
                <span className="text-red-600">Inactif</span>
              )}
            </span>
          </div>
        </div>

        {/* Main Info Grid */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Informations de base
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Type de client
                </div>
                <div className="text-[var(--text-primary)] font-medium">
                  {customer.clientType === 'professionnel'
                    ? 'Professionnel'
                    : 'Particulier'}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Classification
                </div>
                <div>
                  {getClassificationBadge(customer.classification || 'vert')}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Matricule fiscale
                </div>
                <div className="text-[var(--text-primary)]">
                  {customer.taxId || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Coordonnées
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Téléphones
                </div>
                <div className="text-[var(--text-primary)]">
                  {customer.phones && customer.phones.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {customer.phones.map((phone, idx) => (
                        <li key={idx}>{phone}</li>
                      ))}
                    </ul>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Email
                </div>
                <div className="text-[var(--text-primary)]">
                  {customer.email || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Adresse
                </div>
                <div className="text-[var(--text-primary)]">
                  {customer.address || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Ville
                </div>
                <div className="text-[var(--text-primary)]">
                  {customer.city || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicles Section */}
        <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Voitures ({customer.vehicles ? customer.vehicles.length : 0})
            </h2>
          </div>
          {customer.vehicles && customer.vehicles.length > 0 ? (
            <div className="space-y-4">
              {customer.vehicles.map((vehicle, index) => (
                <div
                  key={index}
                  className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)]"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-[var(--text-secondary)] mb-1">
                        VIN
                      </div>
                      <div className="text-[var(--text-primary)] font-medium">
                        {vehicle.vin || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--text-secondary)] mb-1">
                        Marque / Modèle
                      </div>
                      <div className="text-[var(--text-primary)]">
                        {vehicle.brand || '-'}{' '}
                        {vehicle.model ? `- ${vehicle.model}` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--text-secondary)] mb-1">
                        Année / Moteur
                      </div>
                      <div className="text-[var(--text-primary)]">
                        {vehicle.year || '-'}{' '}
                        {vehicle.engine ? `- ${vehicle.engine}` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--text-secondary)] mb-1">
                        Carburant / Kilométrage
                      </div>
                      <div className="text-[var(--text-primary)]">
                        {vehicle.fuelType === 'essence'
                          ? 'Essence'
                          : vehicle.fuelType === 'diesel'
                            ? 'Diesel'
                            : vehicle.fuelType === 'hybride'
                              ? 'Hybride'
                              : vehicle.fuelType === 'electrique'
                                ? 'Électrique'
                                : vehicle.fuelType === 'gpl'
                                  ? 'GPL'
                                  : vehicle.fuelType === 'autre'
                                    ? 'Autre'
                                    : '-'}
                        {vehicle.mileage
                          ? ` - ${vehicle.mileage.toLocaleString()} km`
                          : ''}
                      </div>
                    </div>
                    {vehicle.acquisitionDate && (
                      <div>
                        <div className="text-sm text-[var(--text-secondary)] mb-1">
                          Date d&apos;acquisition
                        </div>
                        <div className="text-[var(--text-primary)]">
                          {new Date(
                            vehicle.acquisitionDate
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              Aucune voiture enregistrée
            </div>
          )}
        </div>

        {/* Notes Section */}
        {customer.notes && (
          <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Notes
            </h2>
            <div className="text-[var(--text-primary)] whitespace-pre-wrap">
              {customer.notes}
            </div>
          </div>
        )}

        {/* Edit Form Modal */}
        {showEditForm && (
          <CustomerForm customer={customer} onClose={handleEditClose} />
        )}
      </Container>
    </div>
  );
}

export default function CustomerDetailsPage() {
  return (
    <AuthGuard>
      <CustomerDetailsInner />
    </AuthGuard>
  );
}
