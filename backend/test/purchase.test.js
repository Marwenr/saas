/**
 * Test: Purchase Order Reception (Stock IN)
 */
import { describe, it, expect, beforeEach } from 'vitest';

import Company from '../src/models/company.model.js';
import Product from '../src/models/product.model.js';
import PurchaseOrder from '../src/models/purchaseOrder.model.js';
import StockMovement from '../src/models/stockMovement.model.js';
import Supplier from '../src/models/supplier.model.js';
import User from '../src/models/User.js';

import { buildApp, createTestToken } from './helpers/app.js';

describe('Purchase Order Reception (Stock IN)', () => {
  let app;
  let testUser;
  let testCompany;
  let authToken;
  let supplier;
  let product;

  beforeEach(async () => {
    app = await buildApp();

    // Create test company and user with unique identifiers
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    testCompany = await Company.create({
      name: 'Test Company',
      email: `test-${timestamp}-${random}@test.com`,
      country: 'TN',
    });

    testUser = await User.create({
      email: `user-${timestamp}-${random}@test.com`,
      password: 'password123',
      name: 'Test User',
      companyId: testCompany._id,
      role: 'owner',
    });

    authToken = createTestToken(app, {
      userId: testUser._id.toString(),
      companyId: testCompany._id.toString(),
      role: 'owner',
    });

    // Create supplier
    supplier = await Supplier.create({
      companyId: testCompany._id,
      name: 'Test Supplier',
      email: 'supplier@test.com',
      isDeleted: false, // Explicitly set to ensure it's not undefined
      isActive: true,
    });

    // Create product with initial stock
    product = await Product.create({
      companyId: testCompany._id,
      sku: `PROD-001-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: 'Test Product',
      salePrice: 100,
      purchasePrice: 50,
      stockQty: 10, // Initial stock
      isActive: true,
      isDeleted: false,
    });

    // Product.create() should save immediately
    if (!product._id) {
      throw new Error('Product was not created properly - missing ID');
    }

    // Store SKU for fallback queries
    const _productSku = product.sku;
  });

  it('should receive a purchase order and increase stock', async () => {
    // Refresh product from database to ensure it exists
    let activeProduct = await Product.findById(product._id);
    if (!activeProduct) {
      activeProduct = await Product.findOne({
        companyId: testCompany._id,
        sku: product.sku,
      });
    }
    expect(activeProduct).toBeTruthy();

    // Create purchase order
    const poData = {
      supplierId: supplier._id.toString(),
      orderNumber: 'PO-001',
      items: [
        {
          productId: activeProduct._id.toString(),
          quantity: 20,
          unitPrice: 60,
          taxRate: 19,
        },
      ],
      status: 'PENDING',
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/purchases/orders',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: poData,
    });

    expect(createResponse.statusCode).toBe(201);
    const createBody = JSON.parse(createResponse.body);
    expect(createBody).toHaveProperty('purchaseOrder');
    const purchaseOrderId = createBody.purchaseOrder._id.toString();

    // Verify purchase order exists and has correct companyId
    const poBeforeReceive = await PurchaseOrder.findById(purchaseOrderId);
    expect(poBeforeReceive).toBeTruthy();
    expect(poBeforeReceive.companyId.toString()).toBe(
      testCompany._id.toString()
    );
    expect(poBeforeReceive.isDeleted).toBe(false);

    // Verify initial stock
    const productBefore = await Product.findById(activeProduct._id);
    expect(productBefore).toBeTruthy();
    expect(productBefore.stockQty).toBe(10);

    // Receive purchase order
    const receiveResponse = await app.inject({
      method: 'POST',
      url: `/api/purchases/orders/${purchaseOrderId}/receive`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        // Empty lines array means receive all remaining
        lines: [],
        reference: 'REC-001',
      },
    });

    if (receiveResponse.statusCode !== 200) {
      const errorBody = JSON.parse(receiveResponse.body);
      console.error('Receive failed:', receiveResponse.statusCode, errorBody);
      // Verify PO still exists after failure
      const poAfterFail = await PurchaseOrder.findById(purchaseOrderId);
      console.error(
        'PO after fail:',
        poAfterFail
          ? {
              id: poAfterFail._id,
              companyId: poAfterFail.companyId,
              isDeleted: poAfterFail.isDeleted,
            }
          : 'null'
      );
    }
    expect(receiveResponse.statusCode).toBe(200);
    const _receiveBody = JSON.parse(receiveResponse.body);

    // Verify stock increased
    const productAfter = await Product.findById(activeProduct._id);
    expect(productAfter).toBeTruthy();
    expect(productAfter.stockQty).toBe(30); // 10 + 20

    // Verify purchase order status updated
    const updatedPO = await PurchaseOrder.findById(purchaseOrderId);
    expect(updatedPO.status).toBe('RECEIVED');
    expect(updatedPO.items[0].receivedQuantity).toBe(20);

    // Verify stock movement created
    const stockMovement = await StockMovement.findOne({
      productId: product._id,
      type: 'IN',
    });
    expect(stockMovement).toBeTruthy();
    expect(stockMovement.quantity).toBe(20);
    expect(stockMovement.beforeQty).toBe(10);
    expect(stockMovement.afterQty).toBe(30);
    expect(stockMovement.source).toBe('purchase');

    // Verify purchase price updated
    expect(productAfter.purchasePrice).toBeGreaterThan(0);
    expect(productAfter.lastPurchasePrice).toBe(60);
  });

  it('should automatically update salePrice using HYBRID mode when receiving purchase order', async () => {
    // Create product with pricing configuration
    const productWithPricing = await Product.create({
      companyId: testCompany._id,
      sku: `PROD-PRICING-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: 'Pricing Test Product',
      salePrice: 100, // Initial sale price
      purchasePrice: 50, // Initial average price
      lastPurchasePrice: 50,
      marginRate: 20, // 20% target margin
      minMarginOnLastPurchase: 10, // 10% minimum protection
      taxRate: 19, // 19% tax
      stockQty: 10,
      isActive: true,
      isDeleted: false,
    });

    // Create purchase order with new price
    const poData = {
      supplierId: supplier._id.toString(),
      items: [
        {
          productId: productWithPricing._id.toString(),
          quantity: 20,
          unitPrice: 60, // New purchase price
          taxRate: 19,
        },
      ],
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/purchases/orders',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: poData,
    });

    expect(createResponse.statusCode).toBe(201);
    const createBody = JSON.parse(createResponse.body);
    const purchaseOrderId = createBody.purchaseOrder._id.toString();

    // Receive order
    await app.inject({
      method: 'POST',
      url: `/api/purchases/orders/${purchaseOrderId}/receive`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: { lines: [] },
    });

    // Verify updated product
    const updatedProduct = await Product.findById(productWithPricing._id);
    expect(updatedProduct).toBeTruthy();

    // Verify average price updated (weighted average)
    // (10 * 50 + 20 * 60) / 30 = 56.67
    expect(updatedProduct.purchasePrice).toBeCloseTo(56.67, 1);
    expect(updatedProduct.lastPurchasePrice).toBe(60);

    // Verify sale price automatically recalculated using HYBRID mode
    // priceTarget = 56.67 * 1.20 = 68.00
    // priceMinSafe = 60 * 1.10 = 66.00
    // priceHT = max(68.00, 66.00) = 68.00
    // priceTTC = 68.00 * 1.19 = 80.92
    expect(updatedProduct.salePrice).toBeCloseTo(80.92, 2);
  });

  it('should use minimum safe price when last cost is higher than average', async () => {
    // Create product where last purchase will be higher
    const productHighLast = await Product.create({
      companyId: testCompany._id,
      sku: `PROD-HIGH-LAST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: 'High Last Price Product',
      salePrice: 100,
      purchasePrice: 50, // Low average
      lastPurchasePrice: 50,
      marginRate: 20,
      minMarginOnLastPurchase: 10,
      taxRate: 19,
      stockQty: 20,
      isActive: true,
      isDeleted: false,
    });

    // Create purchase order with high price
    const poData = {
      supplierId: supplier._id.toString(),
      items: [
        {
          productId: productHighLast._id.toString(),
          quantity: 10,
          unitPrice: 100, // High price (higher than average)
          taxRate: 19,
        },
      ],
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/purchases/orders',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: poData,
    });

    expect(createResponse.statusCode).toBe(201);
    const createBody = JSON.parse(createResponse.body);
    const purchaseOrderId = createBody.purchaseOrder._id.toString();

    // Receive order
    await app.inject({
      method: 'POST',
      url: `/api/purchases/orders/${purchaseOrderId}/receive`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: { lines: [] },
    });

    // Verify updated product
    const updatedProduct = await Product.findById(productHighLast._id);

    // Average: (20 * 50 + 10 * 100) / 30 = 66.67
    expect(updatedProduct.purchasePrice).toBeCloseTo(66.67, 1);
    expect(updatedProduct.lastPurchasePrice).toBe(100);

    // Sale price should use minimum safe price (protection)
    // priceTarget = 66.67 * 1.20 = 80.00
    // priceMinSafe = 100 * 1.10 = 110.00 (protection wins)
    // priceHT = max(80.00, 110.00) = 110.00
    // priceTTC = 110.00 * 1.19 = 130.90
    expect(updatedProduct.salePrice).toBeCloseTo(130.9, 2);
  });

  it('should update product purchase price with weighted average', async () => {
    // Create product with existing stock and price
    let productWithPrice = await Product.create({
      companyId: testCompany._id,
      sku: `PROD-WEIGHTED-${Date.now()}`,
      name: 'Weighted Price Product',
      salePrice: 100,
      purchasePrice: 50, // Initial average price
      stockQty: 20, // Initial stock
      isActive: true,
      isDeleted: false,
    });

    // Product.create() should save immediately
    if (!productWithPrice._id) {
      throw new Error('Product was not created properly - missing ID');
    }

    // Create and receive purchase order with different price
    const poData = {
      supplierId: supplier._id.toString(),
      items: [
        {
          productId: productWithPrice._id.toString(),
          quantity: 30,
          unitPrice: 70, // New price
          taxRate: 19,
        },
      ],
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/purchases/orders',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: poData,
    });

    if (createResponse.statusCode !== 201) {
      const errorBody = JSON.parse(createResponse.body);
      console.error(
        'Purchase order creation failed:',
        createResponse.statusCode,
        errorBody
      );
      // Verify product exists
      const checkProduct = await Product.findById(productWithPrice._id);
      console.error(
        'Product exists:',
        checkProduct
          ? {
              id: checkProduct._id,
              sku: checkProduct.sku,
              companyId: checkProduct.companyId,
            }
          : 'null'
      );
    }
    expect(createResponse.statusCode).toBe(201);
    const createBody = JSON.parse(createResponse.body);
    expect(createBody).toHaveProperty('purchaseOrder');
    const purchaseOrderId = createBody.purchaseOrder._id.toString();

    // Receive order
    await app.inject({
      method: 'POST',
      url: `/api/purchases/orders/${purchaseOrderId}/receive`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: { lines: [] },
    });

    // Verify weighted average price
    // (20 * 50 + 30 * 70) / (20 + 30) = (1000 + 2100) / 50 = 62
    const updatedProduct = await Product.findById(productWithPrice._id);
    expect(updatedProduct).toBeTruthy();
    expect(updatedProduct.purchasePrice).toBeCloseTo(62, 1);
    expect(updatedProduct.stockQty).toBe(50);
  });

  it('should allow partial reception', async () => {
    const poData = {
      supplierId: supplier._id.toString(),
      items: [
        {
          productId: product._id.toString(),
          quantity: 50,
          unitPrice: 60,
        },
      ],
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/purchases/orders',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: poData,
    });

    expect(createResponse.statusCode).toBe(201);
    const createBody = JSON.parse(createResponse.body);
    const purchaseOrderId = createBody.purchaseOrder._id.toString();

    // Verify purchase order exists and has correct companyId
    const poBeforeReceive = await PurchaseOrder.findById(purchaseOrderId);
    expect(poBeforeReceive).toBeTruthy();
    expect(poBeforeReceive.companyId.toString()).toBe(
      testCompany._id.toString()
    );

    // Verify product exists
    const productBefore = await Product.findById(product._id);
    expect(productBefore).toBeTruthy();

    // Receive partial quantity
    const receiveResponse = await app.inject({
      method: 'POST',
      url: `/api/purchases/orders/${purchaseOrderId}/receive`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        lines: [
          {
            productId: product._id.toString(),
            qtyToReceive: 25, // Half of 50
          },
        ],
      },
    });

    expect(receiveResponse.statusCode).toBe(200);

    // Verify partial reception
    const updatedPO = await PurchaseOrder.findById(purchaseOrderId);
    expect(updatedPO).toBeTruthy();
    expect(updatedPO.status).toBe('PARTIAL');
    expect(updatedPO.items[0].receivedQuantity).toBe(25);
    expect(updatedPO.items[0].quantity).toBe(50);

    // Verify stock increased by 25
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct).toBeTruthy();
    expect(updatedProduct.stockQty).toBe(35); // 10 + 25
  });

  it('should prevent over-reception', async () => {
    const poData = {
      supplierId: supplier._id.toString(),
      items: [
        {
          productId: product._id.toString(),
          quantity: 20,
          unitPrice: 60,
        },
      ],
    };

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/purchases/orders',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: poData,
    });

    expect(createResponse.statusCode).toBe(201);
    const createBody = JSON.parse(createResponse.body);
    expect(createBody).toHaveProperty('purchaseOrder');
    const purchaseOrderId = createBody.purchaseOrder._id.toString();

    // Try to receive more than ordered
    const receiveResponse = await app.inject({
      method: 'POST',
      url: `/api/purchases/orders/${purchaseOrderId}/receive`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        lines: [
          {
            productId: product._id.toString(),
            qtyToReceive: 30, // More than ordered (20)
          },
        ],
      },
    });

    expect(receiveResponse.statusCode).toBe(400);
    const body = JSON.parse(receiveResponse.body);
    expect(body.error.toLowerCase()).toContain('remaining to receive');
  });
});
