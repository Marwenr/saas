'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

import AuthGuard from '../../../components/AuthGuard';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { useAuth } from '../../../lib/useAuth';
import {
  fetchPurchaseOrder,
  receivePurchaseOrder,
} from '../../../lib/purchases';
import { Loader2 } from 'lucide-react';

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
        variant: 'secondary',
      },
      PENDING: {
        label: 'En attente',
        variant: 'warning',
      },
      PARTIAL: {
        label: 'Partiel',
        variant: 'info',
      },
      RECEIVED: {
        label: 'Reçu',
        variant: 'success',
      },
      CANCELLED: {
        label: 'Annulé',
        variant: 'destructive',
      },
    };
    return (
      statusMap[status] || {
        label: status,
        variant: 'secondary',
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

  const calculateSubTotal = () => {
    if (!purchaseOrder?.items) return 0;
    return purchaseOrder.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  const calculateTax = () => {
    if (!purchaseOrder?.items) return 0;
    return purchaseOrder.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      return sum + qty * price * (taxRate / 100);
    }, 0);
  };

  const calculateTotalWithTax = () => {
    return calculateSubTotal() + calculateTax();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="py-8">
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            Bon de commande non trouvé
          </div>
          <Button asChild className="mt-4">
            <Link href="/purchases">Retour à la liste</Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = getStatusBadge(purchaseOrder.status);

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            Bon de commande {purchaseOrder.orderNumber}
          </h1>
          <Button asChild variant="outline">
            <Link href="/purchases">Retour</Link>
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 shadow-sm">
          {error}
        </div>
      )}

      {/* Purchase Order Info */}
      <div className="mb-6 p-6 border border-border rounded-xl bg-card shadow-sm">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Informations générales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Fournisseur
            </div>
            <div className="text-foreground font-medium">
              {purchaseOrder.supplierId?.name || '-'}
            </div>
            {purchaseOrder.supplierId?.email && (
              <div className="text-sm text-muted-foreground">
                {purchaseOrder.supplierId.email}
              </div>
            )}
            {purchaseOrder.supplierId?.phone && (
              <div className="text-sm text-muted-foreground">
                {purchaseOrder.supplierId.phone}
              </div>
            )}
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Dates</div>
            <div className="text-foreground">
              <div>Date de commande: {formatDate(purchaseOrder.orderDate)}</div>
              {purchaseOrder.expectedDate && (
                <div>Date prévue: {formatDate(purchaseOrder.expectedDate)}</div>
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
            <div className="text-sm text-muted-foreground mb-1">Notes</div>
            <div className="text-foreground">{purchaseOrder.notes}</div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mb-6 p-6 border border-border rounded-xl bg-card shadow-sm">
        <h2 className="text-xl font-semibold text-foreground mb-4">Produits</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Produit
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  Quantité commandée
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  Quantité reçue
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  Restant
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  Prix unitaire
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  TVA (%)
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  Sous-total
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  Total
                </th>
                {purchaseOrder.status !== 'RECEIVED' &&
                  purchaseOrder.status !== 'CANCELLED' && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      Quantité à recevoir
                    </th>
                  )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchaseOrder.items?.map((item, index) => {
                const remaining = item.quantity - (item.receivedQuantity || 0);
                const canReceiveItem =
                  remaining > 0 &&
                  purchaseOrder.status !== 'RECEIVED' &&
                  purchaseOrder.status !== 'CANCELLED';

                return (
                  <tr
                    key={index}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground">
                      <div className="font-medium">
                        {item.productId?.manufacturerRef || '-'} -{' '}
                        {item.productId?.name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {item.receivedQuantity || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground font-medium">
                      {remaining}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {item.unitPrice?.toFixed(3) || '0.00'} TND
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {item.taxRate || 0}%
                    </td>
                    <td className="px-4 py-3 text-right text-foreground font-medium">
                      {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(
                        3
                      )}{' '}
                      TND
                    </td>
                    <td className="px-4 py-3 text-right text-foreground font-bold">
                      {(
                        (item.quantity || 0) *
                        (item.unitPrice || 0) *
                        (1 + (item.taxRate || 0) / 100)
                      ).toFixed(3)}{' '}
                      TND
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
                          className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all text-right"
                          placeholder="0"
                        />
                      </td>
                    )}
                    {!canReceiveItem &&
                      purchaseOrder.status !== 'RECEIVED' &&
                      purchaseOrder.status !== 'CANCELLED' && (
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          -
                        </td>
                      )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td
                  colSpan={
                    purchaseOrder.status === 'RECEIVED' ||
                    purchaseOrder.status === 'CANCELLED'
                      ? 7
                      : 8
                  }
                  className="px-4 py-3 text-right font-semibold text-foreground"
                >
                  Total:
                </td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">
                  {calculateSubTotal().toFixed(3)} TND
                </td>
                {purchaseOrder.status !== 'RECEIVED' &&
                  purchaseOrder.status !== 'CANCELLED' && <td></td>}
              </tr>
              <tr>
                <td
                  colSpan={
                    purchaseOrder.status === 'RECEIVED' ||
                    purchaseOrder.status === 'CANCELLED'
                      ? 7
                      : 8
                  }
                  className="px-4 py-3 text-right font-semibold text-foreground"
                >
                  Tax:
                </td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">
                  {calculateTax().toFixed(3)} TND
                </td>
                {purchaseOrder.status !== 'RECEIVED' &&
                  purchaseOrder.status !== 'CANCELLED' && <td></td>}
              </tr>
              <tr className="border-t-2 border-border">
                <td
                  colSpan={
                    purchaseOrder.status === 'RECEIVED' ||
                    purchaseOrder.status === 'CANCELLED'
                      ? 7
                      : 8
                  }
                  className="px-4 py-3 text-right font-bold text-foreground"
                >
                  Total incluant tax:
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground">
                  {calculateTotalWithTax().toFixed(3)} TND
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
            <Button
              onClick={handleReceive}
              disabled={receiving || !canReceive()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {receiving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Réception en cours...
                </>
              ) : (
                'Recevoir les produits'
              )}
            </Button>
          </div>
        )}
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
