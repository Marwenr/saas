'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2 } from 'lucide-react';

import AuthGuard from '../../../components/AuthGuard';
import ProductForm from '../../../components/ProductForm';
import SupplierForm from '../../../components/SupplierForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../lib/useAuth';
import { fetchSuppliers } from '../../../lib/suppliers';
import { fetchProducts } from '../../../lib/products';
import { createPurchaseOrder } from '../../../lib/purchases';
import { parseInvoice } from '../../../lib/invoices';

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
  const [successMessage, setSuccessMessage] = useState(null);
  const [parsingInvoice, setParsingInvoice] = useState(false);
  const fileInputRef = useRef(null);

  // Product search state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Supplier search state
  const [supplierSearchInput, setSupplierSearchInput] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [supplierSearchResults, setSupplierSearchResults] = useState([]);
  const [supplierSearchLoading, setSupplierSearchLoading] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const supplierSearchTimeoutRef = useRef(null);
  const supplierInputRef = useRef(null);

  const [formData, setFormData] = useState({
    supplierId: '',
    status: 'RECEIVED', // default to 'RECEIVED'
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: new Date().toISOString().split('T')[0],
    invoiceReference: '',
    notes: '',
  });

  const [items, setItems] = useState([]);
  const [productMap, setProductMap] = useState({}); // Map productId -> product data for display

  // Queue for products to create from auto-complete
  const [productsToCreateQueue, setProductsToCreateQueue] = useState([]);
  const [currentProductToCreate, setCurrentProductToCreate] = useState(null);
  const [showProductCreationModal, setShowProductCreationModal] =
    useState(false);
  const [totalProductsToCreate, setTotalProductsToCreate] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  // Product selection modal (when products with same manufacturerRef exist)
  const [showProductSelectionModal, setShowProductSelectionModal] =
    useState(false);
  const [productsToSelectQueue, setProductsToSelectQueue] = useState([]);
  const [currentItemForSelection, setCurrentItemForSelection] = useState(null);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

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
  }, [searchQuery, performSearch]);

  // Debounced supplier search
  useEffect(() => {
    if (supplierSearchTimeoutRef.current) {
      clearTimeout(supplierSearchTimeoutRef.current);
    }

    if (supplierSearchInput.trim()) {
      supplierSearchTimeoutRef.current = setTimeout(() => {
        setSupplierSearchQuery(supplierSearchInput.trim());
      }, 300); // 300ms debounce
    } else {
      setSupplierSearchQuery('');
      setSupplierSearchResults([]);
    }

    return () => {
      if (supplierSearchTimeoutRef.current) {
        clearTimeout(supplierSearchTimeoutRef.current);
      }
    };
  }, [supplierSearchInput]);

  // Fetch suppliers when search query changes
  useEffect(() => {
    if (supplierSearchQuery) {
      performSupplierSearch();
    } else {
      // If no search query, show all active suppliers
      setSupplierSearchResults(suppliers.filter(s => s.isActive !== false));
    }
  }, [supplierSearchQuery, suppliers, performSupplierSearch]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load suppliers
      const suppliersData = await fetchSuppliers({ page: 1, limit: 100 });
      const loadedSuppliers = suppliersData.suppliers || [];
      setSuppliers(loadedSuppliers);
      // Initialize search results with all active suppliers
      setSupplierSearchResults(
        loadedSuppliers.filter(s => s.isActive !== false)
      );
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const performSupplierSearch = useCallback(async () => {
    try {
      setSupplierSearchLoading(true);
      const data = await fetchSuppliers({
        page: 1,
        limit: 50,
        search: supplierSearchQuery,
      });
      setSupplierSearchResults(data.suppliers || []);
    } catch (err) {
      console.error('Failed to search suppliers:', err);
      setSupplierSearchResults([]);
    } finally {
      setSupplierSearchLoading(false);
    }
  }, [supplierSearchQuery]);

  const handleSupplierCreated = async supplier => {
    // Reload suppliers list
    await loadSuppliers();

    // Select the newly created supplier
    if (supplier && (supplier._id || supplier.id)) {
      setFormData(prev => ({
        ...prev,
        supplierId: supplier._id || supplier.id,
      }));
      setSupplierSearchInput('');
      setShowSupplierDropdown(false);
    }

    // Close modal
    setShowNewSupplierModal(false);
  };

  const performSearch = useCallback(async () => {
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
  }, [searchQuery]);

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
    // If we're in the process of creating products from auto-complete queue
    if (currentProductToCreate) {
      // Update the item with the new productId
      const itemIndex = currentProductToCreate.itemIndex;
      setItems(prev =>
        prev.map((item, i) => {
          if (i === itemIndex) {
            return {
              ...item,
              productId: product._id || product.id,
              _tempManufacturerRef: undefined,
              _tempDescription: undefined,
            };
          }
          return item;
        })
      );

      // Add product to map
      const productId = product._id || product.id;
      setProductMap(prev => ({
        ...prev,
        [productId]: product,
      }));

      // Remove the created product from the creation queue
      setProductsToCreateQueue(prev =>
        prev.filter(p => p.itemIndex !== itemIndex)
      );

      // Clear current product to create
      setCurrentProductToCreate(null);
      setShowProductCreationModal(false);

      // Check if there are more products to select first, then creation
      processNextSelectionOrCreation();
    } else {
      // Normal flow - add the newly created product to the PO
      handleAddProductFromSearch(product);

      // Optionally refresh search results to include the new product
      if (searchQuery) {
        performSearch();
      }
    }
  };

  const processNextProductInQueue = () => {
    setProductsToCreateQueue(prev => {
      if (prev.length > 0) {
        // Get next product from queue
        const nextProduct = prev[0];
        const remainingQueue = prev.slice(1);

        // Calculate current index: total - remaining = current
        // Example: if total=2 and remaining=1, then current=1 (first product)
        // Example: if total=2 and remaining=0, then current=2 (last product)
        const currentIndex = totalProductsToCreate - remainingQueue.length;

        setCurrentProductToCreate(nextProduct);
        setCurrentProductIndex(currentIndex);
        setShowProductCreationModal(true);

        return remainingQueue;
      } else {
        // Queue is empty, close modal
        setCurrentProductToCreate(null);
        setShowProductCreationModal(false);
        setTotalProductsToCreate(0);
        setCurrentProductIndex(0);
        setSuccessMessage(
          'Tous les produits ont été créés avec succès et ajoutés au bon de commande !'
        );
        setTimeout(() => setSuccessMessage(null), 5000);
        return [];
      }
    });
  };

  const handleProductCreationCancel = () => {
    // Remove current product from queue and process next
    setCurrentProductToCreate(null);
    setShowProductCreationModal(false);

    if (productsToCreateQueue.length > 0) {
      processNextProductInQueue();
    } else {
      setSuccessMessage(
        'Création de produits annulée. Les produits non trouvés restent dans la liste pour sélection manuelle.'
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleProductSelected = selectedProduct => {
    if (!currentItemForSelection || isProcessingSelection) return;

    // Set processing immediately to prevent double clicks
    setIsProcessingSelection(true);

    const itemIndex = currentItemForSelection.itemIndex;
    const productId = selectedProduct._id || selectedProduct.id;

    // Update the item with the selected productId
    setItems(prev =>
      prev.map((item, i) => {
        if (i === itemIndex) {
          return {
            ...item,
            productId,
            _tempManufacturerRef: undefined,
            _tempDescription: undefined,
            _tempFoundProducts: undefined,
          };
        }
        return item;
      })
    );

    // Add product to map
    setProductMap(prev => ({
      ...prev,
      [productId]: selectedProduct,
    }));

    // Close selection modal
    setShowProductSelectionModal(false);

    // Process next selection or creation after a small delay
    setTimeout(() => {
      setIsProcessingSelection(false);
      processNextSelectionOrCreation();
    }, 50);
  };

  const handleCreateNewProductFromSelection = () => {
    if (!currentItemForSelection) return;

    // Close selection modal
    setShowProductSelectionModal(false);
    const itemData = currentItemForSelection;

    // Calculate current index for creation queue
    const currentQueueLength = productsToCreateQueue.length;
    const newTotal = currentQueueLength + 1;

    // Add to creation queue
    setProductsToCreateQueue(prev => [
      ...prev,
      {
        itemIndex: itemData.itemIndex,
        manufacturerRef: itemData.manufacturerRef || '',
        description: itemData.description || '',
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        taxRate: itemData.taxRate,
      },
    ]);
    setTotalProductsToCreate(newTotal);
    setCurrentProductToCreate({
      itemIndex: itemData.itemIndex,
      manufacturerRef: itemData.manufacturerRef || '',
      description: itemData.description || '',
      quantity: itemData.quantity,
      unitPrice: itemData.unitPrice,
      taxRate: itemData.taxRate,
    });
    setCurrentProductIndex(newTotal);
    setShowProductCreationModal(true);

    // Clear current selection
    setCurrentItemForSelection(null);
  };

  const processNextSelectionOrCreation = () => {
    // Small delay to ensure state updates are processed
    setTimeout(() => {
      // Check if there are more products to select
      if (productsToSelectQueue.length > 0) {
        const nextSelection = productsToSelectQueue[0];
        setProductsToSelectQueue(prev => prev.slice(1));
        setCurrentItemForSelection(nextSelection);
        setIsProcessingSelection(false); // Reset before opening next modal
        // Small delay before opening to ensure state is ready
        setTimeout(() => {
          setShowProductSelectionModal(true);
        }, 50);
      } else if (productsToCreateQueue.length > 0) {
        // No more selections, start creation process
        setIsProcessingSelection(false);
        processNextProductInQueue();
      } else {
        // All done
        setCurrentItemForSelection(null);
        setShowProductSelectionModal(false);
        setIsProcessingSelection(false);
        setSuccessMessage('Tous les produits ont été traités avec succès !');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    }, 100);
  };

  const getProductDisplay = (productId, item = null) => {
    if (productId) {
      const product = productMap[productId];
      if (!product) return 'Produit inconnu';
      return `${product.manufacturerRef || 'N/A'} - ${product.name || 'Sans nom'}`;
    }

    // If no productId but has temp data from invoice parsing
    if (item?._tempManufacturerRef || item?._tempDescription) {
      const ref = item._tempManufacturerRef || 'N/A';
      const desc = item._tempDescription || '';
      return `${ref}${desc ? ` - ${desc}` : ''} (À sélectionner)`;
    }

    return 'Ligne vide - Recherchez un produit ci-dessus';
  };

  const calculateItemTotal = item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const tax = parseFloat(item.taxRate) || 0;
    return qty * price * (1 + tax / 100);
  };

  const calculateSubTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  const calculateTax = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      return sum + qty * price * (taxRate / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubTotal() + calculateTax();
  };

  const handleAutoComplete = async file => {
    if (!file) return;

    try {
      setParsingInvoice(true);
      setError(null);

      // Parse the invoice
      const response = await parseInvoice(file);

      if (!response.success || !response.invoice) {
        throw new Error('Failed to parse invoice or invalid response');
      }

      const invoice = response.invoice;

      // Update form data with invoice data
      if (invoice.order_date) {
        const orderDate = new Date(invoice.order_date);
        setFormData(prev => ({
          ...prev,
          orderDate: orderDate.toISOString().split('T')[0],
        }));
      }

      if (invoice.expected_date) {
        const expectedDate = new Date(invoice.expected_date);
        setFormData(prev => ({
          ...prev,
          expectedDate: expectedDate.toISOString().split('T')[0],
        }));
      }

      // Add invoice reference if available
      if (
        invoice.invoice_number ||
        invoice.invoice_reference ||
        invoice.order_number
      ) {
        const invoiceRef =
          invoice.invoice_number ||
          invoice.invoice_reference ||
          invoice.order_number;
        setFormData(prev => ({
          ...prev,
          invoiceReference: invoiceRef,
        }));
      }

      // Add order number to notes if available (only if not already set as invoice reference)
      if (
        invoice.order_number &&
        !invoice.invoice_number &&
        !invoice.invoice_reference
      ) {
        setFormData(prev => ({
          ...prev,
          notes: prev.notes
            ? `${prev.notes}\nNuméro de commande: ${invoice.order_number}`
            : `Numéro de commande: ${invoice.order_number}`,
        }));
      }

      // Process items - try to find products by manufacturer_ref
      const newItems = [];
      const newProductMap = { ...productMap };

      for (const invoiceItem of invoice.items || []) {
        const manufacturerRef = invoiceItem.product?.manufacturer_ref;
        const description = invoiceItem.product?.description || '';
        const quantity = invoiceItem.quantity || 1;
        const unitPrice = invoiceItem.unit_price || 0;
        const taxRate = invoice.tax_rate || 0;

        // Try to find products by manufacturer_ref (can be multiple)
        let foundProducts = [];
        if (manufacturerRef) {
          try {
            const searchResults = await fetchProducts({
              page: 1,
              limit: 50, // Increase limit to find all products with same manufacturerRef
              search: manufacturerRef,
            });

            // Find all products with exact match by manufacturerRef
            foundProducts =
              searchResults.products?.filter(
                p => p.manufacturerRef === manufacturerRef
              ) || [];
          } catch (err) {
            console.warn('Failed to search for product:', err);
          }
        }

        if (foundProducts.length > 0) {
          // Products found - user needs to select or create new
          // Store found products for selection modal
          newItems.push({
            productId: '', // Empty - user needs to select
            quantity,
            unitPrice,
            taxRate,
            _tempManufacturerRef: manufacturerRef,
            _tempDescription: description,
            _tempFoundProducts: foundProducts, // Store found products for selection
          });
        } else {
          // No product found - will be added to creation queue
          newItems.push({
            productId: '', // Empty - user needs to select
            quantity,
            unitPrice,
            taxRate,
            _tempManufacturerRef: manufacturerRef,
            _tempDescription: description,
          });
        }
      }

      // Update items and product map
      setItems(newItems);
      setProductMap(newProductMap);

      // Separate items that need selection vs creation
      const productsToSelect = [];
      const productsToCreate = [];
      newItems.forEach((item, index) => {
        if (
          !item.productId &&
          (item._tempManufacturerRef || item._tempDescription)
        ) {
          if (item._tempFoundProducts && item._tempFoundProducts.length > 0) {
            // Products found - needs selection
            productsToSelect.push({
              itemIndex: index,
              manufacturerRef: item._tempManufacturerRef || '',
              description: item._tempDescription || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              foundProducts: item._tempFoundProducts,
            });
          } else {
            // No product found - needs creation
            productsToCreate.push({
              itemIndex: index,
              manufacturerRef: item._tempManufacturerRef || '',
              description: item._tempDescription || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
            });
          }
        }
      });

      // Show success message
      if (newItems.length > 0) {
        const foundCount = newItems.filter(item => item.productId).length;
        const notFoundCount = newItems.length - foundCount;

        if (notFoundCount > 0) {
          // First, handle product selection if needed
          if (productsToSelect.length > 0) {
            // Store all products that need selection (excluding the first one)
            // The first one will be in currentItemForSelection
            const firstSelection = productsToSelect[0];
            const remainingSelections = productsToSelect.slice(1);
            setProductsToSelectQueue(remainingSelections);
            // Start with first product that needs selection
            setCurrentItemForSelection(firstSelection);
            setIsProcessingSelection(false); // Ensure it's false when opening
            setShowProductSelectionModal(true);
          } else if (productsToCreate.length > 0) {
            // No selection needed, start creation process
            setProductsToCreateQueue(productsToCreate);
            setTotalProductsToCreate(productsToCreate.length);
            setTimeout(() => {
              processNextProductInQueue();
            }, 100);
          }

          setSuccessMessage(
            `Facture parsée avec succès ! ${foundCount} produit(s) trouvé(s). ${productsToSelect.length > 0 ? `${productsToSelect.length} produit(s) à sélectionner. ` : ''}${productsToCreate.length > 0 ? `${productsToCreate.length} nouveau(x) produit(s) à créer.` : ''}`
          );
          setError(null);
        } else {
          setSuccessMessage(
            `Facture parsée avec succès ! ${foundCount} produit(s) ajouté(s) automatiquement.`
          );
          setError(null);
        }

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to parse invoice:', err);
      setError(
        err.message || 'Échec du parsing de la facture. Veuillez réessayer.'
      );
    } finally {
      setParsingInvoice(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (file) {
      handleAutoComplete(file);
    }
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

      // Prepare payload - clean temporary fields
      // Build notes with invoice reference if available
      let notesContent = formData.notes.trim();
      if (formData.invoiceReference) {
        const invoiceRefNote = `Référence facture: ${formData.invoiceReference}`;
        notesContent = notesContent
          ? `${invoiceRefNote}\n${notesContent}`
          : invoiceRefNote;
      }

      const payload = {
        supplierId: formData.supplierId,
        status: formData.status, // Include status
        orderDate: formData.orderDate || new Date().toISOString(),
        expectedDate: formData.expectedDate || undefined,
        notes: notesContent || undefined,
        items: items
          .filter(item => item.productId) // Only include items with productId
          .map(item => ({
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
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
            Nouveau bon de commande
          </h1>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="invoice-file-input"
            />
            <label
              htmlFor="invoice-file-input"
              className={`px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer flex items-center gap-2 ${
                parsingInvoice ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {parsingInvoice ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyse en cours...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Auto Complete</span>
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 shadow-sm">
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 rounded-xl text-green-700 dark:text-green-400 shadow-sm">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Supplier and dates */}
        <div className="mb-6 p-6 border border-border rounded-xl bg-card shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Informations générales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-1">
                Fournisseur <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={supplierInputRef}
                  type="text"
                  value={
                    supplierSearchInput ||
                    (formData.supplierId
                      ? suppliers.find(
                          s => (s._id || s.id) === formData.supplierId
                        )?.name || ''
                      : '')
                  }
                  onChange={e => {
                    const value = e.target.value;
                    setSupplierSearchInput(value);
                    setShowSupplierDropdown(true);
                    // Clear selection if user starts typing something different
                    if (formData.supplierId) {
                      const selectedSupplier = suppliers.find(
                        s => (s._id || s.id) === formData.supplierId
                      );
                      if (
                        !selectedSupplier ||
                        value !== selectedSupplier.name
                      ) {
                        setFormData(prev => ({ ...prev, supplierId: '' }));
                      }
                    }
                  }}
                  onFocus={() => {
                    setShowSupplierDropdown(true);
                    // If a supplier is selected, show all suppliers on focus
                    if (formData.supplierId && !supplierSearchInput) {
                      setSupplierSearchResults(
                        suppliers.filter(s => s.isActive !== false)
                      );
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on dropdown items
                    setTimeout(() => {
                      setShowSupplierDropdown(false);
                      // Reset input to show selected supplier name if one is selected
                      if (formData.supplierId && !supplierSearchInput) {
                        const selectedSupplier = suppliers.find(
                          s => (s._id || s.id) === formData.supplierId
                        );
                        if (selectedSupplier) {
                          // Input will show the name via the value prop
                        }
                      } else if (!formData.supplierId) {
                        setSupplierSearchInput('');
                      }
                    }, 200);
                  }}
                  placeholder="Rechercher un fournisseur..."
                  required={!formData.supplierId}
                  className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                />
                {supplierSearchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {showSupplierDropdown &&
                  (supplierSearchResults.length > 0 ||
                    supplierSearchInput.trim() ||
                    !supplierSearchInput.trim()) && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {supplierSearchLoading ? (
                        <div className="p-4 text-center text-muted-foreground">
                          Recherche en cours...
                        </div>
                      ) : supplierSearchResults.length === 0 ? (
                        <div className="p-4 space-y-2">
                          <div className="text-center text-muted-foreground mb-2">
                            Aucun fournisseur trouvé
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewSupplierModal(true);
                              setShowSupplierDropdown(false);
                            }}
                            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                          >
                            + Créer un nouveau fournisseur
                          </button>
                        </div>
                      ) : (
                        <>
                          {supplierSearchResults.map(supplier => (
                            <button
                              key={supplier._id || supplier.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  supplierId: supplier._id || supplier.id,
                                }));
                                setSupplierSearchInput('');
                                setShowSupplierDropdown(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-foreground"
                            >
                              {supplier.name}
                            </button>
                          ))}
                          <div className="border-t border-border">
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewSupplierModal(true);
                                setShowSupplierDropdown(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm font-medium text-primary"
                            >
                              + Créer un nouveau fournisseur
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Statut <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                required
                className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
              >
                <option value="DRAFT">Brouillon</option>
                <option value="PENDING">En attente</option>
                <option value="PARTIAL">Partiellement reçu</option>
                <option value="RECEIVED">Reçu</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Date de commande
              </label>
              <input
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleFormChange}
                className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Date de livraison prévue
              </label>
              <input
                type="date"
                name="expectedDate"
                value={formData.expectedDate}
                onChange={handleFormChange}
                className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Référence facture
              </label>
              <input
                type="text"
                name="invoiceReference"
                value={formData.invoiceReference}
                onChange={handleFormChange}
                className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                placeholder="Référence de la facture..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                rows={2}
                className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>
        </div>

        {/* Product Search Section */}
        <div className="mb-6 p-6 border border-border rounded-xl bg-card shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Rechercher et ajouter des produits
          </h2>

          {/* Search Input */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Rechercher par nom, Réf. fabricant, OEM..."
                className="flex-1 px-4 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
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
            <div className="text-center py-4 text-muted-foreground">
              Recherche en cours...
            </div>
          )}

          {!searchLoading && searchQuery && searchResults.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Aucun produit trouvé. Cliquez sur &quot;Ajouter une nouvelle
              pièce&quot; pour créer un nouveau produit.
            </div>
          )}

          {!searchLoading && searchResults.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-foreground border-b border-border">
                        Réf. fabricant
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-foreground border-b border-border">
                        Nom
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-foreground border-b border-border">
                        Marque
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-foreground border-b border-border">
                        Prix d&apos;achat
                      </th>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-foreground border-b border-border">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map(product => (
                      <tr
                        key={product._id || product.id}
                        className="hover:bg-muted/50 transition-colors border-b border-border"
                      >
                        <td className="px-4 py-2 text-sm text-foreground">
                          {product.manufacturerRef || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground">
                          {product.name || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">
                          {product.brand?.name || product.brand || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-right">
                          {product.purchasePrice !== undefined
                            ? `${product.purchasePrice.toFixed(3)} TND`
                            : '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleAddProductFromSearch(product)}
                            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
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
        <div className="mb-6 p-6 border border-border rounded-xl bg-card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Lignes de commande
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
            >
              Ajouter une ligne vide
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun produit ajouté. Recherchez et ajoutez des produits
              ci-dessus.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left text-sm font-semibold text-foreground">
                      Produit (Réf. fabricant - Nom)
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                      Quantité
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                      Prix unitaire
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                      TVA (%)
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                      Total
                    </th>
                    <th className="px-3 py-2 text-center text-sm font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-3 py-2">
                        <span
                          className={
                            item.productId
                              ? 'text-foreground'
                              : 'text-muted-foreground italic'
                          }
                        >
                          {getProductDisplay(item.productId, item)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={e =>
                            handleItemChange(index, 'quantity', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.unitPrice}
                          onChange={e =>
                            handleItemChange(index, 'unitPrice', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.001"
                          value={item.taxRate}
                          onChange={e =>
                            handleItemChange(index, 'taxRate', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-foreground font-medium">
                        {calculateItemTotal(item).toFixed(3)} TND
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="px-2 py-1 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td
                      colSpan="4"
                      className="px-3 py-2 text-right font-semibold text-foreground"
                    >
                      Total:
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {calculateSubTotal().toFixed(3)} TND
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td
                      colSpan="4"
                      className="px-3 py-2 text-right font-semibold text-foreground"
                    >
                      Tax:
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {calculateTax().toFixed(3)} TND
                    </td>
                    <td></td>
                  </tr>
                  <tr className="border-t-2 border-border">
                    <td
                      colSpan="4"
                      className="px-3 py-2 text-right font-bold text-foreground"
                    >
                      Total incluant tax:
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-foreground">
                      {calculateTotal().toFixed(3)} TND
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
            className="px-4 py-2 border border-border rounded-xl bg-card text-foreground hover:bg-muted transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : 'Créer le bon de commande'}
          </button>
        </div>
      </form>

      {/* New Product Modal (manual) */}
      {showNewProductModal && (
        <ProductForm
          onClose={() => setShowNewProductModal(false)}
          onCreated={handleProductCreated}
        />
      )}

      {/* Product Selection Modal (when products with same manufacturerRef exist) */}
      {showProductSelectionModal && currentItemForSelection && (
        <Dialog
          open={showProductSelectionModal}
          onOpenChange={open => {
            // Only handle close if not processing (to avoid conflicts)
            if (!open && !isProcessingSelection) {
              // If closed, skip this selection and move to next
              processNextSelectionOrCreation();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Sélectionner un produit</DialogTitle>
              <DialogDescription>
                {currentItemForSelection.foundProducts.length === 1
                  ? `Un produit trouvé avec la référence "${currentItemForSelection.manufacturerRef}". Veuillez sélectionner ce produit ou créer un nouveau produit.`
                  : `Plusieurs produits trouvés avec la référence "${currentItemForSelection.manufacturerRef}". Veuillez sélectionner le produit correct ou créer un nouveau produit.`}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[50vh] overflow-y-auto">
              <div className="space-y-2">
                {currentItemForSelection.foundProducts.map(product => (
                  <div
                    key={product._id || product.id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">
                          {product.name || 'Sans nom'}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <div>
                            <span className="font-medium">Réf. fabricant:</span>{' '}
                            {product.manufacturerRef || 'N/A'}
                          </div>
                          {product.brand?.name && (
                            <div>
                              <span className="font-medium">Marque:</span>{' '}
                              {product.brand.name}
                            </div>
                          )}
                          {product.category && (
                            <div>
                              <span className="font-medium">Catégorie:</span>{' '}
                              {product.category}
                            </div>
                          )}
                          {product.description && (
                            <div className="mt-2 text-xs">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-sm font-semibold text-foreground">
                          {product.purchasePrice !== undefined
                            ? `${product.purchasePrice.toFixed(3)} TND`
                            : '-'}
                        </div>
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => handleProductSelected(product)}
                          disabled={isProcessingSelection}
                        >
                          {isProcessingSelection
                            ? 'Traitement...'
                            : 'Sélectionner'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleCreateNewProductFromSelection}
                className="w-full sm:w-auto"
              >
                Créer un nouveau produit
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowProductSelectionModal(false);
                  processNextSelectionOrCreation();
                }}
                disabled
                className="w-full sm:w-auto opacity-50 cursor-not-allowed"
              >
                Passer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Product Creation Modal (from auto-complete queue) */}
      {showProductCreationModal && currentProductToCreate && (
        <ProductForm
          product={{
            // No _id means it's a new product with initial data
            manufacturerRef: currentProductToCreate.manufacturerRef || '',
            name:
              currentProductToCreate.description ||
              currentProductToCreate.manufacturerRef ||
              '',
            description: currentProductToCreate.description || '',
            purchasePrice: currentProductToCreate.unitPrice || 0,
            taxRate: currentProductToCreate.taxRate || 19,
          }}
          onClose={handleProductCreationCancel}
          onCreated={handleProductCreated}
          open={showProductCreationModal}
          queueInfo={{
            current: totalProductsToCreate - productsToCreateQueue.length,
            total: totalProductsToCreate,
          }}
        />
      )}

      {/* New Supplier Modal */}
      {showNewSupplierModal && (
        <SupplierForm
          onClose={() => setShowNewSupplierModal(false)}
          onCreated={handleSupplierCreated}
          open={showNewSupplierModal}
        />
      )}
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
