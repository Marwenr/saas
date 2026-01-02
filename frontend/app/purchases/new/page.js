'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../../components/Container';
import AuthGuard from '../../../components/AuthGuard';
import ProductForm from '../../../components/ProductForm';
import { useAuth } from '../../../lib/useAuth';
import { fetchSuppliers } from '../../../lib/suppliers';
import { fetchProducts } from '../../../lib/products';
import { createPurchaseOrder } from '../../../lib/purchases';

/**
 * New Purchase Order page - Créer un bon de commande
 */
function NewPurchaseOrderPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Product search state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const searchTimeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    supplierId: '',
    status: 'RECEIVED', // default to 'RECEIVED'
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [items, setItems] = useState([]);
  const [productMap, setProductMap] = useState({}); // Map productId -> product data for display

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
  }, [authLoading, isAuthenticated]);

  // Debounced product search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchInput.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        setSearchQuery(searchInput.trim());
      }, 300); // 300ms debounce
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Fetch products when search query changes
  useEffect(() => {
    if (searchQuery) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load suppliers
      const suppliersData = await fetchSuppliers({ page: 1, limit: 100 });
      setSuppliers(suppliersData.suppliers || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    try {
      setSearchLoading(true);
      const data = await fetchProducts({
        page: 1,
        limit: 20,
        search: searchQuery,
      });
      setSearchResults(data.products || []);
    } catch (err) {
      console.error('Failed to search products:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        productId: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ]);
  };

  const handleRemoveItem = index => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev =>
      prev.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleAddProductFromSearch = product => {
    const productId = product._id || product.id;

    // Add product to map for display
    setProductMap(prev => ({
      ...prev,
      [productId]: product,
    }));

    // Add as new line item
    setItems(prev => [
      ...prev,
      {
        productId,
        quantity: 1,
        unitPrice: product.purchasePrice || 0,
        taxRate: product.taxRate || 0,
      },
    ]);

    // Clear search
    setSearchInput('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleProductCreated = product => {
    // Add the newly created product to the PO
    handleAddProductFromSearch(product);

    // Optionally refresh search results to include the new product
    if (searchQuery) {
      performSearch();
    }
  };

  const getProductDisplay = productId => {
    const product = productMap[productId];
    if (!product) return 'Produit inconnu';
    return `${product.sku || 'N/A'} - ${product.name || 'Sans nom'}`;
  };

  const calculateItemTotal = item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const tax = parseFloat(item.taxRate) || 0;
    return qty * price * (1 + tax / 100);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Validate
      if (!formData.supplierId) {
        throw new Error('Veuillez sélectionner un fournisseur');
      }

      if (items.length === 0) {
        throw new Error('Veuillez ajouter au moins un produit');
      }

      // Validate items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId) {
          throw new Error(`Ligne ${i + 1}: Veuillez sélectionner un produit`);
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(
            `Ligne ${i + 1}: La quantité doit être supérieure à 0`
          );
        }
        if (!item.unitPrice || item.unitPrice < 0) {
          throw new Error(
            `Ligne ${i + 1}: Le prix unitaire doit être supérieur ou égal à 0`
          );
        }
      }

      // Prepare payload
      const payload = {
        supplierId: formData.supplierId,
        status: formData.status, // Include status
        orderDate: formData.orderDate || new Date().toISOString(),
        expectedDate: formData.expectedDate || undefined,
        notes: formData.notes.trim() || undefined,
        items: items.map(item => ({
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          taxRate: parseFloat(item.taxRate) || 0,
        })),
      };

      await createPurchaseOrder(payload);

      // Redirect to purchases list
      router.push('/purchases');
    } catch (err) {
      console.error('Failed to create purchase order:', err);
      setError(err.message || 'Échec de la création du bon de commande');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Container fullWidth>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
            Nouveau bon de commande
          </h1>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Supplier and dates */}
          <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Informations générales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Fournisseur <span className="text-red-500">*</span>
                </label>
                <select
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers
                    .filter(s => s.isActive !== false)
                    .map(supplier => (
                      <option
                        key={supplier._id || supplier.id}
                        value={supplier._id || supplier.id}
                      >
                        {supplier.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Statut <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="PENDING">En attente</option>
                  <option value="PARTIAL">Partiellement reçu</option>
                  <option value="RECEIVED">Reçu</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Date de commande
                </label>
                <input
                  type="date"
                  name="orderDate"
                  value={formData.orderDate}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Date de livraison prévue
                </label>
                <input
                  type="date"
                  name="expectedDate"
                  value={formData.expectedDate}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                rows={2}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>

          {/* Product Search Section */}
          <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Rechercher et ajouter des produits
            </h2>

            {/* Search Input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Rechercher par nom, SKU, OEM..."
                  className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  Ajouter une nouvelle pièce
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchLoading && (
              <div className="text-center py-4 text-[var(--text-secondary)]">
                Recherche en cours...
              </div>
            )}

            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-4 text-[var(--text-secondary)]">
                Aucun produit trouvé. Cliquez sur &quot;Ajouter une nouvelle
                pièce&quot; pour créer un nouveau produit.
              </div>
            )}

            {!searchLoading && searchResults.length > 0 && (
              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-[var(--bg-tertiary)] sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                          Nom
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                          Marque
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                          Prix d&apos;achat
                        </th>
                        <th className="px-4 py-2 text-center text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map(product => (
                        <tr
                          key={product._id || product.id}
                          className="hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border-color)]"
                        >
                          <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                            {product.sku || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                            {product.name || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                            {product.brand?.name || product.brand || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-[var(--text-primary)] text-right">
                            {product.purchasePrice !== undefined
                              ? `${product.purchasePrice.toFixed(2)} TND`
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleAddProductFromSearch(product)
                              }
                              className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                            >
                              Ajouter
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mb-6 p-6 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Lignes de commande
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Ajouter une ligne vide
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                Aucun produit ajouté. Recherchez et ajoutez des produits
                ci-dessus.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Produit (SKU - Nom)
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                        Quantité
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                        Prix unitaire
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                        TVA (%)
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                        Total
                      </th>
                      <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-[var(--border-color)]"
                      >
                        <td className="px-3 py-2">
                          {item.productId ? (
                            <span className="text-[var(--text-primary)]">
                              {getProductDisplay(item.productId)}
                            </span>
                          ) : (
                            <span className="text-[var(--text-secondary)] italic">
                              Ligne vide - Recherchez un produit ci-dessus
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'quantity',
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e =>
                              handleItemChange(
                                index,
                                'unitPrice',
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.taxRate}
                            onChange={e =>
                              handleItemChange(index, 'taxRate', e.target.value)
                            }
                            className="w-full px-2 py-1 border border-[var(--border-color)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">
                          {calculateItemTotal(item).toFixed(2)} TND
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan="4"
                        className="px-3 py-2 text-right font-semibold text-[var(--text-primary)]"
                      >
                        Total:
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[var(--text-primary)]">
                        {calculateTotal().toFixed(2)} TND
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/purchases')}
              className="px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || items.length === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Créer le bon de commande'}
            </button>
          </div>
        </form>

        {/* New Product Modal */}
        {showNewProductModal && (
          <ProductForm
            onClose={() => setShowNewProductModal(false)}
            onCreated={handleProductCreated}
          />
        )}
      </Container>
    </div>
  );
}

export default function NewPurchaseOrder() {
  return (
    <AuthGuard>
      <NewPurchaseOrderPage />
    </AuthGuard>
  );
}
