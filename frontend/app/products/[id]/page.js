'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
        <div className="text-muted-foreground">Chargement...</div>
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
    <div className="p-4 border border-border rounded-lg bg-card">
      <div className="text-sm text-muted-foreground mb-1">{title}</div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      {sub ? (
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      ) : null}
    </div>
  );

  const currency = v => `${(v || 0).toFixed(3)} TND`;

  // Calculate decomposed pricing
  const decomposePricing = product => {
    if (!product) {
      return {
        lastPurchasePrice: 0,
        cmpPrice: 0,
        priceHT: 0,
        priceWithoutMargin: 0,
        marginRate: 0,
        taxRate: 0,
        salePriceTTC: 0,
        marginAmount: 0,
        taxAmount: 0,
      };
    }

    const salePriceTTC = Number(product.salePrice) || 0;
    const taxRate = Number(product.taxRate) || 0;
    const marginRate = Number(product.marginRate) || 0;
    const cmpPrice = Number(product.purchasePrice) || 0;
    const lastPurchasePrice = Number(product.lastPurchasePrice) || 0;

    // Calculate price HT (without tax): priceHT = salePriceTTC / (1 + taxRate/100)
    let priceHT = 0;
    if (salePriceTTC > 0 && taxRate >= 0) {
      priceHT = salePriceTTC / (1 + taxRate / 100);
    }

    // Price without margin = CMP (purchasePrice)
    const priceWithoutMargin = cmpPrice;

    // Calculate margin amount: priceHT - priceWithoutMargin
    const marginAmount = priceHT - priceWithoutMargin;

    // Calculate tax amount: salePriceTTC - priceHT
    const taxAmount = salePriceTTC - priceHT;

    return {
      lastPurchasePrice: Math.round(lastPurchasePrice * 1000) / 1000,
      cmpPrice: Math.round(cmpPrice * 1000) / 1000,
      priceHT: Math.round(priceHT * 1000) / 1000,
      priceWithoutMargin: Math.round(priceWithoutMargin * 1000) / 1000,
      marginRate: Math.round(marginRate * 1000) / 1000,
      taxRate: Math.round(taxRate * 1000) / 1000,
      salePriceTTC: Math.round(salePriceTTC * 1000) / 1000,
      marginAmount: Math.round(marginAmount * 1000) / 1000,
      taxAmount: Math.round(taxAmount * 1000) / 1000,
    };
  };

  const pricing = decomposePricing(product);

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Détails produit
        </h1>
        <div className="text-muted-foreground">
          ID: {product?._id} — Dernière mise à jour:{' '}
          {product?.updatedAt
            ? new Date(product.updatedAt).toLocaleString()
            : '-'}
        </div>
      </div>

      {/* Main product info */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border border-border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground mb-1">
            Réf. fabricant
          </div>
          <div className="text-foreground font-medium">
            {product?.manufacturerRef || '-'}
          </div>
          <div className="text-sm text-muted-foreground mt-3 mb-1">Nom</div>
          <div className="text-foreground font-medium">
            {product?.name || '-'}
          </div>
          <div className="text-sm text-muted-foreground mt-3 mb-1">Marque</div>
          <div className="text-foreground">
            {product?.brand?.name || product?.brand || '-'}
          </div>
        </div>
        <div className="p-4 border border-border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground mb-1">
            Réf. fabricant
          </div>
          <div className="text-foreground">
            {product?.manufacturerRef || '-'}
          </div>
          <div className="text-sm text-muted-foreground mt-3 mb-1">
            Réfs. OEM
          </div>
          <div className="text-foreground break-words">
            {product?.oemRefs &&
            Array.isArray(product.oemRefs) &&
            product.oemRefs.length > 0
              ? product.oemRefs.filter(ref => ref && ref.trim()).join(', ')
              : '-'}
          </div>
        </div>
        <div className="p-4 border border-border rounded-lg bg-card">
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

      {/* Detailed Pricing Information */}
      <div className="mb-6 p-6 border border-border rounded-lg bg-card">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Détails des prix
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-border rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">
              Dernier prix acheté (HT)
            </div>
            <div className="text-lg font-semibold text-foreground">
              {currency(pricing.lastPurchasePrice)}
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">
              Prix après CMP (Coût Moyen Pondéré)
            </div>
            <div className="text-lg font-semibold text-foreground">
              {currency(pricing.cmpPrice)}
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">
              Prix sans marge de gain
            </div>
            <div className="text-lg font-semibold text-foreground">
              {currency(pricing.priceWithoutMargin)}
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">
              Prix HT (sans taxe)
            </div>
            <div className="text-lg font-semibold text-foreground">
              {currency(pricing.priceHT)}
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">
              Marge de gain
            </div>
            <div className="text-lg font-semibold text-foreground">
              {pricing.marginRate.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Montant: {currency(pricing.marginAmount)}
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-muted/30">
            <div className="text-sm text-muted-foreground mb-1">
              Taux de TVA
            </div>
            <div className="text-lg font-semibold text-foreground">
              {pricing.taxRate.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Montant: {currency(pricing.taxAmount)}
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-primary/10">
            <div className="text-sm text-muted-foreground mb-1">
              Prix de vente TTC
            </div>
            <div className="text-2xl font-bold text-foreground">
              {currency(pricing.salePriceTTC)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              = {currency(pricing.priceWithoutMargin)} (CMP) +{' '}
              {currency(pricing.marginAmount)} (Marge{' '}
              {pricing.marginRate.toFixed(2)}%) + {currency(pricing.taxAmount)}{' '}
              (TVA {pricing.taxRate.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Supplier stats */}
      <div className="mb-8 p-6 border border-border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Fournisseurs
          </h2>
          <div className="text-sm text-muted-foreground">
            Recommandé:{' '}
            {supplierStats?.recommendedSupplier?.supplierName ||
              supplierStats?.recommendedSupplierId ||
              '-'}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 text-left text-sm font-semibold text-foreground">
                  Fournisseur
                </th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                  Dernier prix
                </th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                  Prix moyen
                </th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                  Qté totale
                </th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-foreground">
                  Préféré
                </th>
              </tr>
            </thead>
            <tbody>
              {(supplierStats?.suppliers || []).map((s, idx) => (
                <tr key={idx} className="border-b border-border">
                  <td className="px-3 py-2 text-foreground">
                    {s.supplierName || s.supplierId}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground">
                    {currency(s.lastPurchasePrice || 0)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground">
                    {currency(s.averagePurchasePrice || 0)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground">
                    {s.totalQtyPurchased ?? 0}
                  </td>
                  <td className="px-3 py-2 text-center text-foreground">
                    {s.isPreferred ? '✓' : ''}
                  </td>
                </tr>
              ))}
              {(!supplierStats?.suppliers ||
                supplierStats.suppliers.length === 0) && (
                <tr>
                  <td
                    className="px-3 py-4 text-center text-muted-foreground"
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

        <div className="p-6 border border-border rounded-lg bg-card">
          <div className="text-lg font-semibold text-foreground mb-3">
            Dernières lignes d'achat
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground">
                    Fournisseur
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                    Qté reçue
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                    Qté commandée
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                    PU (HT)
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                    Total (HT)
                  </th>
                </tr>
              </thead>
              <tbody>
                {(purchaseHistory || []).map((row, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-3 py-2 text-foreground">
                      {row.orderDate
                        ? new Date(row.orderDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {row.supplierName || '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {row.qtyReceived ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {row.qtyOrdered ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {currency(row.unitPrice || 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {currency(row.totalExclTax || 0)}
                    </td>
                  </tr>
                ))}
                {(!purchaseHistory || purchaseHistory.length === 0) && (
                  <tr>
                    <td
                      className="px-3 py-4 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      Aucune ligne d'achat
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

        <div className="p-6 border border-border rounded-lg bg-card">
          <div className="text-lg font-semibold text-foreground mb-3">
            Dernières lignes de vente
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground">
                    Client
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                    Qté
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                    PU (HT)
                  </th>
                </tr>
              </thead>
              <tbody>
                {(salesHistory || []).map((row, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="px-3 py-2 text-foreground">
                      {row.date ? new Date(row.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {row.customerName || '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {row.qty ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {currency(row.unitPrice || 0)}
                    </td>
                  </tr>
                ))}
                {(!salesHistory || salesHistory.length === 0) && (
                  <tr>
                    <td
                      className="px-3 py-4 text-center text-muted-foreground"
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
