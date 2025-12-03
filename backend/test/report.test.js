/**
 * Test: Sales Report with Non-Zero Stats
 */
import { describe, it, expect, beforeEach } from 'vitest';

import Company from '../src/models/company.model.js';
import Product from '../src/models/product.model.js';
import PurchaseOrder from '../src/models/purchaseOrder.model.js';
import Sale from '../src/models/sale.model.js';
import Supplier from '../src/models/supplier.model.js';
import User from '../src/models/User.js';

import { buildApp, createTestToken } from './helpers/app.js';

describe('Sales Report with Non-Zero Stats', () => {
  let app;
  let testUser;
  let testCompany;
  let authToken;
  let _supplier;
  let product1;
  let product2;

  beforeEach(async () => {
    app = await buildApp();

    // Create test company and user with unique email
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
    _supplier = await Supplier.create({
      companyId: testCompany._id,
      name: 'Test Supplier',
      isDeleted: false, // Explicitly set to ensure it's not undefined
      isActive: true,
    });

    // Create products with unique SKUs (reuse timestamp and random from above)
    const productTimestamp = Date.now();
    const productRandom = Math.random().toString(36).substring(7);
    product1 = await Product.create({
      companyId: testCompany._id,
      sku: `PROD-001-${productTimestamp}-${productRandom}`,
      name: 'Product 1',
      salePrice: 100,
      purchasePrice: 60,
      stockQty: 100,
      isActive: true,
      isDeleted: false,
    });

    product2 = await Product.create({
      companyId: testCompany._id,
      sku: `PROD-002-${productTimestamp}-${productRandom}`,
      name: 'Product 2',
      salePrice: 200,
      purchasePrice: 120,
      stockQty: 50,
      isActive: true,
      isDeleted: false,
    });

    // Product.create() should save immediately
    if (!product1._id || !product2._id) {
      throw new Error('Products were not created properly - missing IDs');
    }

    // Store SKUs for fallback queries
    const _product1Sku = product1.sku;
    const _product2Sku = product2.sku;
  });

  it('should return non-zero sales stats after sales are made', async () => {
    // Query products fresh from database to ensure they exist
    // Try by ID first, then by SKU as fallback
    let finalProduct1 = await Product.findById(product1._id);
    if (!finalProduct1) {
      finalProduct1 = await Product.findOne({
        companyId: testCompany._id,
        sku: product1.sku,
      });
    }

    let finalProduct2 = await Product.findById(product2._id);
    if (!finalProduct2) {
      finalProduct2 = await Product.findOne({
        companyId: testCompany._id,
        sku: product2.sku,
      });
    }

    if (!finalProduct1 || !finalProduct2) {
      // If still not found, list all products for debugging
      const allProducts = await Product.find({
        companyId: testCompany._id,
        isDeleted: { $ne: true },
      });
      const allProductsNoFilter = await Product.find({});
      throw new Error(
        `Products not found. Expected: ${product1._id}/${product1.sku}, ${product2._id}/${product2.sku}. Found (with filter): ${JSON.stringify(allProducts.map(p => ({ id: p._id.toString(), sku: p.sku, companyId: p.companyId.toString() })))}. Found (no filter): ${JSON.stringify(allProductsNoFilter.map(p => ({ id: p._id.toString(), sku: p.sku, companyId: p.companyId ? p.companyId.toString() : 'null' })))}`
      );
    }

    // Step 1: Make some sales
    const sale1 = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        items: [
          {
            productId: finalProduct1._id.toString(),
            qty: 5,
            unitPrice: 100,
            taxRate: 19,
          },
        ],
        customerName: 'Customer 1',
      },
    });

    if (sale1.statusCode !== 201) {
      const errorBody = JSON.parse(sale1.body);
      console.error('Sale1 failed:', sale1.statusCode, errorBody);
      console.error('Used product ID:', finalProduct1._id.toString());
      // Verify product still exists
      const checkProduct = await Product.findById(finalProduct1._id);
      console.error(
        'Product exists:',
        checkProduct ? { id: checkProduct._id, sku: checkProduct.sku } : 'null'
      );
    }
    expect(sale1.statusCode).toBe(201);

    const sale2 = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        items: [
          {
            productId: finalProduct1._id.toString(),
            qty: 3,
            unitPrice: 100,
            taxRate: 19,
          },
          {
            productId: finalProduct2._id.toString(),
            qty: 2,
            unitPrice: 200,
            taxRate: 19,
          },
        ],
        customerName: 'Customer 2',
      },
    });
    expect(sale2.statusCode).toBe(201);

    const sale3 = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        items: [
          {
            productId: finalProduct2._id.toString(),
            qty: 1,
            unitPrice: 200,
            taxRate: 19,
          },
        ],
        customerName: 'Customer 3',
      },
    });
    expect(sale3.statusCode).toBe(201);

    // Step 2: Get sales report (use year to get all recent sales)
    const reportResponse = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=year',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(reportResponse.statusCode).toBe(200);
    const reportBody = JSON.parse(reportResponse.body);

    // Verify report structure
    expect(reportBody).toHaveProperty('products');
    expect(Array.isArray(reportBody.products)).toBe(true);
    expect(reportBody).toHaveProperty('totals');

    // Verify non-zero stats
    const product1Report = reportBody.products.find(
      item => item.productId === finalProduct1._id.toString()
    );
    expect(product1Report).toBeTruthy();
    expect(product1Report.totalQty).toBe(8); // 5 + 3
    expect(product1Report.totalRevenueExcl).toBeGreaterThan(0);
    expect(product1Report.totalRevenueExcl).toBe(800); // 8 * 100

    const product2Report = reportBody.products.find(
      item => item.productId === finalProduct2._id.toString()
    );
    expect(product2Report).toBeTruthy();
    expect(product2Report.totalQty).toBe(3); // 2 + 1
    expect(product2Report.totalRevenueExcl).toBeGreaterThan(0);
    expect(product2Report.totalRevenueExcl).toBe(600); // 3 * 200

    // Verify totals are non-zero
    expect(reportBody.totals.totalQty).toBeGreaterThan(0);
    expect(reportBody.totals.totalRevenueExcl).toBeGreaterThan(0);
    expect(reportBody.totals.totalQty).toBe(11); // 8 + 3
    expect(reportBody.totals.totalRevenueExcl).toBe(1400); // 800 + 600
  });

  it('should return zero stats when no sales exist', async () => {
    const reportResponse = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=year',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(reportResponse.statusCode).toBe(200);
    const reportBody = JSON.parse(reportResponse.body);

    // Products might exist in the report if they have sales, but totals should be zero
    expect(reportBody).toHaveProperty('totals');
    expect(reportBody.totals.totalQty).toBe(0);
    expect(reportBody.totals.totalRevenueExcl).toBe(0);
  });

  it('should filter by date period', async () => {
    // Verify product exists from beforeEach
    expect(product1).toBeTruthy();
    expect(product1._id).toBeTruthy();

    // Refresh product to ensure it exists in database
    let refreshedProduct1 = await Product.findById(product1._id);
    if (!refreshedProduct1) {
      refreshedProduct1 = await Product.findOne({
        companyId: testCompany._id,
        sku: product1.sku,
      });
    }
    expect(refreshedProduct1).toBeTruthy();
    expect(refreshedProduct1.isActive).toBe(true);

    // Make a sale
    const saleResponse = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        items: [
          {
            productId: refreshedProduct1._id.toString(),
            qty: 10,
            unitPrice: 100,
          },
        ],
      },
    });

    if (saleResponse.statusCode !== 201) {
      console.error(
        'Sale failed:',
        saleResponse.statusCode,
        JSON.parse(saleResponse.body)
      );
    }
    expect(saleResponse.statusCode).toBe(201);

    // Get report for year (to ensure we catch today's sales)
    const reportResponse = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=year',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(reportResponse.statusCode).toBe(200);
    const reportBody = JSON.parse(reportResponse.body);

    // Should include the sale we just made
    expect(reportBody.totals.totalQty).toBeGreaterThan(0);
  });

  it('should include correct sales calculations', async () => {
    // Refresh product to ensure it exists
    const refreshedProduct1 = await Product.findById(product1._id);
    expect(refreshedProduct1).toBeTruthy();
    expect(refreshedProduct1.isActive).toBe(true);

    // Make sales with different quantities and prices
    const sale1Response = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        items: [
          {
            productId: refreshedProduct1._id.toString(),
            qty: 10,
            unitPrice: 100, // 1000 total
          },
        ],
      },
    });
    expect(sale1Response.statusCode).toBe(201);

    const sale2Response = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        items: [
          {
            productId: refreshedProduct1._id.toString(),
            qty: 5,
            unitPrice: 110, // 550 total (different price)
          },
        ],
      },
    });
    expect(sale2Response.statusCode).toBe(201);

    // Get report (use year to get all recent sales)
    const reportResponse = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=year',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(reportResponse.statusCode).toBe(200);
    const reportBody = JSON.parse(reportResponse.body);
    const product1Report = reportBody.products.find(
      item => item.productId === refreshedProduct1._id.toString()
    );

    expect(product1Report).toBeTruthy();
    // Verify calculations
    expect(product1Report.totalQty).toBe(15); // 10 + 5
    expect(product1Report.totalRevenueExcl).toBe(1550); // 1000 + 550
  });
});

