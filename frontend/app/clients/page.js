'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '../../components/AuthGuard';
import CustomerForm from '../../components/CustomerForm';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { DataTable } from '../../components/ui/data-table';
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
import { useAuth } from '../../lib/useAuth';
import { fetchCustomers, deleteCustomer } from '../../lib/customers';
import { Users, Search, Plus, Edit, Trash2, Loader2, Eye } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';

/**
 * Customers page - Gestion des clients
 */
function CustomersPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('all');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

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
        clientType:
          clientTypeFilter && clientTypeFilter !== 'all'
            ? clientTypeFilter
            : undefined,
        classification:
          classificationFilter && classificationFilter !== 'all'
            ? classificationFilter
            : undefined,
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
    setPagination(prev => ({ ...prev, page: 1 }));
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

  const handleDelete = async customerId => {
    try {
      setDeleting(customerId);
      await deleteCustomer(customerId);
      toast({
        title: 'Customer deleted',
        description: 'Customer has been deleted successfully.',
      });
      await loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete customer',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCustomer(null);
    loadCustomers();
  };

  const getClassificationBadge = classification => {
    const variantMap = {
      vert: 'default',
      jaune: 'secondary',
      rouge: 'destructive',
      noir: 'outline',
    };
    return (
      <Badge variant={variantMap[classification] || 'outline'}>
        {classification || '-'}
      </Badge>
    );
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
      key: 'name',
      header: 'Nom',
      cell: row => (
        <div>
          <div className="font-medium">
            {row.firstName} {row.lastName}
          </div>
          {row.internalCode && (
            <div className="text-xs text-muted-foreground">
              Code: {row.internalCode}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: row => (
        <div className="text-sm">
          {row.phones && row.phones.length > 0 && <div>{row.phones[0]}</div>}
          {row.email && (
            <div className="text-muted-foreground text-xs">{row.email}</div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: row => (
        <Badge variant="outline">
          {row.clientType === 'particulier' ? 'Particulier' : 'Professionnel'}
        </Badge>
      ),
    },
    {
      key: 'classification',
      header: 'Classification',
      cell: row => getClassificationBadge(row.classification),
    },
    {
      key: 'city',
      header: 'Ville',
      accessorKey: 'city',
      cell: row => (
        <div className="text-muted-foreground">{row.city || '-'}</div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: row => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/clients/${row._id || row.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Voir
          </Button>
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
                  définitivement le client &quot;{row.firstName} {row.lastName}
                  &quot;.
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
          <h1 className="text-4xl font-bold tracking-tight">Clients</h1>
          {companyName && (
            <p className="text-muted-foreground mt-1">{companyName}</p>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Recherche et filtres</CardTitle>
          <CardDescription>Filtrez et recherchez vos clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <form onSubmit={handleSearch} className="md:col-span-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Rechercher par nom, email, téléphone..."
                  className="pl-9"
                />
              </div>
              <Button type="submit">Rechercher</Button>
            </form>

            <Select
              value={clientTypeFilter}
              onValueChange={setClientTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type de client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="particulier">Particulier</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={classificationFilter}
              onValueChange={setClassificationFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="vert">Vert</SelectItem>
                <SelectItem value="jaune">Jaune</SelectItem>
                <SelectItem value="rouge">Rouge</SelectItem>
                <SelectItem value="noir">Noir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un client
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

      {/* Customers table */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground">Chargement...</div>
          </CardContent>
        </Card>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-lg text-muted-foreground">
              {search ||
              (clientTypeFilter && clientTypeFilter !== 'all') ||
              (classificationFilter && classificationFilter !== 'all')
                ? 'Aucun client trouvé'
                : 'Aucun client. Ajoutez votre premier client !'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Clients</CardTitle>
              <CardDescription>
                {pagination.total} client{pagination.total !== 1 ? 's' : ''} au
                total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={customers}
                emptyMessage="Aucun client trouvé"
                loading={loading}
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
                    {pagination.total} clients)
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

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onClose={handleFormClose}
          open={showForm}
        />
      )}
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
