'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import AuthGuard from '../../components/AuthGuard';
import UserForm from '../../components/UserForm';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../lib/useAuth';
import { getUsers, deleteUser } from '../../lib/api';
import { Users, Plus, Edit, Trash2, Shield } from 'lucide-react';

/**
 * Users management page - Gestion des utilisateurs
 * Only accessible by owners
 */
function UsersPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Redirect if not authenticated or not owner
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user && user.role !== 'owner') {
        router.push('/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Load users
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === 'owner') {
      loadUsers();
    }
  }, [authLoading, isAuthenticated, user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = userData => {
    setEditingUser(userData);
    setShowForm(true);
  };

  const handleDelete = async userId => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      setDeleting(userId);
      await deleteUser(userId);
      await loadUsers(); // Reload list
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert(err.message || 'Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  const handleFormSuccess = () => {
    loadUsers(); // Reload list after create/update
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const roleLabels = {
    owner: 'Propriétaire',
    manager: 'Manager',
    cashier: 'Caissier',
    storekeeper: 'Magasinier',
  };

  const roleColors = {
    owner: 'bg-primary/10 text-primary',
    manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    cashier:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    storekeeper:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };

  // Don't render if not owner
  if (!authLoading && user && user.role !== 'owner') {
    return null;
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-8 h-8" />
              Gestion des utilisateurs
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les utilisateurs de votre entreprise
            </p>
          </div>
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un utilisateur
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">
              Chargement des utilisateurs...
            </p>
          </div>
        ) : (
          /* Users table */
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow overflow-hidden">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Aucun utilisateur trouvé
                </p>
                <Button onClick={handleAdd} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter le premier utilisateur
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">
                        Date de création
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map(userItem => (
                      <tr
                        key={userItem.id}
                        className="hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">
                                {userItem.name || userItem.email}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {userItem.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              roleColors[userItem.role] || roleColors.cashier
                            }`}
                          >
                            {userItem.role === 'owner' && (
                              <Shield className="w-3 h-3 mr-1" />
                            )}
                            {roleLabels[userItem.role] || userItem.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {userItem.createdAt
                            ? new Date(userItem.createdAt).toLocaleDateString(
                                'fr-FR',
                                {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }
                              )
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(userItem)}
                              className="text-primary hover:text-primary/80"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {userItem.role !== 'owner' &&
                              userItem.id !== user?.id && (
                                <button
                                  onClick={() => handleDelete(userItem.id)}
                                  disabled={deleting === userItem.id}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 disabled:opacity-50"
                                  title="Supprimer"
                                >
                                  {deleting === userItem.id ? (
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* User form modal */}
        {showForm && (
          <UserForm
            user={editingUser}
            onClose={handleCloseForm}
            onSuccess={handleFormSuccess}
          />
        )}
      </div>
    </AuthGuard>
  );
}

export default UsersPage;