describe('Stock Alerts Report', () => {
  let app;
  let testUser;
  let testCompany;
  let authToken;
  let otherCompany;
  let otherUser;
  let _otherAuthToken;

  beforeEach(async () => {
    app = await buildApp();

    // Create test company and user
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

    // Create another company for multi-tenant testing
    otherCompany = await Company.create({
      name: 'Other Company',
      email: `other-${timestamp}-${random}@test.com`,
      country: 'TN',
    });

    otherUser = await User.create({
      email: `other-user-${timestamp}-${random}@test.com`,
      password: 'password123',
      name: 'Other User',
      companyId: otherCompany._id,
      role: 'owner',
    });

    _otherAuthToken = createTestToken(app, {
      userId: otherUser._id.toString(),
      companyId: otherCompany._id.toString(),
      role: 'owner',
    });
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/stock-alerts',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return empty array when no stock alerts exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/stock-alerts',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(0);
    expect(body.totalAlerts).toBe(0);
  });

  it('should return products below minimum stock threshold', async () => {
    // Create products with low stock
    const product1 = await Product.create({
      companyId: testCompany._id,
      sku: `LOW-STOCK-1-${Date.now()}`,
      name: 'Low Stock Product 1',
      salePrice: 100,
      stockQty: 3,
      minStock: 10,
      isActive: true,
      isDeleted: false,
    });

    const product2 = await Product.create({
      companyId: testCompany._id,
      sku: `LOW-STOCK-2-${Date.now()}`,
      name: 'Low Stock Product 2',
      salePrice: 200,
      stockQty: 5,
      minStock: 20,
      isActive: true,
      isDeleted: false,
    });

    // Product with sufficient stock (should not appear)
    await Product.create({
      companyId: testCompany._id,
      sku: `OK-STOCK-${Date.now()}`,
      name: 'OK Stock Product',
      salePrice: 150,
      stockQty: 50,
      minStock: 10,
      isActive: true,
      isDeleted: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/stock-alerts',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toHaveLength(2);
    expect(body.totalAlerts).toBe(2);

    const productIds = body.items.map(item => item.productId);
    expect(productIds).toContain(product1._id.toString());
    expect(productIds).toContain(product2._id.toString());

    // Verify structure
    const item = body.items[0];
    expect(item).toHaveProperty('productId');
    expect(item).toHaveProperty('sku');
    expect(item).toHaveProperty('name');
    expect(item).toHaveProperty('stockQty');
    expect(item).toHaveProperty('minStockQty');
    expect(item).toHaveProperty('difference');
    expect(item.difference).toBeLessThan(0);
  });

  it('should respect limit parameter', async () => {
    // Create multiple low stock products
    for (let i = 0; i < 5; i++) {
      await Product.create({
        companyId: testCompany._id,
        sku: `LIMIT-TEST-${i}-${Date.now()}`,
        name: `Limit Test Product ${i}`,
        salePrice: 100,
        stockQty: 1,
        minStock: 10,
        isActive: true,
        isDeleted: false,
      });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/stock-alerts?limit=3',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items.length).toBeLessThanOrEqual(3);
    expect(body.totalAlerts).toBe(5); // Total should still be 5
  });

  it('should filter by company (multi-tenant)', async () => {
    // Create low stock product for test company
    const product1 = await Product.create({
      companyId: testCompany._id,
      sku: `COMPANY-1-${Date.now()}`,
      name: 'Company 1 Product',
      salePrice: 100,
      stockQty: 2,
      minStock: 10,
      isActive: true,
      isDeleted: false,
    });

    // Create low stock product for other company
    await Product.create({
      companyId: otherCompany._id,
      sku: `COMPANY-2-${Date.now()}`,
      name: 'Company 2 Product',
      salePrice: 100,
      stockQty: 2,
      minStock: 10,
      isActive: true,
      isDeleted: false,
    });

    // Test company should only see its own products
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/stock-alerts',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].productId).toBe(product1._id.toString());
  });

  it('should exclude products with minStock = 0', async () => {
    // Product with minStock = 0 should not appear even if stock is low
    await Product.create({
      companyId: testCompany._id,
      sku: `NO-MIN-${Date.now()}`,
      name: 'No Min Stock Product',
      salePrice: 100,
      stockQty: 0,
      minStock: 0,
      isActive: true,
      isDeleted: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/stock-alerts',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items).toHaveLength(0);
  });
});

describe('Top Products Report', () => {
  let app;
  let testUser;
  let testCompany;
  let authToken;
  let product1;
  let product2;
  let product3;

  beforeEach(async () => {
    app = await buildApp();

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

    // Create products
    product1 = await Product.create({
      companyId: testCompany._id,
      sku: `TOP-1-${Date.now()}`,
      name: 'Top Product 1',
      salePrice: 100,
      isActive: true,
      isDeleted: false,
    });

    product2 = await Product.create({
      companyId: testCompany._id,
      sku: `TOP-2-${Date.now()}`,
      name: 'Top Product 2',
      salePrice: 200,
      isActive: true,
      isDeleted: false,
    });

    product3 = await Product.create({
      companyId: testCompany._id,
      sku: `TOP-3-${Date.now()}`,
      name: 'Top Product 3',
      salePrice: 150,
      isActive: true,
      isDeleted: false,
    });
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/top-products?period=month',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return empty array when no sales exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/top-products?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('products');
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products).toHaveLength(0);
  });

  it('should return top products sorted by quantity', async () => {
    // Create sales
    const now = new Date();
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 10,
          unitPrice: 100,
          totalExclTax: 1000,
          totalInclTax: 1190,
        },
        {
          productId: product2._id,
          qty: 5,
          unitPrice: 200,
          totalExclTax: 1000,
          totalInclTax: 1190,
        },
      ],
      totalExclTax: 2000,
      totalTax: 380,
      totalInclTax: 2380,
    });

    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
        {
          productId: product3._id,
          qty: 8,
          unitPrice: 150,
          totalExclTax: 1200,
          totalInclTax: 1428,
        },
      ],
      totalExclTax: 1700,
      totalTax: 323,
      totalInclTax: 2023,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/top-products?period=month&sortBy=qty&limit=10',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.products.length).toBeGreaterThan(0);

    // Product1 should be first (15 total qty)
    const product1Data = body.products.find(
      p => p.productId === product1._id.toString()
    );
    expect(product1Data).toBeTruthy();
    expect(product1Data.totalQty).toBe(15);

    // Product3 should be second (8 total qty)
    const product3Data = body.products.find(
      p => p.productId === product3._id.toString()
    );
    expect(product3Data).toBeTruthy();
    expect(product3Data.totalQty).toBe(8);
  });

  it('should respect limit parameter', async () => {
    // Create sales for multiple products
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      await Sale.create({
        companyId: testCompany._id,
        createdBy: testUser._id,
        saleDate: now,
        items: [
          {
            productId: product1._id,
            qty: 1,
            unitPrice: 100,
            totalExclTax: 100,
            totalInclTax: 119,
          },
        ],
        totalExclTax: 100,
        totalTax: 19,
        totalInclTax: 119,
      });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/top-products?period=month&limit=2',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.products.length).toBeLessThanOrEqual(2);
  });

  it('should validate period parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/top-products?period=invalid',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Invalid period');
  });
});

