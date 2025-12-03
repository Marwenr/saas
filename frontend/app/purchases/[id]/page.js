'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Container from '../../../components/Container';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/useAuth';
import {
  fetchPurchaseOrder,
  receivePurchaseOrder,
} from '../../../lib/purchases';

/**
 * Purchase Order Detail page - Détail du bon de commande et réception
 */
function PurchaseOrderDetailPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const poId = params.id;

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [error, setError] = useState(null);

  // Receipt quantities for each item
  const [receiptQuantities, setReceiptQuantities] = useState({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load purchase order
  useEffect(() => {
    if (!authLoading && isAuthenticated && poId) {
      loadPurchaseOrder();
    }
  }, [authLoading, isAuthenticated, poId]);

  const loadPurchaseOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPurchaseOrder(poId);
      setPurchaseOrder(data.purchaseOrder);

      // Initialize receipt quantities
      const initialReceipts = {};
      if (data.purchaseOrder?.items) {
        data.purchaseOrder.items.forEach((item, index) => {
          const remaining = item.quantity - (item.receivedQuantity || 0);
          initialReceipts[index] = remaining > 0 ? remaining : 0;
        });
      }
      setReceiptQuantities(initialReceipts);
    } catch (err) {
      console.error('Failed to load purchase order:', err);
      setError(err.message || 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptQuantityChange = (itemIndex, value) => {
    const qty = parseFloat(value) || 0;
    setReceiptQuantities(prev => ({
      ...prev,
      [itemIndex]: qty,
    }));
  };

  const handleReceive = async () => {
    if (!purchaseOrder) return;

    setError(null);
    setReceiving(true);

    try {
      // Build items array for receipt
      const receiptItems = [];
      purchaseOrder.items.forEach((item, index) => {
        const qtyToReceive = receiptQuantities[index];
        if (qtyToReceive && qtyToReceive > 0) {
          const remaining = item.quantity - (item.receivedQuantity || 0);
          if (qtyToReceive > remaining) {
            throw new Error(
              `Ligne ${index + 1}: Quantité à recevoir (${qtyToReceive}) supérieure à la quantité restante (${remaining})`
            );
          }
          receiptItems.push({
            itemIndex: index,
            receivedQuantity: qtyToReceive,
          });
        }
      });

      if (receiptItems.length === 0) {
        throw new Error('Veuillez spécifier les quantités à recevoir');
      }

      await receivePurchaseOrder(poId, receiptItems);

      // Reload purchase order to show updated status
      await loadPurchaseOrder();

      // Clear receipt quantities
      setReceiptQuantities({});
    } catch (err) {
      console.error('Failed to receive purchase order:', err);
      setError(err.message || 'Échec de la réception du bon de commande');
    } finally {
      setReceiving(false);
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

  const canReceive = () => {
    if (!purchaseOrder) return false;
    if (
      purchaseOrder.status === 'RECEIVED' ||
      purchaseOrder.status === 'CANCELLED'
    )
      return false;
    return Object.values(receiptQuantities).some(qty => qty > 0);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="py-8">
        <Container>
          <div className="text-center py-12">
            <div className="text-[var(--text-secondary)]">
              Bon de commande non trouvé
            </div>
            <Link
              href="/purchases"
              className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retour à la liste
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const status = getStatusBadge(purchaseOrder.status);

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-[var(--text-primary)]">
              Bon de commande {purchaseOrder.orderNumber}
            </h1>
            <Link
              href="/purchases"
              className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Retour
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`inline-block px-3 py-1 rounded text-sm font-medium ${status.className}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Purchase Order Info */}
        <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Informations générales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Fournisseur
              </div>
              <div className="text-[var(--text-primary)] font-medium">
                {purchaseOrder.supplierId?.name || '-'}
              </div>
              {purchaseOrder.supplierId?.email && (
                <div className="text-sm text-[var(--text-secondary)]">
                  {purchaseOrder.supplierId.email}
                </div>
              )}
              {purchaseOrder.supplierId?.phone && (
                <div className="text-sm text-[var(--text-secondary)]">
                  {purchaseOrder.supplierId.phone}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Dates
              </div>
              <div className="text-[var(--text-primary)]">
                <div>
                  Date de commande: {formatDate(purchaseOrder.orderDate)}
                </div>
                {purchaseOrder.expectedDate && (
                  <div>
                    Date prévue: {formatDate(purchaseOrder.expectedDate)}
                  </div>
                )}
                {purchaseOrder.receivedAt && (
                  <div>
                    Date de réception: {formatDate(purchaseOrder.receivedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
          {purchaseOrder.notes && (
            <div className="mt-4">
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Notes
              </div>
              <div className="text-[var(--text-primary)]">
                {purchaseOrder.notes}
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Produits
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                    Produit
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                    Quantité commandée
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                    Quantité reçue
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                    Restant
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                    Prix unitaire
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                    TVA (%)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                    Sous-total
                  </th>
                  {purchaseOrder.status !== 'RECEIVED' &&
                    purchaseOrder.status !== 'CANCELLED' && (
                      <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                        Quantité à recevoir
                      </th>
                    )}
                </tr>
              </thead>
              <tbody>
                {purchaseOrder.items?.map((item, index) => {
                  const remaining =
                    item.quantity - (item.receivedQuantity || 0);
                  const canReceiveItem =
                    remaining > 0 &&
                    purchaseOrder.status !== 'RECEIVED' &&
                    purchaseOrder.status !== 'CANCELLED';

                  return (
                    <tr
                      key={index}
                      className="border-b border-[var(--border-color)]"
                    >
                      <td className="px-4 py-3 text-[var(--text-primary)]">
                        <div className="font-medium">
                          {item.productId?.sku || '-'} -{' '}
                          {item.productId?.name || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                        {item.receivedQuantity || 0}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-primary)] font-medium">
                        {remaining}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                        {item.unitPrice?.toFixed(2) || '0.00'} TND
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-primary)]">
                        {item.taxRate || 0}%
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-primary)] font-medium">
                        {item.subtotal?.toFixed(2) || '0.00'} TND
                      </td>
                      {canReceiveItem && (
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            step="1"
                            value={receiptQuantities[index] || ''}
                            onChange={e =>
                              handleReceiptQuantityChange(index, e.target.value)
                            }
                            className="w-full px-2 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                            placeholder="0"
                          />
                        </td>
                      )}
                      {!canReceiveItem &&
                        purchaseOrder.status !== 'RECEIVED' &&
                        purchaseOrder.status !== 'CANCELLED' && (
                          <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                            -
                          </td>
                        )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={
                      purchaseOrder.status === 'RECEIVED' ||
                      purchaseOrder.status === 'CANCELLED'
                        ? 6
                        : 7
                    }
                    className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]"
                  >
                    Total:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">
                    {purchaseOrder.totalAmount?.toFixed(2) || '0.00'} TND
                  </td>
                  {purchaseOrder.status !== 'RECEIVED' &&
                    purchaseOrder.status !== 'CANCELLED' && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Receive button */}
        {purchaseOrder.status !== 'RECEIVED' &&
          purchaseOrder.status !== 'CANCELLED' && (
            <div className="flex justify-end">
              <button
                onClick={handleReceive}
                disabled={receiving || !canReceive()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {receiving ? 'Réception en cours...' : 'Recevoir les produits'}
              </button>
            </div>
          )}
      </Container>
    </div>
  );
}

export default function PurchaseOrderDetail() {
  return (
    <AuthGuard>
      <PurchaseOrderDetailPage />
    </AuthGuard>
  );
}
