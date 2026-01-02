'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import StockAdjustmentForm from '../../components/StockAdjustmentForm';
import Button from '../../components/Button';
import { useAuth } from '../../lib/useAuth';
import { fetchProducts } from '../../lib/products';
import { fetchLowStockProducts } from '../../lib/inventory';
import { Package } from 'lucide-react';

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
        className:
          'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      };
    }
    return {
      label: 'OK',
      className:
        'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    };
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
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
              Inventaire
            </h1>
            {companyName && (
              <p className="text-base text-[var(--text-secondary)]">
                {companyName}
              </p>
            )}
          </div>

          {/* Low stock toggle */}
          <div className="p-6 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={handleLowStockToggle}
                className="w-5 h-5 text-purple-600 border-[var(--border-color)] rounded focus:ring-purple-500 focus:ring-2"
              />
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Afficher uniquement les produits en stock faible
              </span>
            </label>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 shadow-sm">
            {error}
          </div>
        )}

        {/* Products table */}
        {loading ? (
          <div className="text-center py-16 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <div className="text-[var(--text-secondary)]">Chargement...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="text-[var(--text-secondary)] text-lg">
              {lowStockOnly
                ? 'Aucun produit en stock faible'
                : 'Aucun produit. Ajoutez des produits dans le catalogue !'}
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
                        SKU
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Nom
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Marque
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Stock actuel
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Stock minimum
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
                    {products.map(product => {
                      const stockQty =
                        product.stockQty !== undefined ? product.stockQty : 0;
                      const minStock =
                        product.minStock !== undefined ? product.minStock : 0;
                      const status = getStockStatus(product);

                      return (
                        <tr
                          key={product._id || product.id}
                          className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-medium">
                            {product.sku || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                            {product.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {product.brand?.name || product.brand || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-semibold text-right">
                            {stockQty}
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-secondary)] text-right">
                            {minStock}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              onClick={() => handleAdjustStock(product)}
                              variant="primary"
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
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between p-4 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
                <div className="text-sm font-medium text-[var(--text-secondary)]">
                  Page {pagination.page} sur {pagination.pages} (
                  {pagination.total} produits)
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

        {/* Stock Adjustment Form Modal */}
        {showAdjustmentForm && selectedProduct && (
          <StockAdjustmentForm
            product={selectedProduct}
            onClose={handleAdjustmentClose}
            onSuccess={handleAdjustmentSuccess}
          />
        )}
      </Container>
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
