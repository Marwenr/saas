'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '../../../components/Container';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/useAuth';
import { fetchSale } from '../../../lib/pos';

function SaleDetailInner() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sale, setSale] = useState(null);

  const saleId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const load = async () => {
      if (!saleId || authLoading || !isAuthenticated) return;
      try {
        setLoading(true);
        setError(null);
        const result = await fetchSale(saleId);
        setSale(result.sale);
      } catch (e) {
        console.error(e);
        setError(e.message || 'Failed to load sale');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [saleId, authLoading, isAuthenticated]);

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
        className={`px-3 py-1 rounded text-sm font-medium ${badges[method] || 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'}`}
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

  if (error) {
    return (
      <div className="py-8">
        <Container>
          <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
          <button
            onClick={() => router.push('/pos')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retour au POS
          </button>
        </Container>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="py-8">
        <Container>
          <div className="text-center py-12">
            <div className="text-[var(--text-secondary)]">
              Vente non trouvée
            </div>
            <button
              onClick={() => router.push('/pos')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retour au POS
            </button>
          </div>
        </Container>
      </div>
    );
  }

  const customer = sale.customerId;

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
                Détail de la vente
              </h1>
              {sale.reference && (
                <p className="text-lg text-[var(--text-secondary)]">
                  Référence: {sale.reference}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {customer && (
                <button
                  onClick={() =>
                    router.push(`/clients/${customer._id || customer.id}`)
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Voir le client
                </button>
              )}
              {customer && (
                <button
                  onClick={() =>
                    router.push(`/clients/${customer._id || customer.id}/sales`)
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Historique du client
                </button>
              )}
              <button
                onClick={() => router.push('/pos')}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {sale.isReturn && (
            <span className="px-3 py-1 rounded text-sm font-medium bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">
              Retour
            </span>
          )}
          {sale.isReplacement && (
            <span className="px-3 py-1 rounded text-sm font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
              Remplacement
            </span>
          )}
          {sale.returnSaleId && (
            <span className="px-3 py-1 rounded text-sm font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400">
              Vente originale:{' '}
              {sale.returnSaleId.reference ||
                sale.returnSaleId._id ||
                sale.returnSaleId.id}
            </span>
          )}
        </div>

        {/* Main Info Grid */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sale Information */}
          <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Informations de vente
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Date de vente
                </div>
                <div className="text-[var(--text-primary)] font-medium">
                  {new Date(sale.saleDate || sale.createdAt).toLocaleString(
                    'fr-FR',
                    {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Créée par
                </div>
                <div className="text-[var(--text-primary)]">
                  {sale.createdBy?.name || sale.createdBy?.email || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Mode de paiement
                </div>
                <div>{getPaymentMethodBadge(sale.paymentMethod)}</div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Client
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-1">
                  Nom
                </div>
                <div className="text-[var(--text-primary)] font-medium">
                  {customer ? (
                    <>
                      {customer.firstName} {customer.lastName}
                      {customer.internalCode && (
                        <span className="ml-2 text-sm text-[var(--text-secondary)]">
                          ({customer.internalCode})
                        </span>
                      )}
                    </>
                  ) : (
                    sale.customerName || 'client comptoir'
                  )}
                </div>
              </div>
              {sale.vehicleInfo && (
                <div>
                  <div className="text-sm text-[var(--text-secondary)] mb-1">
                    Véhicule
                  </div>
                  <div className="text-[var(--text-primary)]">
                    <div className="font-medium">
                      {sale.vehicleInfo.brand} {sale.vehicleInfo.model}
                      {sale.vehicleInfo.year && ` (${sale.vehicleInfo.year})`}
                    </div>
                    {sale.vehicleInfo.vin && (
                      <div className="text-sm text-[var(--text-secondary)]">
                        VIN: {sale.vehicleInfo.vin}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Articles ({sale.items?.length || 0})
          </h2>
          {sale.items && sale.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Produit
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                      SKU
                    </th>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                      Quantité
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      Prix unitaire
                    </th>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                      TVA
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      Total HT
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      Total TTC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item, index) => {
                    const product = item.productId;
                    return (
                      <tr
                        key={index}
                        className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                      >
                        <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                          <div className="font-medium">{item.name || '-'}</div>
                        </td>
                        <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                          {item.sku || product?.sku || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-center text-[var(--text-primary)]">
                          {item.qty || 0}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-[var(--text-primary)]">
                          {item.unitPrice?.toFixed(2) || '0.00'} TND
                        </td>
                        <td className="px-3 py-2 text-sm text-center text-[var(--text-primary)]">
                          {item.taxRate || 0}%
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-[var(--text-primary)]">
                          {item.totalExclTax?.toFixed(2) || '0.00'} TND
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-right text-[var(--text-primary)]">
                          {item.totalInclTax?.toFixed(2) || '0.00'} TND
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--border-color)]">
                    <td
                      colSpan="5"
                      className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]"
                    >
                      Sous-total HT:
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      {sale.totalExclTax?.toFixed(2) || '0.00'} TND
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td
                      colSpan="5"
                      className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]"
                    >
                      TVA:
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      {sale.totalTax?.toFixed(2) || '0.00'} TND
                    </td>
                    <td></td>
                  </tr>
                  <tr className="border-t-2 border-[var(--border-color)]">
                    <td
                      colSpan="5"
                      className="px-3 py-2 text-right text-lg font-bold text-[var(--text-primary)]"
                    >
                      Total TTC:
                    </td>
                    <td className="px-3 py-2 text-right text-lg font-bold text-[var(--text-primary)]">
                      {sale.totalInclTax?.toFixed(2) || '0.00'} TND
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              Aucun article
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Informations système
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[var(--text-secondary)] mb-1">Créée le</div>
              <div className="text-[var(--text-primary)]">
                {sale.createdAt
                  ? new Date(sale.createdAt).toLocaleString('fr-FR')
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-secondary)] mb-1">
                Modifiée le
              </div>
              <div className="text-[var(--text-primary)]">
                {sale.updatedAt
                  ? new Date(sale.updatedAt).toLocaleString('fr-FR')
                  : '-'}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default function SaleDetailPage() {
  return (
    <AuthGuard>
      <SaleDetailInner />
    </AuthGuard>
  );
}
