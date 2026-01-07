'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import ProductForm from '../../components/ProductForm';
import { useAuth } from '../../lib/useAuth';
import { fetchProducts, deleteProduct } from '../../lib/products';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { DataTable } from '../../components/ui/data-table';
import { Package, Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

/**
 * Products page - Catalogue Pièces
 */
function ProductsPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadProducts();
    }
  }, [authLoading, isAuthenticated, pagination.page, search]);

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
    setPagination(prev => ({ ...prev, page: 1 }));
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
    try {
      setDeleting(productId);
      await deleteProduct(productId);
      toast({
        title: 'Product deleted',
        description: 'Product has been deleted successfully.',
      });
      await loadProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
    loadProducts();
  };

  const formatPrice = price => {
    if (price === undefined || price === null || price === '') {
      return '-';
    }
    const numPrice =
      typeof price === 'string' ? parseFloat(price) : Number(price);
    if (isNaN(numPrice)) {
      return '-';
    }
    return `${numPrice.toFixed(2)} TND`;
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

  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      accessorKey: 'sku',
      cell: row => <div className="font-medium">{row.sku || '-'}</div>,
    },
    {
      key: 'name',
      header: 'Nom',
      accessorKey: 'name',
      cell: row => <div>{row.name || '-'}</div>,
    },
    {
      key: 'brand',
      header: 'Marque',
      cell: row => (
        <div className="text-muted-foreground">
          {row.brand?.name || row.brand || '-'}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Catégorie',
      accessorKey: 'category',
      cell: row => (
        <div className="text-muted-foreground">{row.category || '-'}</div>
      ),
    },
    {
      key: 'salePrice',
      header: 'Prix de vente (TTC)',
      cell: row => (
        <div className="font-semibold">{formatPrice(row.salePrice)}</div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: row => (
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => handleEdit(row)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting === (row._id || row.id)}
              >
                {deleting === (row._id || row.id) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action ne peut pas être annulée. Cela supprimera
                  définitivement le produit &quot;{row.name}&quot;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(row._id || row.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Catalogue Pièces
          </h1>
          {companyName && (
            <p className="text-muted-foreground mt-1">{companyName}</p>
          )}
        </div>
      </div>

      {/* Search and Add */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <form
              onSubmit={handleSearch}
              className="flex-1 max-w-md flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Rechercher par nom, SKU, OEM..."
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="default">
                Rechercher
              </Button>
            </form>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une pièce
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Products table */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground">Chargement...</div>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-lg text-muted-foreground">
              {search
                ? 'Aucun produit trouvé'
                : 'Aucun produit. Ajoutez votre première pièce !'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Produits</CardTitle>
              <CardDescription>
                {pagination.total} produit{pagination.total !== 1 ? 's' : ''} au
                total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={products}
                emptyMessage="Aucun produit trouvé"
                loading={loading}
                onRowClick={row =>
                  router.push(`/products/${row._id || row.id}`)
                }
              />
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground">
                    Page {pagination.page} sur {pagination.pages} (
                    {pagination.total} produits)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleFormClose}
          open={showForm}
        />
      )}
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
