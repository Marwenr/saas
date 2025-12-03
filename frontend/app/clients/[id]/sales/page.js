'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '../../../../components/Container';
import AuthGuard from '../../../../components/AuthGuard';
import SaleDetailModal from '../../../../components/SaleDetailModal';
import { useAuth } from '../../../../lib/useAuth';
import { fetchCustomer } from '../../../../lib/customers';
import { fetchSales } from '../../../../lib/pos';

function CustomerSalesInner() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loadingSales, setLoadingSales] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentMethod: '',
  });
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);

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

  useEffect(() => {
    const loadSales = async () => {
      if (!customerId || authLoading || !isAuthenticated) return;
      try {
        setLoadingSales(true);
        const result = await fetchSales({
          client: customerId,
          page: pagination.page,
          limit: pagination.limit,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          paymentMethod: filters.paymentMethod || undefined,
        });
        setSales(result.sales || []);
        setPagination(result.pagination || pagination);
      } catch (e) {
        console.error(e);
        setError(e.message || 'Failed to load sales');
      } finally {
        setLoadingSales(false);
      }
    };
    loadSales();
  }, [
    customerId,
    authLoading,
    isAuthenticated,
    pagination.page,
    pagination.limit,
    filters.startDate,
    filters.endDate,
    filters.paymentMethod,
  ]);

  const handlePageChange = newPage => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      paymentMethod: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getPaymentMethodBadge = method => {
    const badges = {
      CASH: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      CHECK: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      CREDIT:
        'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
    };
    const labels = {
      CASH: 'Espèces',
      CHECK: 'Chèque',
      CREDIT: 'Crédit',
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${badges[method] || 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'}`}
      >
        {labels[method] || method}
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

  if (error && !customer) {
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
                Historique des ventes
              </h1>
              <p className="text-lg text-[var(--text-secondary)]">
                {customer.firstName} {customer.lastName}
                {customer.internalCode && (
                  <span className="ml-2">({customer.internalCode})</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/clients/${customerId}`)}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => handleFilterChange('startDate', e.target.value)}
                className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => handleFilterChange('endDate', e.target.value)}
                className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Mode de paiement
              </label>
              <select
                value={filters.paymentMethod}
                onChange={e =>
                  handleFilterChange('paymentMethod', e.target.value)
                }
                className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tous</option>
                <option value="CASH">Espèces</option>
                <option value="CHECK">Chèque</option>
                <option value="CREDIT">Crédit</option>
              </select>
            </div>
            <div>
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Sales table */}
        <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
          {loadingSales ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              Chargement...
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              Aucune vente trouvée
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Référence
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Véhicule
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Articles
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                        Total HT
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                        TVA
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                        Total TTC
                      </th>
                      <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                        Paiement
                      </th>
                      <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                        Statut
                      </th>
                      <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr
                        key={sale._id || sale.id}
                        className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                      >
                        <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                          {new Date(
                            sale.saleDate || sale.createdAt
                          ).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                          {sale.reference || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                          {sale.vehicleInfo ? (
                            <div>
                              <div className="font-medium">
                                {sale.vehicleInfo.brand}{' '}
                                {sale.vehicleInfo.model}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                {sale.vehicleInfo.vin}{' '}
                                {sale.vehicleInfo.year &&
                                  `(${sale.vehicleInfo.year})`}
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                          {sale.items?.length || 0} article(s)
                        </td>
                        <td className="px-3 py-2 text-sm text-[var(--text-primary)] text-right">
                          {sale.totalExclTax?.toFixed(2) || '0.00'} TND
                        </td>
                        <td className="px-3 py-2 text-sm text-[var(--text-primary)] text-right">
                          {sale.totalTax?.toFixed(2) || '0.00'} TND
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-[var(--text-primary)] text-right">
                          {sale.totalInclTax?.toFixed(2) || '0.00'} TND
                        </td>
                        <td className="px-3 py-2 text-center">
                          {getPaymentMethodBadge(sale.paymentMethod)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {sale.isReturn && (
                            <span className="px-2 py-1 rounded text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">
                              Retour
                            </span>
                          )}
                          {sale.isReplacement && (
                            <span className="px-2 py-1 rounded text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                              Remplacement
                            </span>
                          )}
                          {!sale.isReturn && !sale.isReplacement && (
                            <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedSaleId(sale._id || sale.id);
                              setShowSaleModal(true);
                            }}
                            className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                          >
                            Voir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-[var(--text-secondary)]">
                    Page {pagination.page} sur {pagination.pages} (
                    {pagination.total} vente{pagination.total !== 1 ? 's' : ''})
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sale Detail Modal */}
        <SaleDetailModal
          saleId={selectedSaleId}
          isOpen={showSaleModal}
          onClose={() => {
            setShowSaleModal(false);
            setSelectedSaleId(null);
          }}
        />
      </Container>
    </div>
  );
}

export default function CustomerSalesPage() {
  return (
    <AuthGuard>
      <CustomerSalesInner />
    </AuthGuard>
  );
}
