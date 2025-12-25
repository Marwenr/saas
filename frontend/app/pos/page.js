'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/useAuth';
import { fetchProducts } from '../../lib/products';
import { createSale, fetchSales } from '../../lib/pos';
import { fetchCustomers, fetchCustomer } from '../../lib/customers';
import {
  AlertTriangle,
  Info,
  Search,
  Plus,
  Trash2,
  Check,
  Printer,
  ChevronUp,
  ChevronDown,
  Warehouse,
  X,
} from 'lucide-react';

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
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [saleReference, setSaleReference] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);

  // Add part form
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [partQuantity, setPartQuantity] = useState(1);
  const [partPrice, setPartPrice] = useState(0);
  const [partDiscount, setPartDiscount] = useState(0);

  // Selected items for editing
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [editPrice, setEditPrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('');

  // Recent sales
  const [recentSales, setRecentSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Generate sale reference on mount
  useEffect(() => {
    // Generate a reference like AUTO-000124
    const generateReference = () => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const refNum = String(timestamp % 1000000).padStart(6, '0');
      return `AUTO-${refNum}`;
    };
    setSaleReference(generateReference());
  }, []);

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

  // Add part from form
  const handleAddPart = () => {
    if (!selectedProduct) {
      setError('Veuillez sélectionner une pièce');
      return;
    }

    const product = selectedProduct;
    const existingItem = cart.find(
      item => item.productId === (product._id || product.id)
    );

    if (existingItem) {
      // Increment quantity
      setCart(
        cart.map(item =>
          item.productId === (product._id || product.id)
            ? { ...item, qty: item.qty + partQuantity }
            : item
        )
      );
    } else {
      const baseUnitPrice = partPrice || product.salePrice || 0;
      const newItem = {
        productId: product._id || product.id,
        sku: product.sku || '',
        name: product.name || '',
        baseUnitPrice,
        discountRate: partDiscount || 0,
        qty: partQuantity,
        taxRate: product.taxRate || 0,
        stockQty: product.stockQty || 0,
      };
      setCart([...cart, newItem]);
    }

    // Reset form
    setSelectedProduct(null);
    setPartQuantity(1);
    setPartPrice(0);
    setPartDiscount(0);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Select product for add part form
  const handleSelectProduct = product => {
    setSelectedProduct(product);
    setPartPrice(product.salePrice || 0);
    setPartQuantity(1);
    setPartDiscount(0);
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
    // Remove from selected items if present
    const newSelected = new Set(selectedItems);
    newSelected.delete(productId);
    setSelectedItems(newSelected);
  };

  // Toggle item selection
  const handleToggleItemSelection = productId => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedItems(newSelected);

    // If single item selected, populate edit fields
    if (newSelected.size === 1) {
      const item = cart.find(i => i.productId === productId);
      if (item) {
        setEditPrice(item.baseUnitPrice.toFixed(2));
        setEditDiscount(item.discountRate.toString());
      }
    } else if (newSelected.size > 1) {
      // Multiple items - clear price, keep discount if all have same
      setEditPrice('');
      const items = cart.filter(i => newSelected.has(i.productId));
      const discounts = items.map(i => i.discountRate);
      const allSameDiscount = discounts.every(d => d === discounts[0]);
      setEditDiscount(allSameDiscount ? discounts[0].toString() : '');
    } else {
      // No items selected
      setEditPrice('');
      setEditDiscount('');
    }
  };

  // Select all items
  const handleSelectAll = () => {
    if (selectedItems.size === cart.length) {
      setSelectedItems(new Set());
      setEditPrice('');
      setEditDiscount('');
    } else {
      setSelectedItems(new Set(cart.map(item => item.productId)));
      // If all items have same price/discount, populate fields
      const prices = cart.map(i => i.baseUnitPrice);
      const discounts = cart.map(i => i.discountRate);
      const allSamePrice = prices.every(p => p === prices[0]);
      const allSameDiscount = discounts.every(d => d === discounts[0]);
      setEditPrice(allSamePrice ? prices[0].toFixed(2) : '');
      setEditDiscount(allSameDiscount ? discounts[0].toString() : '');
    }
  };

  // Apply edits to selected items
  const handleApplyEdits = () => {
    if (selectedItems.size === 0) return;

    const newCart = cart.map(item => {
      if (selectedItems.has(item.productId)) {
        const updated = { ...item };
        // Only apply price if single item is selected
        if (selectedItems.size === 1 && editPrice && editPrice.trim() !== '') {
          updated.baseUnitPrice = Math.max(0, parseFloat(editPrice) || 0);
        }
        // Apply discount to all selected items
        if (editDiscount && editDiscount.trim() !== '') {
          updated.discountRate = Math.max(
            0,
            Math.min(100, parseFloat(editDiscount) || 0)
          );
        }
        return updated;
      }
      return item;
    });

    setCart(newCart);
    setSelectedItems(new Set());
    setEditPrice('');
    setEditDiscount('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setSelectedItems(new Set());
    setEditPrice('');
    setEditDiscount('');
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

    // Subtotal before any discounts (TTC)
    const subtotalInclTax = totalExclTax + totalTax;

    // Apply global discount on subtotal
    const globalDiscountAmount =
      (subtotalInclTax * (globalDiscount || 0)) / 100;
    const subtotalAfterGlobalDiscount = subtotalInclTax - globalDiscountAmount;

    // Calculate TVA (19%) on the discounted subtotal
    // TVA = (subtotal_after_discount * 19) / 119
    const standardTaxRate = 19;
    const subtotalExclTaxAfterDiscount =
      (subtotalAfterGlobalDiscount * 100) / (100 + standardTaxRate);
    const calculatedTax =
      subtotalAfterGlobalDiscount - subtotalExclTaxAfterDiscount;

    // Apply loyalty discount if customer is a loyal client
    let loyaltyDiscount = 0;
    let loyaltyDiscountAmount = 0;
    let totalInclTax = subtotalAfterGlobalDiscount;

    if (
      selectedCustomer?.isLoyalClient &&
      selectedCustomer?.loyaltyDiscount > 0
    ) {
      loyaltyDiscount = selectedCustomer.loyaltyDiscount;
      loyaltyDiscountAmount =
        (subtotalAfterGlobalDiscount * loyaltyDiscount) / 100;
      totalInclTax = subtotalAfterGlobalDiscount - loyaltyDiscountAmount;
    }

    return {
      totalExclTax,
      totalTax: calculatedTax || totalTax,
      subtotalInclTax,
      globalDiscount: globalDiscount || 0,
      globalDiscountAmount: globalDiscountAmount || 0,
      subtotalAfterGlobalDiscount,
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
        // Include global discount
        globalDiscount:
          finalTotals.globalDiscount > 0
            ? finalTotals.globalDiscount
            : undefined,
        globalDiscountAmount:
          finalTotals.globalDiscountAmount > 0
            ? finalTotals.globalDiscountAmount
            : undefined,
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
      setGlobalDiscount(0);
      setSelectedProduct(null);
      setPartQuantity(1);
      setPartPrice(0);
      setPartDiscount(0);
      setSelectedItems(new Set());
      setEditPrice('');
      setEditDiscount('');
      // Generate new reference
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const refNum = String(timestamp % 1000000).padStart(6, '0');
      setSaleReference(`AUTO-${refNum}`);
      setSaleDate(new Date().toISOString().split('T')[0]);
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

  // Format date for display
  const formatDate = dateString => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Check if item has low stock
  const isLowStock = item => {
    return item.stockQty <= 5; // Consider low stock if 5 or less
  };

  return (
    <div className="py-6 min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 dark:from-[var(--bg-primary)] dark:via-[var(--bg-primary)] dark:to-[var(--bg-primary)]">
      <Container fullWidth>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">
            Nouvelle Vente
          </h1>
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

        <div className="space-y-6">
          {/* Main content */}
          <div className="space-y-6">
            {/* Informations Client Section */}
            <div className="bg-white dark:bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
              <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">
                Informations Client
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Search */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Client
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
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
                        placeholder="Recherche client"
                        className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      {searchingCustomer && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg
                            className="animate-spin h-5 w-5 text-purple-600"
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
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        </div>
                      )}
                      {/* Customer search results dropdown */}
                      {showCustomerResults &&
                        customerSearchResults.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {customerSearchResults.map(customer => (
                              <div
                                key={customer._id || customer.id}
                                onClick={() => handleSelectCustomer(customer)}
                                className="px-4 py-3 hover:bg-purple-50 dark:hover:bg-[var(--bg-tertiary)] cursor-pointer border-b border-[var(--border-color)] last:border-b-0"
                              >
                                <div className="font-medium text-[var(--text-primary)]">
                                  {customer.firstName} {customer.lastName}
                                </div>
                                <div className="text-sm text-[var(--text-secondary)]">
                                  {customer.email && (
                                    <span>{customer.email}</span>
                                  )}
                                  {customer.phones &&
                                    customer.phones.length > 0 && (
                                      <span
                                        className={customer.email ? ' | ' : ''}
                                      >
                                        {customer.phones.join(', ')}
                                      </span>
                                    )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Nouveau Client
                    </button>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={saleDate}
                      onChange={e => setSaleDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Réf. Vente */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Réf. Vente
                  </label>
                  <input
                    type="text"
                    value={saleReference}
                    readOnly
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-gray-50 dark:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-not-allowed"
                  />
                </div>

                {/* Mode de Paiement */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Mode de Paiement
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="CASH"
                        checked={paymentMethod === 'CASH'}
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className={`px-6 py-2.5 rounded-lg border-2 font-medium transition-all ${
                          paymentMethod === 'CASH'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white dark:bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-purple-300'
                        }`}
                      >
                        Comptant
                      </div>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="CREDIT"
                        checked={paymentMethod === 'CREDIT'}
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className={`px-6 py-2.5 rounded-lg border-2 font-medium transition-all ${
                          paymentMethod === 'CREDIT'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white dark:bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-purple-300'
                        }`}
                      >
                        Crédit
                      </div>
                    </label>
                  </div>
                  {paymentMethod === 'CREDIT' && !selectedCustomer && (
                    <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Un client doit être sélectionné pour utiliser le crédit
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ajouter Pièce Section */}
            <div className="bg-white dark:bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
              <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">
                Ajouter Pièce
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Réf. Pièce */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Réf. Pièce
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch(e);
                        }
                      }}
                      placeholder="Rechercher..."
                      className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map(product => (
                          <div
                            key={product._id || product.id}
                            onClick={() => handleSelectProduct(product)}
                            className="px-4 py-2 hover:bg-purple-50 dark:hover:bg-[var(--bg-tertiary)] cursor-pointer border-b border-[var(--border-color)] last:border-b-0"
                          >
                            <div className="font-medium text-[var(--text-primary)] text-sm">
                              {product.sku || '-'} - {product.name || '-'}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              Stock: {product.stockQty || 0} | Prix:{' '}
                              {product.salePrice?.toFixed(2) || '0.00'} TND
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nom de la Pièce */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Nom de la Pièce
                  </label>
                  <input
                    type="text"
                    value={selectedProduct?.name || ''}
                    readOnly
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-gray-50 dark:bg-[var(--bg-tertiary)] text-[var(--text-primary)] cursor-not-allowed"
                    placeholder="Sélectionner une pièce"
                  />
                </div>

                {/* Qté */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Qté
                  </label>
                  <div className="flex items-center border border-[var(--border-color)] rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setPartQuantity(Math.max(1, partQuantity - 1))
                      }
                      className="px-2 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={partQuantity}
                      onChange={e =>
                        setPartQuantity(
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      className="w-full px-2 py-2.5 text-center border-0 bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPartQuantity(partQuantity + 1)}
                      className="px-2 py-2.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Prix */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Prix
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partPrice}
                      onChange={e =>
                        setPartPrice(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {selectedProduct && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        <Warehouse className="w-4 h-4" />
                        <span>{selectedProduct.stockQty || 0}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remise */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Remise
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={partDiscount}
                      onChange={e =>
                        setPartDiscount(
                          Math.max(
                            0,
                            Math.min(100, parseFloat(e.target.value) || 0)
                          )
                        )
                      }
                      className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
                      %
                    </span>
                  </div>
                </div>

                {/* Ajouter Button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddPart}
                    disabled={!selectedProduct}
                    className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter +
                  </button>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white dark:bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  Aucune pièce ajoutée. Utilisez le formulaire ci-dessus pour
                  ajouter des pièces.
                </div>
              ) : (
                <>
                  {/* Edit Panel */}
                  {selectedItems.size > 0 && (
                    <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                          Modifier{' '}
                          {selectedItems.size === 1
                            ? "l'article sélectionné"
                            : `les ${selectedItems.size} articles sélectionnés`}
                        </h3>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                            Prix Unitaire{' '}
                            {selectedItems.size > 1 &&
                              '(désactivé pour plusieurs articles)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            disabled={selectedItems.size >= 2}
                            placeholder={
                              selectedItems.size > 1 ? 'Prix...' : ''
                            }
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-[var(--bg-tertiary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                            Remise (%){' '}
                            {selectedItems.size > 1 && '(appliquée à tous)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={editDiscount}
                            onChange={e => setEditDiscount(e.target.value)}
                            placeholder="Remise..."
                            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleApplyEdits}
                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                          >
                            Appliquer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[var(--border-color)]">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                            <input
                              type="checkbox"
                              checked={
                                cart.length > 0 &&
                                selectedItems.size === cart.length
                              }
                              onChange={handleSelectAll}
                              className="w-4 h-4 text-purple-600 border-[var(--border-color)] rounded focus:ring-purple-500"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                            Référence
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                            Désignation
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)]">
                            Qté
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                            Prix Unitaire
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)]">
                            Remise
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                            Total
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)]">
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
                          const lowStock = isLowStock(item);

                          const isSelected = selectedItems.has(item.productId);

                          return (
                            <tr
                              key={item.productId}
                              className={`border-b border-[var(--border-color)] transition-colors ${
                                isSelected
                                  ? 'bg-purple-100 dark:bg-purple-900/30'
                                  : 'hover:bg-purple-50/50 dark:hover:bg-[var(--bg-tertiary)]'
                              }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleToggleItemSelection(item.productId)
                                  }
                                  className="w-4 h-4 text-purple-600 border-[var(--border-color)] rounded focus:ring-purple-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                                <div className="flex items-center gap-2">
                                  {item.sku}
                                  {!lowStock && (
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                                <div className="font-medium">{item.name}</div>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                                {item.qty}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-[var(--text-primary)]">
                                {baseUnitPrice.toFixed(2)} TND
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                                {discountRate > 0 ? (
                                  <span className="text-green-600 dark:text-green-400 font-medium">
                                    {discountRate}%
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-secondary)]">
                                    0%
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-[var(--text-primary)]">
                                {lowStock ? (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-semibold">
                                    <AlertTriangle className="w-3 h-3" />
                                    Stock Faible
                                  </div>
                                ) : (
                                  <span>{itemTotalInclTax.toFixed(2)} TND</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveFromCart(item.productId)
                                  }
                                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Résumé de la Vente - Under Items Table */}
            <div className="bg-white dark:bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
              <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-6">
                Résumé de la Vente
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Sous-Total */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Sous-Total
                  </span>
                  <span className="text-lg font-semibold text-[var(--text-primary)]">
                    {totals.subtotalAfterGlobalDiscount?.toFixed(2) ||
                      totals.subtotalInclTax.toFixed(2)}{' '}
                    TND
                  </span>
                </div>

                {/* Remise Globale */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      Remise Globale
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={globalDiscount}
                        onChange={e =>
                          setGlobalDiscount(
                            Math.max(
                              0,
                              Math.min(100, parseFloat(e.target.value) || 0)
                            )
                          )
                        }
                        className="w-14 px-2 py-1 text-center border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                      />
                      <span className="text-xs text-[var(--text-secondary)]">
                        %
                      </span>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                    - {totals.globalDiscountAmount?.toFixed(2) || '0.00'} TND
                  </span>
                </div>

                {/* TVA */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                    TVA (19%)
                  </span>
                  <span className="text-lg font-semibold text-[var(--text-primary)]">
                    + {totals.totalTax.toFixed(2)} TND
                  </span>
                </div>

                {/* TOTAL À PAYER */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                    TOTAL À PAYER
                  </span>
                  <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {totals.totalInclTax.toFixed(2)} TND
                  </span>
                </div>
              </div>

              {/* Loyalty Discount - if applicable */}
              {totals.loyaltyDiscount > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Remise Fidélité ({totals.loyaltyDiscount}%)
                  </span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    - {totals.loyaltyDiscountAmount.toFixed(2)} TND
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-4 justify-end">
          <button
            type="button"
            onClick={handleSubmitSale}
            disabled={submitting || cart.length === 0}
            className="px-6 py-3 bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] border-2 border-[var(--border-color)] rounded-lg hover:bg-purple-50 dark:hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Enregistrer
          </button>
          <button
            type="button"
            className="px-6 py-3 bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] border-2 border-[var(--border-color)] rounded-lg hover:bg-purple-50 dark:hover:bg-[var(--bg-tertiary)] transition-colors font-medium flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Imprimer
          </button>
          <form onSubmit={handleSubmitSale}>
            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              Valider & Nouvelle Vente
            </button>
          </form>
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
