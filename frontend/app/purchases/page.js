'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import Button from '../../components/Button';
import { useAuth } from '../../lib/useAuth';
import { fetchPurchaseOrders } from '../../lib/purchases';
import { ShoppingCart } from 'lucide-react';

/**
 * Purchases page - Liste des bons de commande
 */
function PurchasesPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load purchase orders
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadPurchaseOrders();
    }
  }, [authLoading, isAuthenticated, pagination.page, statusFilter]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPurchaseOrders({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter,
      });
      setPurchaseOrders(data.purchaseOrders || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
      setError(err.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = newPage => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusBadge = status => {
    const statusMap = {
      DRAFT: {
        label: 'Brouillon',
        className:
          'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400',
      },
      PENDING: {
        label: 'En attente',
        className:
          'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      },
      PARTIAL: {
        label: 'Partiel',
        className:
          'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      },
      RECEIVED: {
        label: 'Reçu',
        className:
          'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      },
      CANCELLED: {
        label: 'Annulé',
        className:
          'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      },
    };
    return (
      statusMap[status] || {
        label: status,
        className:
          'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400',
      }
    );
  };

  const formatDate = dateString => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8 min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 dark:from-[var(--bg-primary)] dark:via-[var(--bg-primary)] dark:to-[var(--bg-primary)]">
      <Container fullWidth>
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                Bons de commande
              </h1>
              {companyName && (
                <p className="text-base text-[var(--text-secondary)]">
                  {companyName}
                </p>
              )}
            </div>
            <Link
              href="/purchases/new"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600 rounded-xl transition-all shadow-sm hover:shadow-md whitespace-nowrap"
            >
              + Nouveau bon de commande
            </Link>
          </div>

          {/* Actions and Filters */}
          <div className="p-6 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md mb-6">
            <div className="flex gap-4 items-center">
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="">Tous les statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="PENDING">En attente</option>
                <option value="PARTIAL">Partiel</option>
                <option value="RECEIVED">Reçu</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 shadow-sm">
            {error}
          </div>
        )}

        {/* Purchase orders table */}
        {loading ? (
          <div className="text-center py-16 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <div className="text-[var(--text-secondary)]">Chargement...</div>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="text-[var(--text-secondary)] text-lg">
              Aucun bon de commande. Créez votre premier bon de commande !
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10 border-b border-[var(--border-color)]">
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Numéro
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Fournisseur
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Montant total
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {purchaseOrders.map(po => {
                      const status = getStatusBadge(po.status);
                      return (
                        <tr
                          key={po._id || po.id}
                          className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-semibold">
                            {po.orderNumber || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                            {po.supplierId?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {formatDate(po.orderDate)}
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-semibold text-right">
                            {po.totalAmount !== undefined
                              ? `${po.totalAmount.toFixed(2)} TND`
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link
                              href={`/purchases/${po._id || po.id}`}
                              className="px-4 py-2 text-sm font-semibold bg-purple-600 dark:bg-purple-700 text-white rounded-xl hover:bg-purple-700 dark:hover:bg-purple-600 transition-all shadow-sm hover:shadow-md inline-block"
                            >
                              Voir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between p-4 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
                <div className="text-sm font-medium text-[var(--text-secondary)]">
                  Page {pagination.page} sur {pagination.pages} (
                  {pagination.total} bons de commande)
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    variant="secondary"
                    size="md"
                  >
                    Précédent
                  </Button>
                  <Button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    variant="secondary"
                    size="md"
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}

export default function Purchases() {
  return (
    <AuthGuard>
      <PurchasesPage />
    </AuthGuard>
  );
}