describe('Sales Summary Report', () => {
  let app;
  let testUser;
  let testCompany;
  let authToken;
  let product1;
  let product2;

  beforeEach(async () => {
    app = await buildApp();

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

    product1 = await Product.create({
      companyId: testCompany._id,
      sku: `SUMMARY-1-${Date.now()}`,
      name: 'Summary Product 1',
      salePrice: 100,
      isActive: true,
      isDeleted: false,
    });

    product2 = await Product.create({
      companyId: testCompany._id,
      sku: `SUMMARY-2-${Date.now()}`,
      name: 'Summary Product 2',
      salePrice: 200,
      isActive: true,
      isDeleted: false,
    });
  });

  it('should require authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=month',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return zero stats when no sales exist', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('summary');
    expect(body.summary.totalSales).toBe(0);
    expect(body.summary.totalRevenueExcl).toBe(0);
    expect(body.summary.totalRevenueIncl).toBe(0);
    expect(body.summary.totalItems).toBe(0);
  });

  it('should return correct sales summary', async () => {
    const now = new Date();

    // Create sales
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      paymentMethod: 'CASH',
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
        {
          productId: product2._id,
          qty: 2,
          unitPrice: 200,
          totalExclTax: 400,
          totalInclTax: 476,
        },
      ],
      totalExclTax: 900,
      totalTax: 171,
      totalInclTax: 1071,
    });

    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      paymentMethod: 'CHECK',
      items: [
        {
          productId: product1._id,
          qty: 3,
          unitPrice: 100,
          totalExclTax: 300,
          totalInclTax: 357,
        },
      ],
      totalExclTax: 300,
      totalTax: 57,
      totalInclTax: 357,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.summary.totalSales).toBe(2);
    expect(body.summary.totalOrders).toBe(2); // Alias should match
    expect(body.summary.totalRevenueExcl).toBe(1200);
    expect(body.summary.totalRevenueIncl).toBe(1428);
    // totalItems should be sum of quantities, not count of items
    // Sale 1: 5 + 2 = 7 quantities
    // Sale 2: 3 quantities
    // Total: 10 quantities
    expect(body.summary.totalItems).toBe(10);
    expect(body.summary.totalQty).toBe(10); // Alias should match
    expect(body.summary.averageSaleValue).toBeGreaterThan(0);

    // Check payment methods
    expect(body).toHaveProperty('paymentMethods');
    expect(Array.isArray(body.paymentMethods)).toBe(true);
    const cashMethod = body.paymentMethods.find(pm => pm.method === 'CASH');
    expect(cashMethod).toBeTruthy();
    expect(cashMethod.count).toBe(1);
  });

  it('should correctly calculate totalItems as sum of quantities (not count of items)', async () => {
    const now = new Date();

    // Create a sale with multiple items and different quantities
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
        {
          productId: product2._id,
          qty: 3,
          unitPrice: 200,
          totalExclTax: 600,
          totalInclTax: 714,
        },
        {
          productId: product1._id,
          qty: 2,
          unitPrice: 100,
          totalExclTax: 200,
          totalInclTax: 238,
        },
      ],
      totalExclTax: 1300,
      totalTax: 247,
      totalInclTax: 1547,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // totalSales should be 1 (one sale transaction)
    expect(body.summary.totalSales).toBe(1);
    // totalItems should be sum of quantities: 5 + 3 + 2 = 10
    // NOT the count of items (which would be 3)
    expect(body.summary.totalItems).toBe(10);
    expect(body.summary.totalQty).toBe(10);
  });

  it('should filter by date range', async () => {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Sale in current month
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
      ],
      totalExclTax: 500,
      totalTax: 95,
      totalInclTax: 595,
    });

    // Sale in last month (should not be included)
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: lastMonth,
      items: [
        {
          productId: product1._id,
          qty: 10,
          unitPrice: 100,
          totalExclTax: 1000,
          totalInclTax: 1190,
        },
      ],
      totalExclTax: 1000,
      totalTax: 190,
      totalInclTax: 1190,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    // Should only include current month sale
    expect(body.summary.totalSales).toBe(1);
    expect(body.summary.totalRevenueExcl).toBe(500);
  });

  it('should validate period parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=invalid',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Invalid period');
  });

  it('should require from and to for custom range', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=range',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should include previous period comparison data', async () => {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Create sales in current month
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
        {
          productId: product2._id,
          qty: 2,
          unitPrice: 200,
          totalExclTax: 400,
          totalInclTax: 476,
        },
      ],
      totalExclTax: 900,
      totalTax: 171,
      totalInclTax: 1071,
    });

    // Create sales in previous month
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: lastMonth,
      items: [
        {
          productId: product1._id,
          qty: 3,
          unitPrice: 100,
          totalExclTax: 300,
          totalInclTax: 357,
        },
      ],
      totalExclTax: 300,
      totalTax: 57,
      totalInclTax: 357,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Current period should have 1 sale
    expect(body.summary.totalSales).toBe(1);
    expect(body.summary.totalRevenueIncl).toBe(1071);
    expect(body.summary.totalItems).toBe(7); // 5 + 2 quantities

    // Previous period should be included
    expect(body).toHaveProperty('previousPeriod');
    expect(body.previousPeriod).toHaveProperty('summary');
    expect(body.previousPeriod.summary.totalSales).toBe(1);
    expect(body.previousPeriod.summary.totalRevenueIncl).toBe(357);
    expect(body.previousPeriod.summary.totalItems).toBe(3); // 3 quantities

    // Previous period should have date range
    expect(body.previousPeriod).toHaveProperty('from');
    expect(body.previousPeriod).toHaveProperty('to');
  });

  it('should calculate previous period date range correctly', async () => {
    const now = new Date();

    // Create a sale in current month
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 10,
          unitPrice: 100,
          totalExclTax: 1000,
          totalInclTax: 1190,
        },
      ],
      totalExclTax: 1000,
      totalTax: 190,
      totalInclTax: 1190,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Should have current period dates
    expect(body).toHaveProperty('from');
    expect(body).toHaveProperty('to');

    // Should have previous period with dates
    expect(body.previousPeriod).toHaveProperty('from');
    expect(body.previousPeriod).toHaveProperty('to');

    // Previous period dates should be before current period
    const currentFrom = new Date(body.from);
    const previousTo = new Date(body.previousPeriod.to);
    expect(previousTo.getTime()).toBeLessThan(currentFrom.getTime());
  });

  it('should handle custom date range with previous period', async () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(1); // First day of current month
    const endDate = new Date(now);
    endDate.setDate(15); // 15th day of current month

    // Create sales in the custom range
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days after start
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
      ],
      totalExclTax: 500,
      totalTax: 95,
      totalInclTax: 595,
    });

    const fromStr = startDate.toISOString().split('T')[0];
    const toStr = endDate.toISOString().split('T')[0];

    const response = await app.inject({
      method: 'GET',
      url: `/api/reports/sales-summary?period=range&from=${fromStr}&to=${toStr}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Should have current period data
    expect(body.summary.totalSales).toBe(1);

    // Should have previous period (same duration, before the current range)
    expect(body).toHaveProperty('previousPeriod');
    expect(body.previousPeriod).toHaveProperty('summary');

    // Previous period date range should be before current period
    const currentFrom = new Date(body.from);
    const previousTo = new Date(body.previousPeriod.to);
    expect(previousTo.getTime()).toBeLessThan(currentFrom.getTime());
  });

  it('should show different values for totalSales and totalItems', async () => {
    const now = new Date();

    // Create 2 sales with multiple items and quantities
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
        {
          productId: product2._id,
          qty: 3,
          unitPrice: 200,
          totalExclTax: 600,
          totalInclTax: 714,
        },
      ],
      totalExclTax: 1100,
      totalTax: 209,
      totalInclTax: 1309,
    });

    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 10,
          unitPrice: 100,
          totalExclTax: 1000,
          totalInclTax: 1190,
        },
      ],
      totalExclTax: 1000,
      totalTax: 190,
      totalInclTax: 1190,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-summary?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // totalSales = 2 (number of sale transactions)
    expect(body.summary.totalSales).toBe(2);
    // totalItems = 5 + 3 + 10 = 18 (sum of all quantities)
    expect(body.summary.totalItems).toBe(18);

    // They should be different
    expect(body.summary.totalSales).not.toBe(body.summary.totalItems);
  });
});

describe('Sales Products Report - Period Average Purchase Price', () => {
  let app;
  let testUser;
  let testCompany;
  let authToken;
  let supplier;
  let product1;
  let product2;
  let product3;

  beforeEach(async () => {
    app = await buildApp();

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

    supplier = await Supplier.create({
      companyId: testCompany._id,
      name: 'Test Supplier',
      isDeleted: false,
      isActive: true,
    });

    const productTimestamp = Date.now();
    const productRandom = Math.random().toString(36).substring(7);

    // Product 1: Will have purchases in period and lastPurchasePrice
    product1 = await Product.create({
      companyId: testCompany._id,
      sku: `PERIOD-AVG-1-${productTimestamp}-${productRandom}`,
      name: 'Product with Period Purchases',
      salePrice: 100,
      purchasePrice: 50,
      lastPurchasePrice: 55,
      stockQty: 100,
      isActive: true,
      isDeleted: false,
    });

    // Product 2: Will have no purchases in period, but has lastPurchasePrice
    product2 = await Product.create({
      companyId: testCompany._id,
      sku: `PERIOD-AVG-2-${productTimestamp}-${productRandom}`,
      name: 'Product with Last Price Only',
      salePrice: 200,
      purchasePrice: 120,
      lastPurchasePrice: 130,
      stockQty: 50,
      isActive: true,
      isDeleted: false,
    });

    // Product 3: Will have no purchases in period and no lastPurchasePrice
    product3 = await Product.create({
      companyId: testCompany._id,
      sku: `PERIOD-AVG-3-${productTimestamp}-${productRandom}`,
      name: 'Product with Fallback Price',
      salePrice: 150,
      purchasePrice: 80,
      lastPurchasePrice: 0,
      stockQty: 30,
      isActive: true,
      isDeleted: false,
    });
  });

  it('should use lastPurchasePrice when no purchases exist in period', async () => {
    const now = new Date();

    // Create sales for product2 (no purchases in period)
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product2._id,
          qty: 3,
          unitPrice: 200,
          totalExclTax: 600,
          totalInclTax: 714,
        },
      ],
      totalExclTax: 600,
      totalTax: 114,
      totalInclTax: 714,
    });

    // Get report
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    const product2Report = body.products.find(
      p => p.productId === product2._id.toString()
    );

    expect(product2Report).toBeTruthy();

    // Should use lastPurchasePrice (130) since no purchases in period
    expect(product2Report.periodAvgPurchasePrice).toBe(130);
    expect(product2Report.periodAvgSource).toBe('last');

    // Period cost should be: 130 * 3 = 390
    expect(product2Report.periodCostTotal).toBe(390);

    // Period margin should be: 600 - 390 = 210
    expect(product2Report.periodMargin).toBe(210);

    // Period margin rate should be: (210 / 390) * 100 = 53.85%
    expect(product2Report.periodMarginRate).toBeCloseTo(53.85, 1);
  });

  it('should fallback to purchasePrice when no lastPurchasePrice and no period purchases', async () => {
    const now = new Date();

    // Create sales for product3 (no purchases in period, no lastPurchasePrice)
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product3._id,
          qty: 2,
          unitPrice: 150,
          totalExclTax: 300,
          totalInclTax: 357,
        },
      ],
      totalExclTax: 300,
      totalTax: 57,
      totalInclTax: 357,
    });

    // Get report
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    const product3Report = body.products.find(
      p => p.productId === product3._id.toString()
    );

    expect(product3Report).toBeTruthy();

    // Should use purchasePrice (80) as fallback
    expect(product3Report.periodAvgPurchasePrice).toBe(80);
    expect(product3Report.periodAvgSource).toBe('fallback');

    // Period cost should be: 80 * 2 = 160
    expect(product3Report.periodCostTotal).toBe(160);

    // Period margin should be: 300 - 160 = 140
    expect(product3Report.periodMargin).toBe(140);

    // Period margin rate should be: (140 / 160) * 100 = 87.5%
    expect(product3Report.periodMarginRate).toBeCloseTo(87.5, 1);
  });

  it('should calculate period average correctly with weighted purchases', async () => {
    const now = new Date();

    // Create multiple purchase orders with different prices
    await PurchaseOrder.create({
      companyId: testCompany._id,
      supplierId: supplier._id,
      orderNumber: `PO-${Date.now()}-1`,
      status: 'RECEIVED',
      orderDate: now,
      receivedAt: now,
      items: [
        {
          productId: product1._id,
          quantity: 20,
          receivedQuantity: 20,
          unitPrice: 50,
          taxRate: 19,
          subtotal: 1000,
        },
      ],
      totalAmount: 1000,
      createdBy: testUser._id,
      receivedBy: testUser._id,
    });

    await PurchaseOrder.create({
      companyId: testCompany._id,
      supplierId: supplier._id,
      orderNumber: `PO-${Date.now()}-2`,
      status: 'RECEIVED',
      orderDate: now,
      receivedAt: now,
      items: [
        {
          productId: product1._id,
          quantity: 10,
          receivedQuantity: 10,
          unitPrice: 70,
          taxRate: 19,
          subtotal: 700,
        },
      ],
      totalAmount: 700,
      createdBy: testUser._id,
      receivedBy: testUser._id,
    });

    // Create sales
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 10,
          unitPrice: 100,
          totalExclTax: 1000,
          totalInclTax: 1190,
        },
      ],
      totalExclTax: 1000,
      totalTax: 190,
      totalInclTax: 1190,
    });

    // Get report
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    const product1Report = body.products.find(
      p => p.productId === product1._id.toString()
    );

    expect(product1Report).toBeTruthy();

    // Weighted average: (20*50 + 10*70) / (20+10) = (1000 + 700) / 30 = 56.67
    const expectedPeriodAvg = (20 * 50 + 10 * 70) / 30;

    // Should average with lastPurchasePrice (55): (56.67 + 55) / 2 = 55.83
    const expectedAvg = (expectedPeriodAvg + 55) / 2;
    expect(product1Report.periodAvgPurchasePrice).toBeCloseTo(expectedAvg, 2);
    expect(product1Report.periodAvgSource).toBe('period+last');
  });

  it('should use period average only when lastPurchasePrice is zero', async () => {
    const now = new Date();

    // Update product1 to have lastPurchasePrice = 0
    await Product.findByIdAndUpdate(product1._id, { lastPurchasePrice: 0 });

    // Create purchase order
    await PurchaseOrder.create({
      companyId: testCompany._id,
      supplierId: supplier._id,
      orderNumber: `PO-${Date.now()}-1`,
      status: 'RECEIVED',
      orderDate: now,
      receivedAt: now,
      items: [
        {
          productId: product1._id,
          quantity: 10,
          receivedQuantity: 10,
          unitPrice: 60,
          taxRate: 19,
          subtotal: 600,
        },
      ],
      totalAmount: 600,
      createdBy: testUser._id,
      receivedBy: testUser._id,
    });

    // Create sales
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
      ],
      totalExclTax: 500,
      totalTax: 95,
      totalInclTax: 595,
    });

    // Get report
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    const product1Report = body.products.find(
      p => p.productId === product1._id.toString()
    );

    expect(product1Report).toBeTruthy();

    // Should use period average only (60) since lastPurchasePrice is 0
    expect(product1Report.periodAvgPurchasePrice).toBe(60);
    expect(product1Report.periodAvgSource).toBe('period');
  });

  it('should filter purchases by date range correctly', async () => {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Create purchase order in last month (should not be included)
    await PurchaseOrder.create({
      companyId: testCompany._id,
      supplierId: supplier._id,
      orderNumber: `PO-${Date.now()}-1`,
      status: 'RECEIVED',
      orderDate: lastMonth,
      receivedAt: lastMonth,
      items: [
        {
          productId: product1._id,
          quantity: 10,
          receivedQuantity: 10,
          unitPrice: 50,
          taxRate: 19,
          subtotal: 500,
        },
      ],
      totalAmount: 500,
      createdBy: testUser._id,
      receivedBy: testUser._id,
    });

    // Create purchase order in current month (should be included)
    await PurchaseOrder.create({
      companyId: testCompany._id,
      supplierId: supplier._id,
      orderNumber: `PO-${Date.now()}-2`,
      status: 'RECEIVED',
      orderDate: now,
      receivedAt: now,
      items: [
        {
          productId: product1._id,
          quantity: 10,
          receivedQuantity: 10,
          unitPrice: 70,
          taxRate: 19,
          subtotal: 700,
        },
      ],
      totalAmount: 700,
      createdBy: testUser._id,
      receivedBy: testUser._id,
    });

    // Create sales in current month
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
      ],
      totalExclTax: 500,
      totalTax: 95,
      totalInclTax: 595,
    });

    // Get report for current month
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    const product1Report = body.products.find(
      p => p.productId === product1._id.toString()
    );

    expect(product1Report).toBeTruthy();

    // Should only use purchase from current month (70), averaged with lastPurchasePrice (55)
    // (70 + 55) / 2 = 62.5
    const expectedAvg = (70 + 55) / 2;
    expect(product1Report.periodAvgPurchasePrice).toBeCloseTo(expectedAvg, 2);
    expect(product1Report.periodAvgSource).toBe('period+last');
  });

  it('should only include RECEIVED purchase orders', async () => {
    const now = new Date();

    // Create purchase order with PENDING status (should not be included)
    await PurchaseOrder.create({
      companyId: testCompany._id,
      supplierId: supplier._id,
      orderNumber: `PO-${Date.now()}-1`,
      status: 'PENDING',
      orderDate: now,
      items: [
        {
          productId: product1._id,
          quantity: 10,
          receivedQuantity: 0,
          unitPrice: 60,
          taxRate: 19,
          subtotal: 600,
        },
      ],
      totalAmount: 600,
      createdBy: testUser._id,
    });

    // Create purchase order with RECEIVED status (should be included)
    await PurchaseOrder.create({
      companyId: testCompany._id,
      supplierId: supplier._id,
      orderNumber: `PO-${Date.now()}-2`,
      status: 'RECEIVED',
      orderDate: now,
      receivedAt: now,
      items: [
        {
          productId: product1._id,
          quantity: 10,
          receivedQuantity: 10,
          unitPrice: 70,
          taxRate: 19,
          subtotal: 700,
        },
      ],
      totalAmount: 700,
      createdBy: testUser._id,
      receivedBy: testUser._id,
    });

    // Create sales
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
      ],
      totalExclTax: 500,
      totalTax: 95,
      totalInclTax: 595,
    });

    // Get report
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    const product1Report = body.products.find(
      p => p.productId === product1._id.toString()
    );

    expect(product1Report).toBeTruthy();

    // Should only use RECEIVED purchase (70), averaged with lastPurchasePrice (55)
    const expectedAvg = (70 + 55) / 2;
    expect(product1Report.periodAvgPurchasePrice).toBeCloseTo(expectedAvg, 2);
    expect(product1Report.periodAvgSource).toBe('period+last');
  });

  it('should include all new period-average fields in response', async () => {
    const now = new Date();

    // Create purchase order
    await PurchaseOrder.create({
      companyId: testCompany._id,
      supplierId: supplier._id,
      orderNumber: `PO-${Date.now()}-1`,
      status: 'RECEIVED',
      orderDate: now,
      receivedAt: now,
      items: [
        {
          productId: product1._id,
          quantity: 10,
          receivedQuantity: 10,
          unitPrice: 60,
          taxRate: 19,
          subtotal: 600,
        },
      ],
      totalAmount: 600,
      createdBy: testUser._id,
      receivedBy: testUser._id,
    });

    // Create sales
    await Sale.create({
      companyId: testCompany._id,
      createdBy: testUser._id,
      saleDate: now,
      items: [
        {
          productId: product1._id,
          qty: 5,
          unitPrice: 100,
          totalExclTax: 500,
          totalInclTax: 595,
        },
      ],
      totalExclTax: 500,
      totalTax: 95,
      totalInclTax: 595,
    });

    // Get report
    const response = await app.inject({
      method: 'GET',
      url: '/api/reports/sales-products?period=month',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    const product1Report = body.products.find(
      p => p.productId === product1._id.toString()
    );

    expect(product1Report).toBeTruthy();

    // Verify all new fields exist
    expect(product1Report).toHaveProperty('periodAvgPurchasePrice');
    expect(product1Report).toHaveProperty('periodAvgSource');
    expect(product1Report).toHaveProperty('periodCostTotal');
    expect(product1Report).toHaveProperty('periodMargin');
    expect(product1Report).toHaveProperty('periodMarginRate');

    // Verify field types
    expect(typeof product1Report.periodAvgPurchasePrice).toBe('number');
    expect(typeof product1Report.periodAvgSource).toBe('string');
    expect(typeof product1Report.periodCostTotal).toBe('number');
    expect(typeof product1Report.periodMargin).toBe('number');
    expect(typeof product1Report.periodMarginRate).toBe('number');
  });
});
