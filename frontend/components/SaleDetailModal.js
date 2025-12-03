'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchSale } from '../lib/pos';

export default function SaleDetailModal({ saleId, isOpen, onClose }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sale, setSale] = useState(null);

  useEffect(() => {
    if (isOpen && saleId) {
      loadSale();
    } else {
      setSale(null);
      setError(null);
      setLoading(true);
    }
  }, [isOpen, saleId]);

  const loadSale = async () => {
    if (!saleId) return;
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

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = e => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const customer = sale?.customerId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-color)] p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Détail de la vente
            </h2>
            {sale?.reference && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Référence: {sale.reference}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {customer && (
              <button
                onClick={() => {
                  onClose();
                  router.push(`/clients/${customer._id || customer.id}`);
                }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Client
              </button>
            )}
            {customer && (
              <button
                onClick={() => {
                  onClose();
                  router.push(`/clients/${customer._id || customer.id}/sales`);
                }}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Historique
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
              title="Fermer (ESC)"
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
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-[var(--text-secondary)]">Chargement...</div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          ) : !sale ? (
            <div className="text-center py-12">
              <div className="text-[var(--text-secondary)]">
                Vente non trouvée
              </div>
            </div>
          ) : (
            <>
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
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sale Information */}
                <div className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                    Informations de vente
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="text-xs text-[var(--text-secondary)] mb-1">
                        Date de vente
                      </div>
                      <div className="text-[var(--text-primary)] font-medium">
                        {new Date(
                          sale.saleDate || sale.createdAt
                        ).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-secondary)] mb-1">
                        Créée par
                      </div>
                      <div className="text-[var(--text-primary)]">
                        {sale.createdBy?.name || sale.createdBy?.email || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-secondary)] mb-1">
                        Mode de paiement
                      </div>
                      <div>{getPaymentMethodBadge(sale.paymentMethod)}</div>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                    Client
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="text-xs text-[var(--text-secondary)] mb-1">
                        Nom
                      </div>
                      <div className="text-[var(--text-primary)] font-medium">
                        {customer ? (
                          <>
                            {customer.firstName} {customer.lastName}
                            {customer.internalCode && (
                              <span className="ml-2 text-xs text-[var(--text-secondary)]">
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
                        <div className="text-xs text-[var(--text-secondary)] mb-1">
                          Véhicule
                        </div>
                        <div className="text-[var(--text-primary)]">
                          <div className="font-medium">
                            {sale.vehicleInfo.brand} {sale.vehicleInfo.model}
                            {sale.vehicleInfo.year &&
                              ` (${sale.vehicleInfo.year})`}
                          </div>
                          {sale.vehicleInfo.vin && (
                            <div className="text-xs text-[var(--text-secondary)]">
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
              <div className="mb-6 p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  Articles ({sale.items?.length || 0})
                </h3>
                {sale.items && sale.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-color)]">
                          <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-primary)]">
                            Produit
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-primary)]">
                            SKU
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-[var(--text-primary)]">
                            Qté
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">
                            Prix avant remise
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-[var(--text-primary)]">
                            Taux remise
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">
                            Prix après remise
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-[var(--text-primary)]">
                            TVA
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">
                            Total HT
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">
                            Total TTC
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sale.items.map((item, index) => {
                          const product = item.productId;
                          const baseUnitPrice =
                            item.baseUnitPrice || item.unitPrice || 0;
                          const discountRate = item.discountRate || 0;
                          const finalUnitPrice = item.unitPrice || 0;
                          const hasDiscount =
                            discountRate > 0 &&
                            baseUnitPrice !== finalUnitPrice;

                          return (
                            <tr
                              key={index}
                              className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                            >
                              <td className="px-2 py-2 text-[var(--text-primary)]">
                                <div className="font-medium">
                                  {item.name || '-'}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-[var(--text-secondary)]">
                                {item.sku || product?.sku || '-'}
                              </td>
                              <td className="px-2 py-2 text-center text-[var(--text-primary)]">
                                {item.qty || 0}
                              </td>
                              <td className="px-2 py-2 text-right text-[var(--text-primary)]">
                                {baseUnitPrice.toFixed(2)} TND
                              </td>
                              <td className="px-2 py-2 text-center text-[var(--text-primary)]">
                                {hasDiscount ? (
                                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                                    {discountRate.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-secondary)]">
                                    0%
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-right text-[var(--text-primary)]">
                                {hasDiscount ? (
                                  <span className="text-green-600 dark:text-green-400 font-medium">
                                    {finalUnitPrice.toFixed(2)} TND
                                  </span>
                                ) : (
                                  <span>{finalUnitPrice.toFixed(2)} TND</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center text-[var(--text-primary)]">
                                {item.taxRate || 0}%
                              </td>
                              <td className="px-2 py-2 text-right text-[var(--text-primary)]">
                                {item.totalExclTax?.toFixed(2) || '0.00'} TND
                              </td>
                              <td className="px-2 py-2 text-right font-medium text-[var(--text-primary)]">
                                {item.totalInclTax?.toFixed(2) || '0.00'} TND
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[var(--border-color)]">
                          <td
                            colSpan="7"
                            className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-primary)]"
                          >
                            Sous-total HT:
                          </td>
                          <td className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">
                            {sale.totalExclTax?.toFixed(2) || '0.00'} TND
                          </td>
                          <td></td>
                        </tr>
                        <tr>
                          <td
                            colSpan="7"
                            className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-primary)]"
                          >
                            TVA:
                          </td>
                          <td className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">
                            {sale.totalTax?.toFixed(2) || '0.00'} TND
                          </td>
                          <td></td>
                        </tr>
                        {sale.loyaltyDiscountAmount > 0 && (
                          <tr>
                            <td
                              colSpan="7"
                              className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-primary)]"
                            >
                              {sale.loyaltyDiscount
                                ? `Remise fidélité (${sale.loyaltyDiscount}%):`
                                : 'Remise:'}
                            </td>
                            <td className="px-2 py-2 text-right text-xs font-semibold text-green-600 dark:text-green-400">
                              -
                              {sale.loyaltyDiscountAmount?.toFixed(2) || '0.00'}{' '}
                              TND
                            </td>
                            <td></td>
                          </tr>
                        )}
                        <tr className="border-t-2 border-[var(--border-color)]">
                          <td
                            colSpan="7"
                            className="px-2 py-2 text-right text-base font-bold text-[var(--text-primary)]"
                          >
                            Total TTC:
                          </td>
                          <td className="px-2 py-2 text-right text-base font-bold text-[var(--text-primary)]">
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
              <div className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                  Informations système
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-[var(--text-secondary)] mb-1">
                      Créée le
                    </div>
                    <div className="text-[var(--text-primary)]">
                      {sale.createdAt
                        ? new Date(sale.createdAt).toLocaleString('fr-FR')
                        : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-secondary)] mb-1">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
