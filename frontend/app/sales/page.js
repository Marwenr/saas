'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import AuthGuard from '../../components/AuthGuard';
import SaleDetailModal from '../../components/SaleDetailModal';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../lib/useAuth';
import { fetchSales } from '../../lib/pos';
import { DollarSign } from 'lucide-react';

/**
 * Sales page - Liste des ventes
 */
function SalesPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load sales
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadSales();
    }
  }, [
    authLoading,
    isAuthenticated,
    pagination.page,
    paymentMethodFilter,
    startDate,
    endDate,
  ]);

  const loadSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSales({
        page: pagination.page,
        limit: pagination.limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        paymentMethod: paymentMethodFilter || undefined,
      });
      setSales(data.sales || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      console.error('Failed to load sales:', err);
      setError(err.message || 'Failed to load sales');
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

  const handleFilterChange = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getPaymentMethodBadge = method => {
    const methodMap = {
      CASH: {
        label: 'Espèces',
        className:
          'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      },
      CHECK: {
        label: 'Chèque',
        className:
          'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      },
      CREDIT: {
        label: 'Crédit',
        className:
          'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
      },
    };
    return (
      methodMap[method] || {
        label: method,
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8 min-h-screen bg-background">
      {/* Modern Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
              Ventes
            </h1>
            {companyName && (
              <p className="text-base text-muted-foreground">{companyName}</p>
            )}
          </div>
          <Link
            href="/pos"
            className="px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-sm hover:shadow-md whitespace-nowrap"
          >
            + Nouvelle vente
          </Link>
        </div>

        {/* Actions and Filters */}
        <div className="p-6 bg-card rounded-xl border border-border shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Payment method filter */}
            <select
              value={paymentMethodFilter}
              onChange={e => {
                setPaymentMethodFilter(e.target.value);
                handleFilterChange();
              }}
              className="px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
            >
              <option value="">Tous les modes de paiement</option>
              <option value="CASH">Espèces</option>
              <option value="CHECK">Chèque</option>
            </select>

            {/* Date filters */}
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                handleFilterChange();
              }}
              placeholder="Date de début"
              className="px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
            />
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                handleFilterChange();
              }}
              placeholder="Date de fin"
              className="px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 shadow-sm">
          {error}
        </div>
      )}

      {/* Sales table */}
      {loading ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
          <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <div className="text-muted-foreground text-lg">
            Aucune vente. Créez votre première vente !
          </div>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Référence
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Client
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Articles
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-foreground uppercase tracking-wide">
                      Total HT
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-foreground uppercase tracking-wide">
                      TVA
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-foreground uppercase tracking-wide">
                      Total TTC
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-foreground uppercase tracking-wide">
                      Paiement
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-foreground uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sales.map(sale => {
                    const paymentMethod = getPaymentMethodBadge(
                      sale.paymentMethod
                    );
                    return (
                      <tr
                        key={sale._id || sale.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedSaleId(sale._id || sale.id);
                          setShowSaleModal(true);
                        }}
                      >
                        <td className="px-6 py-4 text-sm text-foreground">
                          {formatDate(sale.saleDate || sale.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground font-semibold">
                          {sale.reference || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {sale.customerName || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {sale.items?.length || 0} article(s)
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground text-right">
                          {sale.totalExclTax !== undefined
                            ? `${sale.totalExclTax.toFixed(2)} TND`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground text-right">
                          {sale.totalTax !== undefined
                            ? `${sale.totalTax.toFixed(2)} TND`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground font-semibold text-right">
                          {sale.totalInclTax !== undefined
                            ? `${sale.totalInclTax.toFixed(2)} TND`
                            : '-'}
                        </td>
                        <td
                          className="px-6 py-4 text-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <span
                            className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${paymentMethod.className}`}
                          >
                            {paymentMethod.label}
                          </span>
                        </td>
                        <td
                          className="px-6 py-4 text-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <Button
                            onClick={() => {
                              setSelectedSaleId(sale._id || sale.id);
                              setShowSaleModal(true);
                            }}
                            variant="primary"
                            size="sm"
                          >
                            Voir
                          </Button>
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
            <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm">
              <div className="text-sm font-medium text-muted-foreground">
                Page {pagination.page} sur {pagination.pages} (
                {pagination.total} vente{pagination.total > 1 ? 's' : ''})
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

      {/* Sale Detail Modal */}
      <SaleDetailModal
        saleId={selectedSaleId}
        isOpen={showSaleModal}
        onClose={() => {
          setShowSaleModal(false);
          setSelectedSaleId(null);
        }}
      />
    </div>
  );
}

export default function Sales() {
  return (
    <AuthGuard>
      <SalesPage />
    </AuthGuard>
  );
}
