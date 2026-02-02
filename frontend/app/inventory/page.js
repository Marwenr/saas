'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import StockAdjustmentForm from '../../components/StockAdjustmentForm';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useAuth } from '../../lib/useAuth';
import { fetchProducts } from '../../lib/products';
import { fetchLowStockProducts } from '../../lib/inventory';
import { Package, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Inventory page - Stock management
 */
function InventoryPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load products
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadProducts();
    }
  }, [authLoading, isAuthenticated, pagination.page, lowStockOnly]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let data;
      if (lowStockOnly) {
        data = await fetchLowStockProducts({
          page: pagination.page,
          limit: pagination.limit,
        });
        setProducts(data.products || []);
        setPagination(data.pagination || pagination);
      } else {
        data = await fetchProducts({
          page: pagination.page,
          limit: pagination.limit,
          search: '',
        });
        setProducts(data.products || []);
        setPagination(data.pagination || pagination);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Failed to load products');
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

  const handleAdjustStock = product => {
    setSelectedProduct(product);
    setShowAdjustmentForm(true);
  };

  const handleAdjustmentSuccess = () => {
    // Reload products after successful adjustment
    loadProducts();
  };

  const handleAdjustmentClose = () => {
    setShowAdjustmentForm(false);
    setSelectedProduct(null);
  };

  const handleLowStockToggle = () => {
    setLowStockOnly(!lowStockOnly);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const getStockStatus = product => {
    const stockQty = product.stockQty !== undefined ? product.stockQty : 0;
    const minStock = product.minStock !== undefined ? product.minStock : 0;

    if (stockQty <= minStock) {
      return {
        label: 'Stock faible',
        variant: 'warning',
      };
    }
    return {
      label: 'OK',
      variant: 'success',
    };
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            Inventaire
          </h1>
          {companyName && (
            <p className="text-base text-muted-foreground">{companyName}</p>
          )}
        </div>

        {/* Low stock toggle */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={handleLowStockToggle}
                className="w-5 h-5 text-primary border-border rounded focus:ring-primary focus:ring-2"
              />
              <span className="text-sm font-semibold text-foreground">
                Afficher uniquement les produits en stock faible
              </span>
            </label>
          </CardContent>
        </Card>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Products table */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
            <div className="text-muted-foreground">Chargement...</div>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <div className="text-muted-foreground text-lg">
              {lowStockOnly
                ? 'Aucun produit en stock faible'
                : 'Aucun produit. Ajoutez des produits dans le catalogue !'}
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
                      Réf. fabricant
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Nom
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Marque
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-foreground uppercase tracking-wide">
                      Stock actuel
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-foreground uppercase tracking-wide">
                      Stock minimum
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
                  {products.map(product => {
                    const stockQty =
                      product.stockQty !== undefined ? product.stockQty : 0;
                    const minStock =
                      product.minStock !== undefined ? product.minStock : 0;
                    const status = getStockStatus(product);

                    return (
                      <tr
                        key={product._id || product.id}
                        className="hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-foreground font-medium">
                          {product.manufacturerRef || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {product.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {product.brand?.name || product.brand || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground font-semibold text-right">
                          {stockQty}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground text-right">
                          {minStock}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge
                            variant={
                              status.variant === 'warning'
                                ? 'outline'
                                : 'outline'
                            }
                            className={cn(
                              status.variant === 'warning'
                                ? 'bg-warning/10 text-warning border-warning/20'
                                : 'bg-success/10 text-success border-success/20'
                            )}
                          >
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            onClick={() => handleAdjustStock(product)}
                            variant="default"
                            size="sm"
                          >
                            Ajuster stock
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
                  {pagination.total} produits)
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

      {/* Stock Adjustment Form Modal */}
      {showAdjustmentForm && selectedProduct && (
        <StockAdjustmentForm
          product={selectedProduct}
          onClose={handleAdjustmentClose}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
    </div>
  );
}

export default function Inventory() {
  return (
    <AuthGuard>
      <InventoryPage />
    </AuthGuard>
  );
}
