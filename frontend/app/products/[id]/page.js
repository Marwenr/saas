'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '../../../components/Container';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/useAuth';
import { fetchProductAnalytics } from '../../../lib/products';

function ProductAnalyticsInner() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const load = async () => {
      if (!productId || authLoading || !isAuthenticated) return;
      try {
        setLoading(true);
        setError(null);
        const result = await fetchProductAnalytics(productId);
        setData(result);
      } catch (e) {
        console.error(e);
        setError(e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, authLoading, isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-height-screen min-h-screen">
        <div className="text-[var(--text-secondary)]">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  const {
    product,
    supplierStats,
    purchaseStats,
    purchaseHistory,
    salesStats,
    salesHistory,
  } = data || {};

  const statCard = (title, value, sub) => (
    <div className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
      <div className="text-sm text-[var(--text-secondary)] mb-1">{title}</div>
      <div className="text-2xl font-semibold text-[var(--text-primary)]">
        {value}
      </div>
      {sub ? (
        <div className="text-xs text-[var(--text-secondary)] mt-1">{sub}</div>
      ) : null}
    </div>
  );

  const currency = v => `${(v || 0).toFixed(2)} TND`;

  return (
    <div className="py-8">
      <Container fullWidth>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Détails produit
          </h1>
          <div className="text-[var(--text-secondary)]">
            ID: {product?._id} — Dernière mise à jour:{' '}
            {product?.updatedAt
              ? new Date(product.updatedAt).toLocaleString()
              : '-'}
          </div>
        </div>

        {/* Main product info */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <div className="text-sm text-[var(--text-secondary)] mb-1">SKU</div>
            <div className="text-[var(--text-primary)] font-medium">
              {product?.sku || '-'}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-3 mb-1">
              Nom
            </div>
            <div className="text-[var(--text-primary)] font-medium">
              {product?.name || '-'}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-3 mb-1">
              Marque
            </div>
            <div className="text-[var(--text-primary)]">
              {product?.brand?.name || product?.brand || '-'}
            </div>
          </div>
          <div className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <div className="text-sm text-[var(--text-secondary)] mb-1">
              Réf. fabricant
            </div>
            <div className="text-[var(--text-primary)]">
              {product?.manufacturerRef || '-'}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-3 mb-1">
              Réfs. OEM
            </div>
            <div className="text-[var(--text-primary)] break-words">
              {product?.oemRefs &&
              Array.isArray(product.oemRefs) &&
              product.oemRefs.length > 0
                ? product.oemRefs.filter(ref => ref && ref.trim()).join(', ')
                : '-'}
            </div>
          </div>
          <div className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <div className="grid grid-cols-2 gap-3">
              {statCard('Prix vente', currency(product?.salePrice))}
              {statCard("Prix d'achat moyen", currency(product?.purchasePrice))}
              {statCard(
                'Dernier prix achat',
                currency(product?.lastPurchasePrice)
              )}
              {statCard('Stock', `${product?.stockQty ?? 0}`)}
            </div>
          </div>
        </div>

        {/* Supplier stats */}
        <div className="mb-8 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Fournisseurs
            </h2>
            <div className="text-sm text-[var(--text-secondary)]">
              Recommandé:{' '}
              {supplierStats?.recommendedSupplier?.supplierName ||
                supplierStats?.recommendedSupplierId ||
                '-'}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                  <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                    Fournisseur
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                    Dernier prix
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                    Prix moyen
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                    Qté totale
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                    Préféré
                  </th>
                </tr>
              </thead>
              <tbody>
                {(supplierStats?.suppliers || []).map((s, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[var(--border-color)]"
                  >
                    <td className="px-3 py-2 text-[var(--text-primary)]">
                      {s.supplierName || s.supplierId}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                      {currency(s.lastPurchasePrice || 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                      {currency(s.averagePurchasePrice || 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                      {s.totalQtyPurchased ?? 0}
                    </td>
                    <td className="px-3 py-2 text-center text-[var(--text-primary)]">
                      {s.isPreferred ? '✓' : ''}
                    </td>
                  </tr>
                ))}
                {(!supplierStats?.suppliers ||
                  supplierStats.suppliers.length === 0) && (
                  <tr>
                    <td
                      className="px-3 py-4 text-center text-[var(--text-secondary)]"
                      colSpan={5}
                    >
                      Aucun fournisseur
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Purchase statistics */}
        <div className="mb-8">
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {statCard('Qté achetée', `${purchaseStats?.totalQty ?? 0}`)}
            {statCard(
              'Montant achats',
              currency(purchaseStats?.totalAmount || 0)
            )}
            {statCard(
              'Prix achat moyen',
              currency(purchaseStats?.averagePrice || 0)
            )}
          </div>

          <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <div className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Dernières lignes d’achat
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                    <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Fournisseur
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      Qté reçue
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      Qté commandée
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      PU (HT)
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      Total (HT)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(purchaseHistory || []).map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[var(--border-color)]"
                    >
                      <td className="px-3 py-2 text-[var(--text-primary)]">
                        {row.orderDate
                          ? new Date(row.orderDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">
                        {row.supplierName || '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                        {row.qtyReceived ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                        {row.qtyOrdered ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                        {currency(row.unitPrice || 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                        {currency(row.totalExclTax || 0)}
                      </td>
                    </tr>
                  ))}
                  {(!purchaseHistory || purchaseHistory.length === 0) && (
                    <tr>
                      <td
                        className="px-3 py-4 text-center text-[var(--text-secondary)]"
                        colSpan={6}
                      >
                        Aucune ligne d’achat
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sales statistics */}
        <div className="mb-8">
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {statCard('Qté vendue', `${salesStats?.totalQty ?? 0}`)}
            {statCard('Montant ventes', currency(salesStats?.totalAmount || 0))}
            {statCard(
              'Prix vente moyen',
              currency(salesStats?.averagePrice || 0)
            )}
          </div>

          <div className="p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <div className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Dernières lignes de vente
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                    <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Client
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      Qté
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      PU (HT)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(salesHistory || []).map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[var(--border-color)]"
                    >
                      <td className="px-3 py-2 text-[var(--text-primary)]">
                        {row.date
                          ? new Date(row.date).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-primary)]">
                        {row.customerName || '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                        {row.qty ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)]">
                        {currency(row.unitPrice || 0)}
                      </td>
                    </tr>
                  ))}
                  {(!salesHistory || salesHistory.length === 0) && (
                    <tr>
                      <td
                        className="px-3 py-4 text-center text-[var(--text-secondary)]"
                        colSpan={4}
                      >
                        Aucune ligne de vente
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default function ProductAnalyticsPage() {
  return (
    <AuthGuard>
      <ProductAnalyticsInner />
    </AuthGuard>
  );
}
