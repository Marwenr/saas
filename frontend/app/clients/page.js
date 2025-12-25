'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import CustomerForm from '../../components/CustomerForm';
import Button from '../../components/Button';
import { useAuth } from '../../lib/useAuth';
import { fetchCustomers, deleteCustomer } from '../../lib/customers';
import { Users } from 'lucide-react';

/**
 * Customers page - Gestion des clients
 */
function CustomersPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load customers
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadCustomers();
    }
  }, [
    authLoading,
    isAuthenticated,
    pagination.page,
    search,
    clientTypeFilter,
    classificationFilter,
  ]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomers({
        page: pagination.page,
        limit: pagination.limit,
        search: search,
        clientType: clientTypeFilter || undefined,
        classification: classificationFilter || undefined,
      });
      setCustomers(data.customers || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError(err.message || 'Failed to load customers');
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
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEdit = customer => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleView = customerId => {
    router.push(`/clients/${customerId}`);
  };

  const handleDelete = async customerId => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      return;
    }

    try {
      setDeleting(customerId);
      await deleteCustomer(customerId);
      // Reload customers
      await loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert(err.message || 'Failed to delete customer');
    } finally {
      setDeleting(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCustomer(null);
    loadCustomers(); // Reload customers after form submission
  };

  const getClassificationBadge = classification => {
    const colors = {
      vert: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      jaune:
        'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      rouge: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      noir: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
    };
    const labels = {
      vert: 'Vert',
      jaune: 'Jaune',
      rouge: 'Rouge',
      noir: 'Noir',
    };
    return (
      <span
        className={`inline-block px-2 py-1 rounded text-xs font-medium ${colors[classification] || colors.vert}`}
      >
        {labels[classification] || classification}
      </span>
    );
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
                Clients
              </h1>
              {companyName && (
                <p className="text-base text-[var(--text-secondary)]">
                  {companyName}
                </p>
              )}
            </div>
            <button
              onClick={handleAdd}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600 rounded-xl transition-all shadow-sm hover:shadow-md whitespace-nowrap"
            >
              + Ajouter un client
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-6 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <form onSubmit={handleSearch} className="flex-1 max-w-md">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Rechercher par nom, email, téléphone, code..."
                    className="flex-1 px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                  <Button type="submit" variant="primary" size="md">
                    Rechercher
                  </Button>
                </div>
              </form>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <select
                value={clientTypeFilter}
                onChange={e => {
                  setClientTypeFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="">Tous les types</option>
                <option value="particulier">Particulier</option>
                <option value="professionnel">Professionnel</option>
              </select>
              <select
                value={classificationFilter}
                onChange={e => {
                  setClassificationFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="">Toutes les classifications</option>
                <option value="vert">Vert</option>
                <option value="jaune">Jaune</option>
                <option value="rouge">Rouge</option>
                <option value="noir">Noir</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 shadow-sm">
            {error}
          </div>
        )}

        {/* Customers table */}
        {loading ? (
          <div className="text-center py-16 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <div className="text-[var(--text-secondary)]">Chargement...</div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="text-[var(--text-secondary)] text-lg">
              {search
                ? 'Aucun client trouvé'
                : 'Aucun client. Ajoutez votre premier client !'}
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
                        Nom complet
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Téléphones
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Voitures
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Classification
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {customers.map(customer => (
                      <tr
                        key={customer._id || customer.id}
                        className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors cursor-pointer"
                        onClick={() => handleView(customer._id || customer.id)}
                      >
                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                          <div className="font-semibold">
                            {customer.firstName} {customer.lastName}
                          </div>
                          {customer.internalCode && (
                            <div className="text-xs text-[var(--text-secondary)]">
                              {customer.internalCode}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {customer.clientType === 'professionnel'
                            ? 'Professionnel'
                            : 'Particulier'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {customer.phones && customer.phones.length > 0 ? (
                            <div className="space-y-1">
                              {customer.phones.slice(0, 2).map((phone, idx) => (
                                <div key={idx}>{phone}</div>
                              ))}
                              {customer.phones.length > 2 && (
                                <div className="text-xs text-[var(--text-secondary)]">
                                  +{customer.phones.length - 2} autres
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {customer.email || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {customer.vehicles ? customer.vehicles.length : 0}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getClassificationBadge(
                            customer.classification || 'vert'
                          )}
                        </td>
                        <td
                          className="px-6 py-4 text-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={e => {
                                e.stopPropagation();
                                handleEdit(customer);
                              }}
                              variant="primary"
                              size="sm"
                            >
                              Modifier
                            </Button>
                            <Button
                              onClick={e => {
                                e.stopPropagation();
                                handleDelete(customer._id || customer.id);
                              }}
                              disabled={
                                deleting === (customer._id || customer.id)
                              }
                              loading={
                                deleting === (customer._id || customer.id)
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
                  {pagination.total} clients)
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

        {/* Customer Form Modal */}
        {showForm && (
          <CustomerForm customer={editingCustomer} onClose={handleFormClose} />
        )}
      </Container>
    </div>
  );
}

export default function Customers() {
  return (
    <AuthGuard>
      <CustomersPage />
    </AuthGuard>
  );
}
