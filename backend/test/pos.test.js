/**
 * Test: POS Sale (Stock OUT)
 */
import { describe, it, expect, beforeEach } from 'vitest';

import Company from '../src/models/company.model.js';
import Product from '../src/models/product.model.js';
import Sale from '../src/models/sale.model.js';
import StockMovement from '../src/models/stockMovement.model.js';
import User from '../src/models/User.js';

import { buildApp, createTestToken } from './helpers/app.js';

describe('POS Sale (Stock OUT)', () => {
  let app;
  let testUser;
  let testCompany;
  let authToken;
  let product1;
  let product2;

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

    // Create products with stock (reuse timestamp and random from above)
    const productTimestamp = Date.now();
    const productRandom = Math.random().toString(36).substring(7);
    product1 = await Product.create({
      companyId: testCompany._id,
      sku: `PROD-001-${productTimestamp}-${productRandom}`,
      name: 'Product 1',
      salePrice: 100,
      purchasePrice: 60,
      stockQty: 50, // Initial stock
      isActive: true,
      isDeleted: false,
    });

    product2 = await Product.create({
      companyId: testCompany._id,
      sku: `PROD-002-${productTimestamp}-${productRandom}`,
      name: 'Product 2',
      salePrice: 200,
      purchasePrice: 120,
      stockQty: 30, // Initial stock
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

  it('should create a sale and decrease stock', async () => {
    // Query products fresh from database to ensure they exist
    let refreshedProduct1 = await Product.findById(product1._id);
    if (!refreshedProduct1) {
      refreshedProduct1 = await Product.findOne({
        companyId: testCompany._id,
        sku: product1.sku,
      });
    }

    let refreshedProduct2 = await Product.findById(product2._id);
    if (!refreshedProduct2) {
      refreshedProduct2 = await Product.findOne({
        companyId: testCompany._id,
        sku: product2.sku,
      });
    }

    if (!refreshedProduct1 || !refreshedProduct2) {
      const allProducts = await Product.find({ companyId: testCompany._id });
      throw new Error(
        `Products not found. Expected: ${product1._id}/${product1.sku}, ${product2._id}/${product2.sku}. Found: ${JSON.stringify(allProducts.map(p => ({ id: p._id, sku: p.sku })))}`
      );
    }

    const saleData = {
      items: [
        {
          productId: refreshedProduct1._id.toString(),
          qty: 10,
          unitPrice: 100,
          taxRate: 19,
        },
        {
          productId: refreshedProduct2._id.toString(),
          qty: 5,
          unitPrice: 200,
          taxRate: 19,
        },
      ],
      customerName: 'John Doe',
      paymentMethod: 'CASH',
      reference: 'SALE-001',
    };

    // Verify initial stock
    expect(refreshedProduct1.stockQty).toBe(50);
    expect(refreshedProduct2.stockQty).toBe(30);

    const response = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: saleData,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);

    // Check sale response
    expect(body).toHaveProperty('sale');
    expect(body.sale.items).toHaveLength(2);
    expect(body.sale.customerName).toBe('John Doe');
    expect(body.sale.paymentMethod).toBe('CASH');
    expect(body.sale.totalInclTax).toBeGreaterThan(0);

    // Verify stock decreased
    const product1After = await Product.findById(refreshedProduct1._id);
    const product2After = await Product.findById(refreshedProduct2._id);
    expect(product1After).toBeTruthy();
    expect(product2After).toBeTruthy();
    expect(product1After.stockQty).toBe(40); // 50 - 10
    expect(product2After.stockQty).toBe(25); // 30 - 5

    // Verify sale record
    const sale = await Sale.findById(body.sale._id);
    expect(sale).toBeTruthy();
    expect(sale.items.length).toBe(2);
    expect(sale.totalExclTax).toBeGreaterThan(0);

    // Verify stock movements created
    const movements = await StockMovement.find({
      type: 'OUT',
      source: 'sale',
    });
    expect(movements.length).toBe(2);

    const movement1 = movements.find(
      m => m.productId.toString() === refreshedProduct1._id.toString()
    );
    expect(movement1.quantity).toBe(10);
    expect(movement1.beforeQty).toBe(50);
    expect(movement1.afterQty).toBe(40);

    const movement2 = movements.find(
      m => m.productId.toString() === refreshedProduct2._id.toString()
    );
    expect(movement2.quantity).toBe(5);
    expect(movement2.beforeQty).toBe(30);
    expect(movement2.afterQty).toBe(25);
  });

  it('should prevent sale when stock is insufficient', async () => {
    const saleData = {
      items: [
        {
          productId: product1._id.toString(),
          qty: 100, // More than available (50)
          unitPrice: 100,
        },
      ],
      customerName: 'John Doe',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: saleData,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.toLowerCase()).toContain('insufficient stock');
  });

  it('should calculate total correctly with tax', async () => {
    const saleData = {
      items: [
        {
          productId: product1._id.toString(),
          qty: 2,
          unitPrice: 100, // 200 excl tax
          taxRate: 19, // 38 tax, 238 incl tax
        },
      ],
      customerName: 'Test Customer',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: saleData,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);

    expect(body.sale.totalExclTax).toBe(200);
    expect(body.sale.totalTax).toBe(38); // 200 * 0.19
    expect(body.sale.totalInclTax).toBe(238); // 200 + 38
  });

  it('should handle sale without customer name', async () => {
    // Refresh product to ensure it exists
    const refreshedProduct1 = await Product.findById(product1._id);
    expect(refreshedProduct1).toBeTruthy();

    const saleData = {
      items: [
        {
          productId: refreshedProduct1._id.toString(),
          qty: 1,
          unitPrice: 100,
        },
      ],
      // No customerName
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: saleData,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.sale).toBeTruthy();
  });

  it('should create multiple sales and track stock correctly', async () => {
    // First sale
    const sale1 = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        items: [
          {
            productId: product1._id.toString(),
            qty: 5,
            unitPrice: 100,
          },
        ],
      },
    });
    expect(sale1.statusCode).toBe(201);

    // Second sale
    const sale2 = await app.inject({
      method: 'POST',
      url: '/api/pos/sales',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        items: [
          {
            productId: product1._id.toString(),
            qty: 10,
            unitPrice: 100,
          },
        ],
      },
    });
    expect(sale2.statusCode).toBe(201);

    // Verify final stock: 50 - 5 - 10 = 35
    const updatedProduct = await Product.findById(product1._id);
    expect(updatedProduct.stockQty).toBe(35);

    // Verify two sales created
    const sales = await Sale.find({ companyId: testCompany._id });
    expect(sales.length).toBe(2);
  });
});
