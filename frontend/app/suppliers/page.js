'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import AuthGuard from '../../components/AuthGuard';
import SupplierForm from '../../components/SupplierForm';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../lib/useAuth';
import { fetchSuppliers, deleteSupplier } from '../../lib/suppliers';
import { Building2 } from 'lucide-react';

/**
 * Suppliers page - Gestion des fournisseurs
 */
function SuppliersPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState([]);
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
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSuppliers({
        page: pagination.page,
        limit: pagination.limit,
        search: search,
      });
      setSuppliers(data.suppliers || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search]);

  // Load suppliers
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadSuppliers();
    }
  }, [authLoading, isAuthenticated, loadSuppliers]);

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
    setEditingSupplier(null);
    setShowForm(true);
  };

  const handleEdit = supplier => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = async supplierId => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      return;
    }

    try {
      setDeleting(supplierId);
      await deleteSupplier(supplierId);
      // Reload suppliers
      await loadSuppliers();
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      alert(err.message || 'Failed to delete supplier');
    } finally {
      setDeleting(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSupplier(null);
    loadSuppliers(); // Reload suppliers after form submission
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8 min-h-screen bg-background">
      {/* Modern Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
              Fournisseurs
            </h1>
            {companyName && (
              <p className="text-base text-muted-foreground">{companyName}</p>
            )}
          </div>
          <Button onClick={handleAdd} variant="primary" size="md">
            + Ajouter un fournisseur
          </Button>
        </div>

        {/* Search and Add button */}
        <div className="p-6 bg-card rounded-xl border border-border shadow-sm mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom, email, téléphone..."
              className="flex-1 px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
            />
            <Button type="submit" variant="primary" size="md">
              Rechercher
            </Button>
          </form>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 shadow-sm">
          {error}
        </div>
      )}

      {/* Suppliers table */}
      {loading ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <div className="text-muted-foreground text-lg">
            {search
              ? 'Aucun fournisseur trouvé'
              : 'Aucun fournisseur. Ajoutez votre premier fournisseur !'}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Nom
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-foreground uppercase tracking-wide">
                      Téléphone
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
                  {suppliers.map(supplier => (
                    <tr
                      key={supplier._id || supplier.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-foreground font-semibold">
                        {supplier.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {supplier.contactName || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {supplier.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {supplier.phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            supplier.isActive !== false
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {supplier.isActive !== false ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => handleEdit(supplier)}
                            variant="primary"
                            size="sm"
                          >
                            Modifier
                          </Button>
                          <Button
                            onClick={() =>
                              handleDelete(supplier._id || supplier.id)
                            }
                            disabled={
                              deleting === (supplier._id || supplier.id)
                            }
                            loading={deleting === (supplier._id || supplier.id)}
                            variant="danger"
                            size="sm"
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
            <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm">
              <div className="text-sm font-medium text-muted-foreground">
                Page {pagination.page} sur {pagination.pages} (
                {pagination.total} fournisseurs)
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

      {/* Supplier Form Modal */}
      {showForm && (
        <SupplierForm supplier={editingSupplier} onClose={handleFormClose} />
      )}
    </div>
  );
}

export default function Suppliers() {
  return (
    <AuthGuard>
      <SuppliersPage />
    </AuthGuard>
  );
}
