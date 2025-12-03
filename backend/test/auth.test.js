/**
 * Test: Auth + Company/Owner Signup
 */
import { describe, it, expect, beforeEach } from 'vitest';

import Company from '../src/models/company.model.js';
import User from '../src/models/User.js';

import { buildApp } from './helpers/app.js';

describe('Auth + Company/Owner Signup', () => {
  let app;

  beforeEach(async () => {
    app = await buildApp();
  });

  it('should register a new company with owner', async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const companyData = {
      companyName: 'Test Auto Parts',
      companyEmail: `test-${timestamp}-${random}@autoparts.com`,
      companyPhone: '+1234567890',
      companyCountry: 'TN',
      ownerEmail: `owner-${timestamp}-${random}@test.com`,
      ownerPassword: 'password123',
      ownerName: 'John Owner',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register-company',
      payload: companyData,
    });

    // Check status code first
    if (response.statusCode !== 201) {
      console.log('Register error body:', JSON.parse(response.body));
    }
    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);

    // Check response structure
    expect(body).toHaveProperty('user');
    expect(body).toHaveProperty('company');

    // Check user data
    expect(body.user.email).toBe(companyData.ownerEmail);
    expect(body.user.name).toBe(companyData.ownerName);
    expect(body.user.role).toBe('owner');
    expect(body.user).toHaveProperty('companyId');

    // Check company data
    expect(body.company.name).toBe(companyData.companyName);
    expect(body.company.email).toBe(companyData.companyEmail);
    expect(body.company.phone).toBe(companyData.companyPhone);
    expect(body.company.country).toBe(companyData.companyCountry);
    expect(body.company.subscriptionPlan).toBe('basic');
    expect(body.company.isActive).toBe(true);

    // Verify cookies are set
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('accessToken'))).toBe(true);
    expect(cookies.some(c => c.includes('refreshToken'))).toBe(true);

    // Verify database records - query fresh from DB
    // Use the company ID from response instead of email lookup to avoid timing issues
    const companyId = body.company.id || body.company._id;
    let company = await Company.findById(companyId);
    if (!company) {
      // Fallback: try email lookup
      company = await Company.findOne({ email: companyData.companyEmail });
    }
    if (!company) {
      // If still not found, list all companies for debugging
      const allCompanies = await Company.find({});
      console.log(
        'All companies in DB:',
        allCompanies.map(c => ({ id: c._id, email: c.email }))
      );
    }
    expect(company).toBeTruthy();
    expect(company.name).toBe(companyData.companyName);

    // Use user ID from response
    const userId = body.user.id || body.user._id;
    let user = await User.findById(userId);
    if (!user) {
      // Fallback: try email lookup
      user = await User.findOne({ email: companyData.ownerEmail });
    }
    if (!user) {
      // If not found, list all users for debugging
      const allUsers = await User.find({});
      console.log(
        'All users in DB:',
        allUsers.map(u => ({ id: u._id, email: u.email, role: u.role }))
      );
    }
    expect(user).toBeTruthy();
    expect(user.role).toBe('owner');
    expect(user.companyId).toBeTruthy();
    expect(user.companyId.toString()).toBe(company._id.toString());
  });

  it('should reject duplicate company email', async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const companyEmail = `duplicate-${timestamp}-${random}@test.com`;

    // First registration should succeed
    const response1 = await app.inject({
      method: 'POST',
      url: '/api/auth/register-company',
      payload: {
        companyName: 'Test Auto Parts',
        companyEmail: companyEmail,
        ownerEmail: `owner1-${timestamp}-${random}@test.com`,
        ownerPassword: 'password123',
      },
    });

    if (response1.statusCode !== 201) {
      console.log('First registration error:', JSON.parse(response1.body));
    }
    expect(response1.statusCode).toBe(201);

    // Verify first company exists in DB before second attempt
    // Use the company ID from response
    const firstResponseBody = JSON.parse(response1.body);
    const firstCompanyId =
      firstResponseBody.company.id || firstResponseBody.company._id;
    let companyBeforeSecond = await Company.findById(firstCompanyId);
    if (!companyBeforeSecond) {
      // Fallback: try email lookup (emails are stored lowercased)
      const normalizedEmail = companyEmail.toLowerCase().trim();
      companyBeforeSecond = await Company.findOne({ email: normalizedEmail });
    }
    if (!companyBeforeSecond) {
      console.log('Company not found before second registration attempt');
      const allCompanies = await Company.find({});
      console.log(
        'All companies:',
        allCompanies.map(c => ({ id: c._id, email: c.email }))
      );
    }
    expect(companyBeforeSecond).toBeTruthy();

    // Small delay to ensure first registration is fully committed
    await new Promise(resolve => setTimeout(resolve, 50));

    // Second registration with same company email should fail
    const response2 = await app.inject({
      method: 'POST',
      url: '/api/auth/register-company',
      payload: {
        companyName: 'Another Company',
        companyEmail: companyEmail, // Same email
        ownerEmail: `owner2-${timestamp}-${random}@test.com`,
        ownerPassword: 'password123',
      },
    });

    if (response2.statusCode !== 409) {
      console.log(
        'Second registration error body:',
        JSON.parse(response2.body)
      );
      console.log('Second registration status:', response2.statusCode);
      // Verify company still exists (emails are stored lowercased)
      const normalizedEmail = companyEmail.toLowerCase().trim();
      const companyAfter = await Company.findOne({ email: normalizedEmail });
      console.log(
        'Company after second attempt:',
        companyAfter
          ? { id: companyAfter._id, email: companyAfter.email }
          : 'null'
      );
    }
    expect(response2.statusCode).toBe(409);
    const body = JSON.parse(response2.body);
    expect(body.error).toContain(
      'This email is already used for other company'
    );
  });

  it('should reject duplicate owner email', async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ownerEmail = `duplicate-${timestamp}-${random}@owner.com`;
    const companyData = {
      companyName: 'Test Auto Parts',
      companyEmail: `test-${timestamp}-${random}@autoparts.com`,
      ownerEmail: ownerEmail,
      ownerPassword: 'password123',
    };

    // First registration should succeed
    const response1 = await app.inject({
      method: 'POST',
      url: '/api/auth/register-company',
      payload: companyData,
    });

    if (response1.statusCode !== 201) {
      console.log('First registration error:', JSON.parse(response1.body));
    }
    expect(response1.statusCode).toBe(201);

    // Verify user exists before second attempt
    // Use the user ID from response
    const firstResponseBody = JSON.parse(response1.body);
    const firstUserId = firstResponseBody.user.id || firstResponseBody.user._id;
    let userBeforeSecond = await User.findById(firstUserId);
    if (!userBeforeSecond) {
      // Fallback: try email lookup
      userBeforeSecond = await User.findOne({ email: ownerEmail });
    }
    expect(userBeforeSecond).toBeTruthy();

    // Second registration with same owner email should fail
    const response2 = await app.inject({
      method: 'POST',
      url: '/api/auth/register-company',
      payload: {
        ...companyData,
        companyEmail: `another-${timestamp}-${random}@test.com`,
      },
    });

    if (response2.statusCode !== 409) {
      console.log(
        'Second registration error body:',
        JSON.parse(response2.body)
      );
    }
    expect(response2.statusCode).toBe(409);
    const body = JSON.parse(response2.body);
    expect(body.error).toContain('User with this email already exists');
  });

  it('should require all mandatory fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register-company',
      payload: {
        companyName: 'Test',
        // Missing companyEmail, ownerEmail, ownerPassword
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('required');
  });

  it('should allow login after registration', async () => {
    // Register company and owner with unique email
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const companyData = {
      companyName: 'Login Test Company',
      companyEmail: `login-${timestamp}-${random}@test.com`,
      ownerEmail: `loginowner-${timestamp}-${random}@test.com`,
      ownerPassword: 'password123',
    };

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register-company',
      payload: companyData,
    });

    if (registerResponse.statusCode !== 201) {
      console.log('Registration error:', JSON.parse(registerResponse.body));
    }
    expect(registerResponse.statusCode).toBe(201);

    // Verify user exists before login
    // Use the user ID from response
    const registerBody = JSON.parse(registerResponse.body);
    const userId = registerBody.user.id || registerBody.user._id;
    let userBeforeLogin = await User.findById(userId);
    if (!userBeforeLogin) {
      // Fallback: try email lookup
      userBeforeLogin = await User.findOne({ email: companyData.ownerEmail });
    }
    if (!userBeforeLogin) {
      const allUsers = await User.find({});
      console.log(
        'All users before login:',
        allUsers.map(u => ({ id: u._id, email: u.email }))
      );
    }
    expect(userBeforeLogin).toBeTruthy();

    // Login with owner credentials
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: companyData.ownerEmail,
        password: companyData.ownerPassword,
      },
    });

    if (loginResponse.statusCode !== 200) {
      console.log('Login error body:', JSON.parse(loginResponse.body));
      // Verify user still exists
      const userAfterFail = await User.findOne({
        email: companyData.ownerEmail,
      });
      console.log(
        'User after login fail:',
        userAfterFail
          ? { id: userAfterFail._id, email: userAfterFail.email }
          : 'null'
      );
    }
    expect(loginResponse.statusCode).toBe(200);
    const loginBody = JSON.parse(loginResponse.body);
    expect(loginBody).toHaveProperty('user');
    expect(loginBody.user.email).toBe(companyData.ownerEmail);
  });
});
