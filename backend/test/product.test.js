/**
 * Test: Product Creation
 */
import { describe, it, expect, beforeEach } from 'vitest';

import Company from '../src/models/company.model.js';
import Product from '../src/models/product.model.js';
import User from '../src/models/User.js';

import { buildApp, createTestToken } from './helpers/app.js';

describe('Product Creation', () => {
  let app;
  let testUser;
  let testCompany;
  let authToken;

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
  });

  it('should create a new product', async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const productData = {
      sku: `TEST-SKU-${timestamp}-${random}`,
      name: 'Test Product',
      description: 'A test product',
      brand: 'Test Brand',
      category: 'Freinage',
      salePrice: 100.0,
      purchasePrice: 60.0,
      taxRate: 19,
      minStock: 5,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: productData,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);

    expect(body).toHaveProperty('product');
    expect(body.product.sku).toBe(productData.sku);
    expect(body.product.name).toBe(productData.name);
    // When purchasePrice is provided, salePrice is automatically recalculated using HYBRID mode
    // So we check that it's calculated, not the original value
    expect(body.product.salePrice).toBeGreaterThan(0);
    expect(body.product.companyId.toString()).toBe(testCompany._id.toString());
    // StockQty defaults to 0 when product is created
    expect(body.product.stockQty).toBe(0);

    // Verify database
    const product = await Product.findOne({ sku: productData.sku });
    expect(product).toBeTruthy();
    expect(product.name).toBe(productData.name);
  });

  it('should create product with HYBRID pricing defaults', async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const productData = {
      sku: `TEST-HYBRID-${timestamp}-${random}`,
      name: 'HYBRID Product',
      salePrice: 100.0,
      purchasePrice: 60.0,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: productData,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);

    // Verify default values
    expect(body.product.pricingMode).toBe('HYBRID');
    expect(body.product.marginRate).toBe(20); // Default
    expect(body.product.minMarginOnLastPurchase).toBe(10); // Default
    expect(body.product.taxRate).toBe(19); // Default
    expect(body.product.lastPurchasePrice).toBe(60.0); // Set from purchasePrice
  });

  it('should calculate salePrice automatically when purchasePrice is provided', async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const productData = {
      sku: `TEST-AUTO-PRICE-${timestamp}-${random}`,
      name: 'Auto Price Product',
      purchasePrice: 100.0,
      marginRate: 20,
      minMarginOnLastPurchase: 10,
      taxRate: 19,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: productData,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);

    // Sale price should be calculated automatically using HYBRID mode
    // priceTarget = 100 * 1.20 = 120
    // priceMinSafe = 100 * 1.10 = 110
    // priceHT = max(120, 110) = 120
    // priceTTC = 120 * 1.19 = 142.80
    expect(body.product.salePrice).toBeCloseTo(142.8, 2);
    expect(body.product.lastPurchasePrice).toBe(100.0);
  });

  it('should update product with new pricing fields', async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);

    // Create product
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        sku: `TEST-UPDATE-${timestamp}-${random}`,
        name: 'Update Test Product',
        salePrice: 100.0,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const createBody = JSON.parse(createResponse.body);
    const productId = createBody.product._id.toString();

    // Update product with purchasePrice to trigger auto-calculation
    const updateResponse = await app.inject({
      method: 'PUT',
      url: `/api/products/${productId}`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        purchasePrice: 80.0,
        marginRate: 25,
        taxRate: 19,
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    const updateBody = JSON.parse(updateResponse.body);

    // Sale price should be recalculated
    // priceTarget = 80 * 1.25 = 100
    // priceMinSafe = 80 * 1.10 = 88
    // priceHT = max(100, 88) = 100
    // priceTTC = 100 * 1.19 = 119.00
    expect(updateBody.product.salePrice).toBeCloseTo(119.0, 2);
    expect(updateBody.product.purchasePrice).toBe(80.0);
    expect(updateBody.product.lastPurchasePrice).toBe(80.0);
    expect(updateBody.product.marginRate).toBe(25);
  });

  it('should reject duplicate SKU for same company', async () => {
    const productData = {
      sku: 'DUPLICATE-SKU',
      name: 'First Product',
      salePrice: 100.0,
    };

    // First product should succeed
    const response1 = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: productData,
    });
    expect(response1.statusCode).toBe(201);

    // Second product with same SKU should fail
    const response2 = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        ...productData,
        name: 'Second Product',
      },
    });
    expect(response2.statusCode).toBe(409);
    const body = JSON.parse(response2.body);
    expect(body.error).toContain('SKU');
  });

  it('should require mandatory fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        name: 'Missing SKU and Sale Price',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('required');
  });

  it('should allow different companies to have same SKU', async () => {
    // Create second company
    const company2 = await Company.create({
      name: 'Second Company',
      email: `company2-${Date.now()}@test.com`,
    });

    const user2 = await User.create({
      email: `user2-${Date.now()}@test.com`,
      password: 'password123',
      companyId: company2._id,
      role: 'owner',
    });

    const token2 = createTestToken(app, {
      userId: user2._id.toString(),
      companyId: company2._id.toString(),
      role: 'owner',
    });

    const productData = {
      sku: 'SHARED-SKU',
      name: 'Product',
      salePrice: 100.0,
    };

    // Create product for first company
    const response1 = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: productData,
    });
    expect(response1.statusCode).toBe(201);

    // Create product with same SKU for second company should succeed
    const response2 = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: {
        authorization: `Bearer ${token2}`,
      },
      payload: productData,
    });
    expect(response2.statusCode).toBe(201);
  });
});
