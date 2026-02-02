'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import AuthGuard from '../../components/AuthGuard';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useAuth } from '../../lib/useAuth';
import { fetchPurchaseOrders } from '../../lib/purchases';
import { ShoppingCart, Loader2 } from 'lucide-react';

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
  const [statusFilter, setStatusFilter] = useState('all');
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
        status:
          statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
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

  const getInvoiceReference = purchaseOrder => {
    // Try to extract invoice reference from notes
    if (purchaseOrder.notes) {
      const match = purchaseOrder.notes.match(/Référence facture:\s*(.+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    // Fallback to orderNumber if no invoice reference found
    return purchaseOrder.orderNumber || '-';
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
              Bons de commande
            </h1>
            {companyName && (
              <p className="text-base text-muted-foreground">{companyName}</p>
            )}
          </div>
          <Button asChild>
            <Link href="/purchases/new">+ Nouveau bon de commande</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="PARTIAL">Partiel</SelectItem>
                <SelectItem value="RECEIVED">Reçu</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Purchase orders table */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
            <div className="text-muted-foreground">Chargement...</div>
          </CardContent>
        </Card>
      ) : purchaseOrders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <div className="text-muted-foreground text-lg">
              Aucun bon de commande. Créez votre premier bon de commande !
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Référence facture
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Fournisseur
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-foreground uppercase tracking-wide">
                      Montant total
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-foreground uppercase tracking-wide">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-foreground uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchaseOrders.map(po => {
                    const status = getStatusBadge(po.status);
                    return (
                      <tr
                        key={po._id || po.id}
                        className="hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-foreground font-semibold">
                          {getInvoiceReference(po)}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {po.supplierId?.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatDate(po.orderDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground font-semibold text-right">
                          {po.totalAmount !== undefined
                            ? `${po.totalAmount.toFixed(3)} TND`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/purchases/${po._id || po.id}`}>
                              Voir
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Card>
              <CardContent className="flex items-center justify-between pt-6">
                <div className="text-sm font-medium text-muted-foreground">
                  Page {pagination.page} sur {pagination.pages} (
                  {pagination.total} bons de commande)
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    variant="outline"
                    size="sm"
                  >
                    Précédent
                  </Button>
                  <Button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    variant="outline"
                    size="sm"
                  >
                    Suivant
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
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
