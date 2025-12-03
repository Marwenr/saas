'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/useAuth';
import { fetchProducts } from '../../lib/products';
import { createSale, fetchSales } from '../../lib/pos';
import { fetchCustomers, fetchCustomer } from '../../lib/customers';

/**
 * POS (Point of Sale) page
 */
function POSPage() {
  const { companyName, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Cart
  const [cart, setCart] = useState([]);

  // Sale form
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Recent sales
  const [recentSales, setRecentSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load recent sales on mount
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadRecentSales();
    }
  }, [authLoading, isAuthenticated]);

  // Clear search results when page becomes visible (to get updated prices after purchase order reception)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear search results so user will get fresh data on next search
        setSearchResults([]);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Close customer search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      const customerSearchElement = document.getElementById('customerSearch');
      const dropdownElement = event.target.closest('.customer-search-dropdown');

      if (
        customerSearchElement &&
        !customerSearchElement.contains(event.target) &&
        !dropdownElement
      ) {
        setShowCustomerResults(false);
      }
    };

    if (showCustomerResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCustomerResults]);

  // Search customers
  const handleCustomerSearch = useCallback(async query => {
    if (!query || query.trim().length < 2) {
      setCustomerSearchResults([]);
      setShowCustomerResults(false);
      return;
    }

    try {
      setSearchingCustomer(true);
      const data = await fetchCustomers({
        search: query.trim(),
        limit: 10,
        page: 1,
        isActive: true,
      });
      setCustomerSearchResults(data.customers || []);
      setShowCustomerResults(true);
    } catch (err) {
      console.error('Failed to search customers:', err);
      setCustomerSearchResults([]);
      setShowCustomerResults(false);
    } finally {
      setSearchingCustomer(false);
    }
  }, []);

  // Handle customer search input change
  const handleCustomerSearchChange = e => {
    const query = e.target.value;
    setCustomerSearchQuery(query);

    // If query is cleared, clear selection
    if (!query.trim()) {
      setSelectedCustomer(null);
      setCustomerSearchResults([]);
      setShowCustomerResults(false);
    }
  };

  // Debounced customer search
  useEffect(() => {
    if (!customerSearchQuery.trim() || customerSearchQuery.trim().length < 2) {
      setCustomerSearchResults([]);
      setShowCustomerResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleCustomerSearch(customerSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearchQuery, handleCustomerSearch]);

  // Select a customer
  const handleSelectCustomer = async customer => {
    // Fetch full customer data to get loyalty information
    try {
      const fullCustomerData = await fetchCustomer(customer._id || customer.id);
      setSelectedCustomer(fullCustomerData.customer);
      setCustomerSearchQuery(`${customer.firstName} ${customer.lastName}`);
      setShowCustomerResults(false);
      setCustomerSearchResults([]);
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
      // Fallback to basic customer data
      setSelectedCustomer(customer);
      setCustomerSearchQuery(`${customer.firstName} ${customer.lastName}`);
      setShowCustomerResults(false);
      setCustomerSearchResults([]);
    }
  };

  // Clear customer selection
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
    setShowCustomerResults(false);
    setCustomerSearchResults([]);
  };

  // Search products
  const handleSearch = async e => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const data = await fetchProducts({
        search: searchQuery,
        limit: 10,
        page: 1,
      });
      const products = data.products || [];
      setSearchResults(products);

      // Update prices in cart if products are already in cart (to reflect updated prices after purchase order reception)
      if (cart.length > 0 && products.length > 0) {
        setCart(prevCart =>
          prevCart.map(cartItem => {
            const updatedProduct = products.find(
              p => (p._id || p.id) === cartItem.productId
            );
            if (updatedProduct && updatedProduct.salePrice !== undefined) {
              return {
                ...cartItem,
                baseUnitPrice: updatedProduct.salePrice, // Update base price with new sale price
              };
            }
            return cartItem;
          })
        );
      }
    } catch (err) {
      console.error('Failed to search products:', err);
      setError(err.message || 'Failed to search products');
    } finally {
      setSearching(false);
    }
  };

  // Add product to cart
  const handleAddToCart = product => {
    // Check if product already in cart
    const existingItem = cart.find(
      item => item.productId === (product._id || product.id)
    );

    if (existingItem) {
      // Increment quantity
      setCart(
        cart.map(item =>
          item.productId === (product._id || product.id)
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      );
    } else {
      // Add new item with baseUnitPrice and discountRate
      const baseUnitPrice = product.salePrice || 0;
      const newItem = {
        productId: product._id || product.id,
        sku: product.sku || '',
        name: product.name || '',
        baseUnitPrice,
        discountRate: 0,
        qty: 1,
        taxRate: product.taxRate || 0,
        stockQty: product.stockQty || 0,
      };
      setCart([...cart, newItem]);
    }

    // Clear search
    setSearchQuery('');
    setSearchResults([]);
  };

  // Update cart item quantity
  const handleUpdateQty = (productId, newQty) => {
    if (newQty <= 0) {
      // Remove item if quantity is 0 or less
      setCart(cart.filter(item => item.productId !== productId));
    } else {
      setCart(
        cart.map(item =>
          item.productId === productId
            ? { ...item, qty: parseInt(newQty) || 1 }
            : item
        )
      );
    }
  };

  // Remove item from cart
  const handleRemoveFromCart = productId => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Calculate final unit price after discount
  const calculateFinalUnitPrice = (baseUnitPrice, discountRate) => {
    return baseUnitPrice - (baseUnitPrice * (discountRate || 0)) / 100;
  };

  // Update base unit price
  const handleUpdateBasePrice = (productId, newBasePrice) => {
    const price = parseFloat(newBasePrice) || 0;
    setCart(
      cart.map(item =>
        item.productId === productId
          ? { ...item, baseUnitPrice: Math.max(0, price) }
          : item
      )
    );
  };

  // Update discount rate
  const handleUpdateDiscountRate = (productId, newDiscountRate) => {
    const rate = parseFloat(newDiscountRate) || 0;
    const clampedRate = Math.max(0, Math.min(100, rate));
    setCart(
      cart.map(item =>
        item.productId === productId
          ? { ...item, discountRate: clampedRate }
          : item
      )
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalExclTax = 0;
    let totalTax = 0;

    cart.forEach(item => {
      const finalUnitPrice = calculateFinalUnitPrice(
        item.baseUnitPrice || 0,
        item.discountRate || 0
      );
      const itemTotalExclTax = item.qty * finalUnitPrice;
      const itemTax = itemTotalExclTax * ((item.taxRate || 0) / 100);
      totalExclTax += itemTotalExclTax;
      totalTax += itemTax;
    });

    const subtotalInclTax = totalExclTax + totalTax;

    // Apply loyalty discount if customer is a loyal client
    let loyaltyDiscount = 0;
    let loyaltyDiscountAmount = 0;
    let totalInclTax = subtotalInclTax;

    if (
      selectedCustomer?.isLoyalClient &&
      selectedCustomer?.loyaltyDiscount > 0
    ) {
      loyaltyDiscount = selectedCustomer.loyaltyDiscount;
      loyaltyDiscountAmount = (subtotalInclTax * loyaltyDiscount) / 100;
      totalInclTax = subtotalInclTax - loyaltyDiscountAmount;
    }

    return {
      totalExclTax,
      totalTax,
      subtotalInclTax,
      loyaltyDiscount,
      loyaltyDiscountAmount,
      totalInclTax,
    };
  };

  // Submit sale
  const handleSubmitSale = async e => {
    e.preventDefault();

    if (cart.length === 0) {
      setError('Le panier est vide');
      return;
    }

    // Check if customer is required for CREDIT payment
    if (paymentMethod === 'CREDIT' && !selectedCustomer) {
      setError(
        'Un client doit être sélectionné pour utiliser le paiement à crédit'
      );
      return;
    }

    // Check stock availability
    const stockErrors = [];
    cart.forEach(item => {
      if (item.qty > item.stockQty) {
        stockErrors.push(
          `${item.name}: Stock insuffisant (disponible: ${item.stockQty}, demandé: ${item.qty})`
        );
      }
    });

    if (stockErrors.length > 0) {
      setError(stockErrors.join('\n'));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      // Determine customer name: use selected customer or "client comptoir" as default
      const customerName = selectedCustomer
        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim()
        : 'client comptoir';

      // Calculate totals with loyalty discount
      const finalTotals = calculateTotals();

      const payload = {
        customerId: selectedCustomer
          ? selectedCustomer._id || selectedCustomer.id
          : undefined,
        customerName: customerName,
        paymentMethod: paymentMethod.toUpperCase(), // Convert to uppercase (CASH, CHECK)
        items: cart.map(item => {
          // Calculate final unit price after discount
          const finalUnitPrice = calculateFinalUnitPrice(
            item.baseUnitPrice || 0,
            item.discountRate || 0
          );
          return {
            productId: item.productId,
            qty: item.qty,
            unitPrice: finalUnitPrice, // Send final price after discount
            baseUnitPrice: item.baseUnitPrice || 0, // Send base price before discount
            discountRate: item.discountRate || 0, // Send discount rate
            taxRate: item.taxRate,
          };
        }),
        // Include loyalty discount information if applicable
        loyaltyDiscount:
          finalTotals.loyaltyDiscount > 0
            ? finalTotals.loyaltyDiscount
            : undefined,
        loyaltyDiscountAmount:
          finalTotals.loyaltyDiscountAmount > 0
            ? finalTotals.loyaltyDiscountAmount
            : undefined,
      };

      await createSale(payload);

      // Reset form
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
      setPaymentMethod('CASH');
      setSuccess('Vente enregistrée avec succès !');

      // Reload recent sales
      await loadRecentSales();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to create sale:', err);
      setError(err.message || "Échec de l'enregistrement de la vente");
    } finally {
      setSubmitting(false);
    }
  };

  // Load recent sales
  const loadRecentSales = async () => {
    try {
      setLoadingSales(true);
      const data = await fetchSales({
        page: 1,
        limit: 5,
        startDate: undefined,
        endDate: undefined,
      });
      setRecentSales(data.sales || []);
    } catch (err) {
      console.error('Failed to load recent sales:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  const totals = calculateTotals();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
            Point de Vente (POS)
          </h1>
          {companyName && (
            <p className="text-lg text-[var(--text-secondary)]">
              {companyName}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Product search and cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product search */}
            <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                Recherche de pièces
              </h2>
              <form onSubmit={handleSearch} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom, SKU, OEM..."
                    className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {searching ? '...' : 'Rechercher'}
                  </button>
                </div>
              </form>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map(product => {
                    const productId = product._id || product.id;
                    const stockQty = product.stockQty || 0;
                    const salePrice = product.salePrice || 0;

                    return (
                      <div
                        key={productId}
                        className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                        onClick={() => handleAddToCart(product)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-[var(--text-primary)]">
                              {product.name || '-'}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)]">
                              SKU: {product.sku || '-'} | Stock: {stockQty} |
                              Prix (TTC): {salePrice.toFixed(2)} TND
                            </div>
                          </div>
                          <button
                            type="button"
                            className="ml-2 px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                            onClick={e => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                Panier ({cart.length}{' '}
                {cart.length === 1 ? 'article' : 'articles'})
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  Le panier est vide. Recherchez et ajoutez des produits.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-color)]">
                        <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                          Produit
                        </th>
                        <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                          Qté
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                          Prix base
                        </th>
                        <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                          Remise %
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                          Prix final
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
                      {cart.map(item => {
                        const baseUnitPrice = item.baseUnitPrice || 0;
                        const discountRate = item.discountRate || 0;
                        const finalUnitPrice = calculateFinalUnitPrice(
                          baseUnitPrice,
                          discountRate
                        );
                        const itemTotalExclTax = item.qty * finalUnitPrice;
                        const itemTax =
                          itemTotalExclTax * ((item.taxRate || 0) / 100);
                        const itemTotalInclTax = itemTotalExclTax + itemTax;

                        return (
                          <tr
                            key={item.productId}
                            className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                          >
                            <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                SKU: {item.sku}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={e =>
                                  handleUpdateQty(
                                    item.productId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-16 px-2 py-1 text-center border border-[var(--border-color)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={baseUnitPrice}
                                onChange={e =>
                                  handleUpdateBasePrice(
                                    item.productId,
                                    e.target.value
                                  )
                                }
                                className="w-20 px-2 py-1 text-right border border-[var(--border-color)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={discountRate}
                                onChange={e =>
                                  handleUpdateDiscountRate(
                                    item.productId,
                                    e.target.value
                                  )
                                }
                                className="w-16 px-2 py-1 text-center border border-[var(--border-color)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-sm text-[var(--text-primary)]">
                              <span
                                className={
                                  discountRate > 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : ''
                                }
                              >
                                {finalUnitPrice.toFixed(2)} TND
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-medium text-[var(--text-primary)]">
                              {itemTotalInclTax.toFixed(2)} TND
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveFromCart(item.productId)
                                }
                                className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Sale summary and form */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)] sticky top-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
                Récapitulatif
              </h2>

              <form onSubmit={handleSubmitSale} className="space-y-4">
                {/* Customer search */}
                <div className="relative">
                  <label
                    htmlFor="customerSearch"
                    className="block text-sm font-medium text-[var(--text-primary)] mb-1"
                  >
                    Client
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="customerSearch"
                      value={customerSearchQuery}
                      onChange={handleCustomerSearchChange}
                      onFocus={() => {
                        if (
                          customerSearchQuery.trim().length >= 2 &&
                          customerSearchResults.length > 0
                        ) {
                          setShowCustomerResults(true);
                        }
                      }}
                      placeholder="Rechercher un client (nom, email, téléphone...)"
                      className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {selectedCustomer && (
                      <button
                        type="button"
                        onClick={handleClearCustomer}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Effacer la sélection"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                    {searchingCustomer && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                        <svg
                          className="animate-spin h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Customer search results dropdown */}
                  {showCustomerResults && customerSearchResults.length > 0 && (
                    <div className="customer-search-dropdown absolute z-50 w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {customerSearchResults.map(customer => (
                        <div
                          key={customer._id || customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className="px-4 py-3 hover:bg-[var(--bg-tertiary)] cursor-pointer border-b border-[var(--border-color)] last:border-b-0"
                        >
                          <div className="font-medium text-[var(--text-primary)]">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-[var(--text-secondary)]">
                            {customer.email && <span>{customer.email}</span>}
                            {customer.phones && customer.phones.length > 0 && (
                              <span className={customer.email ? ' | ' : ''}>
                                {customer.phones.join(', ')}
                              </span>
                            )}
                            {customer.internalCode && (
                              <span
                                className={
                                  customer.email || customer.phones?.length > 0
                                    ? ' | '
                                    : ''
                                }
                              >
                                Code: {customer.internalCode}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Default customer info */}
                  {!selectedCustomer && (
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      Par défaut:{' '}
                      <span className="font-medium">client comptoir</span>
                    </div>
                  )}

                  {/* Selected customer info */}
                  {selectedCustomer && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-green-600 dark:text-green-400">
                        ✓ Client sélectionné: {selectedCustomer.firstName}{' '}
                        {selectedCustomer.lastName}
                      </div>
                      {/* Loyalty badge */}
                      {selectedCustomer.isLoyalClient && (
                        <div className="px-3 py-1 rounded-full text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-sm font-semibold inline-block">
                          Client fidèle — remise appliquée
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <div>
                  <label
                    htmlFor="paymentMethod"
                    className="block text-sm font-medium text-[var(--text-primary)] mb-1"
                  >
                    Mode de paiement
                  </label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="CASH">Espèces</option>
                    <option value="CHECK">Chèque</option>
                    <option value="CREDIT">Crédit (Payer plus tard)</option>
                  </select>
                  {paymentMethod === 'CREDIT' && !selectedCustomer && (
                    <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                      ⚠️ Un client doit être sélectionné pour utiliser le crédit
                    </div>
                  )}
                  {paymentMethod === 'CREDIT' && selectedCustomer && (
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      ℹ️ Une facture sera créée automatiquement pour ce client
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
                  <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                    <span>Total HT:</span>
                    <span>{totals.totalExclTax.toFixed(2)} TND</span>
                  </div>
                  <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                    <span>TVA:</span>
                    <span>{totals.totalTax.toFixed(2)} TND</span>
                  </div>
                  {totals.loyaltyDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-[var(--text-secondary)] pt-1 border-t border-[var(--border-color)]">
                        <span>Sous-total TTC:</span>
                        <span>{totals.subtotalInclTax.toFixed(2)} TND</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                        <span>
                          Remise fidélité ({totals.loyaltyDiscount}%):
                        </span>
                        <span>
                          -{totals.loyaltyDiscountAmount.toFixed(2)} TND
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-lg font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]">
                    <span>Total TTC:</span>
                    <span>{totals.totalInclTax.toFixed(2)} TND</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {submitting ? 'Enregistrement...' : 'Valider la vente'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Recent sales */}
        <div className="mt-8 bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Dernières ventes
          </h2>

          {loadingSales ? (
            <div className="text-center py-4 text-[var(--text-secondary)]">
              Chargement...
            </div>
          ) : recentSales.length === 0 ? (
            <div className="text-center py-4 text-[var(--text-secondary)]">
              Aucune vente récente
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Client
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
                      Articles
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-[var(--text-primary)]">
                      Total TTC
                    </th>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-[var(--text-primary)]">
                      Paiement
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map(sale => (
                    <tr
                      key={sale._id || sale.id}
                      className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                    >
                      <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                        {new Date(sale.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2 text-sm text-[var(--text-primary)]">
                        {sale.customerName || 'client comptoir'}
                      </td>
                      <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                        {sale.items?.length || 0} article(s)
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-[var(--text-primary)] text-right">
                        {sale.totalInclTax?.toFixed(2) || '0.00'} TND
                      </td>
                      <td className="px-3 py-2 text-sm text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            sale.paymentMethod === 'CASH'
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : sale.paymentMethod === 'CHECK'
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                : sale.paymentMethod === 'CREDIT'
                                  ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                                  : 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {sale.paymentMethod === 'CASH'
                            ? 'Espèces'
                            : sale.paymentMethod === 'CHECK'
                              ? 'Chèque'
                              : sale.paymentMethod === 'CREDIT'
                                ? 'Crédit'
                                : sale.paymentMethod || 'Autre'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

export default function POS() {
  return (
    <AuthGuard>
      <POSPage />
    </AuthGuard>
  );
}
