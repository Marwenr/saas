'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import ProductForm from '../../components/ProductForm';
import { useAuth } from '../../lib/useAuth';
import { fetchProducts, deleteProduct } from '../../lib/products';
import Button from '../../components/Button';

/**
 * Products page - Catalogue Pièces
 */
function ProductsPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleting, setDeleting] = useState(null);

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
  }, [authLoading, isAuthenticated, pagination.page, search]);

  // Reload products when page becomes visible (to get updated prices after purchase order reception)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        !authLoading &&
        isAuthenticated
      ) {
        loadProducts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authLoading, isAuthenticated]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts({
        page: pagination.page,
        limit: pagination.limit,
        search: search,
      });
      setProducts(data.products || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = e => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = newPage => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = product => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async productId => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      return;
    }

    try {
      setDeleting(productId);
      await deleteProduct(productId);
      // Reload products
      await loadProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert(err.message || 'Failed to delete product');
    } finally {
      setDeleting(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
    loadProducts(); // Reload products after form submission
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
      <Container>
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                Catalogue Pièces
              </h1>
              {companyName && (
                <p className="text-base text-[var(--text-secondary)]">
                  {companyName}
                </p>
              )}
            </div>
          </div>

          {/* Search and Add button */}
          <div className="p-6 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <form onSubmit={handleSearch} className="flex-1 max-w-md">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Rechercher par nom, SKU, OEM..."
                    className="flex-1 px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                  <Button type="submit" variant="primary" size="md">
                    Rechercher
                  </Button>
                </div>
              </form>
              <Button
                variant="primary"
                size="md"
                onClick={handleAdd}
                className="whitespace-nowrap"
              >
                + Ajouter une pièce
              </Button>
            </div>
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
            <div className="text-4xl mb-3">📦</div>
            <div className="text-[var(--text-secondary)] text-lg">
              {search
                ? 'Aucun produit trouvé'
                : 'Aucun produit. Ajoutez votre première pièce !'}
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
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Catégorie
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Prix de vente (TTC)
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {products.map(product => (
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
                          {product.brand || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {product.category || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-semibold">
                          {(() => {
                            const price = product.salePrice;
                            if (
                              price === undefined ||
                              price === null ||
                              price === ''
                            ) {
                              return '-';
                            }
                            // Ensure we have a valid number
                            const numPrice =
                              typeof price === 'string'
                                ? parseFloat(price)
                                : Number(price);
                            if (isNaN(numPrice)) {
                              return '-';
                            }
                            return `${numPrice.toFixed(2)} TND`;
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEdit(product)}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                handleDelete(product._id || product.id)
                              }
                              disabled={
                                deleting === (product._id || product.id)
                              }
                              loading={deleting === (product._id || product.id)}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                    variant="secondary"
                    size="md"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Product Form Modal */}
        {showForm && (
          <ProductForm product={editingProduct} onClose={handleFormClose} />
        )}
      </Container>
    </div>
  );
}

export default function Products() {
  return (
    <AuthGuard>
      <ProductsPage />
    </AuthGuard>
  );
}
