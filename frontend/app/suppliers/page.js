'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import SupplierForm from '../../components/SupplierForm';
import Button from '../../components/Button';
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

  // Load suppliers
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadSuppliers();
    }
  }, [authLoading, isAuthenticated, pagination.page, search]);

  const loadSuppliers = async () => {
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
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8 min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 dark:from-[var(--bg-primary)] dark:via-[var(--bg-primary)] dark:to-[var(--bg-primary)]">
      <Container fullWidth>
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                Fournisseurs
              </h1>
              {companyName && (
                <p className="text-base text-[var(--text-secondary)]">
                  {companyName}
                </p>
              )}
            </div>
            <Button onClick={handleAdd} variant="primary" size="md">
              + Ajouter un fournisseur
            </Button>
          </div>

          {/* Search and Add button */}
          <div className="p-6 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Rechercher par nom, email, téléphone..."
                className="flex-1 px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
          <div className="text-center py-16 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <div className="text-[var(--text-secondary)]">Chargement...</div>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="text-[var(--text-secondary)] text-lg">
              {search
                ? 'Aucun fournisseur trouvé'
                : 'Aucun fournisseur. Ajoutez votre premier fournisseur !'}
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
                        Nom
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Téléphone
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
                    {suppliers.map(supplier => (
                      <tr
                        key={supplier._id || supplier.id}
                        className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-semibold">
                          {supplier.name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {supplier.contactName || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {supplier.email || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
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
                              loading={
                                deleting === (supplier._id || supplier.id)
                              }
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
              <div className="flex items-center justify-between p-4 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
                <div className="text-sm font-medium text-[var(--text-secondary)]">
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
      </Container>
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
