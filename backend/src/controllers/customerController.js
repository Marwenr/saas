/**
 * Customer controller for automotive ERP
 */
import mongoose from 'mongoose';

import Customer from '../models/customer.model.js';
import Invoice from '../models/invoice.model.js';
import { getCompanyFilter, getUserCompanyId } from '../utils/company.js';

/**
 * Get all customers with pagination and search
 * GET /clients?page=1&limit=20&search=keyword&isActive=true&clientType=particulier&classification=vert
 */
export async function getCustomers(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    // Pagination
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Search query
    const search = request.query.search || '';
    const isActive =
      request.query.isActive !== undefined
        ? request.query.isActive === 'true'
        : undefined;
    const clientType = request.query.clientType || undefined;
    const classification = request.query.classification || undefined;

    // Build filter
    const filter = {
      ...companyFilter,
      isDeleted: false, // Only show non-deleted customers
    };

    // Add search filter (search in firstName, lastName, email, phones, internalCode, taxId)
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phones: { $regex: search, $options: 'i' } },
        { internalCode: { $regex: search, $options: 'i' } },
        { taxId: { $regex: search, $options: 'i' } },
      ];
    }

    // Add isActive filter
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Add clientType filter
    if (clientType) {
      filter.clientType = clientType;
    }

    // Add classification filter
    if (classification) {
      filter.classification = classification;
    }

    // Get customers
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Customer.countDocuments(filter);

    return reply.send({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Failed to fetch customers',
    });
  }
}

/**
 * Get a single customer by ID
 * GET /clients/:id
 */
export async function getCustomer(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const customer = await Customer.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    });

    if (!customer) {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    // Convert to plain object for response
    const customerObj = customer.toObject();

    // Add loyalty information if customer is eligible
    if (customer.isEligibleForLoyalty() && customer.isLoyalClient) {
      customerObj.isLoyalClient = true;
      customerObj.loyaltyDiscount = customer.loyaltyDiscount || 3;
      customerObj.loyaltyLabel = 'Client fidèle — remise appliquée';
    } else {
      customerObj.isLoyalClient = false;
      customerObj.loyaltyDiscount = 0;
    }

    return reply.send({ customer: customerObj });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to fetch customer',
    });
  }
}

/**
 * Create a new customer
 * POST /clients
 */
export async function createCustomer(request, reply) {
  try {
    // Get companyId from JWT token
    const companyId = getUserCompanyId(request.user);

    // Ensure user has a companyId
    if (!companyId) {
      return reply.code(403).send({
        error: 'User must be associated with a company to create customers',
      });
    }

    const {
      firstName,
      lastName,
      phones,
      email,
      address,
      city,
      taxId,
      internalCode,
      clientType,
      classification,
      vehicles,
      isActive,
      notes,
    } = request.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return reply.code(400).send({
        error: 'First name and last name are required',
      });
    }

    // Validate clientType
    if (clientType && !['particulier', 'professionnel'].includes(clientType)) {
      return reply.code(400).send({
        error: 'Invalid client type. Must be "particulier" or "professionnel"',
      });
    }

    // Validate classification if provided
    if (
      classification &&
      !['vert', 'jaune', 'rouge', 'noir'].includes(classification)
    ) {
      return reply.code(400).send({
        error:
          'Invalid classification. Must be "vert", "jaune", "rouge", or "noir"',
      });
    }

    // Ensure phones is an array
    let phonesArray = [];
    if (phones) {
      if (Array.isArray(phones)) {
        phonesArray = phones.filter(p => p && p.trim());
      } else if (typeof phones === 'string') {
        phonesArray = phones
          .split(',')
          .map(p => p.trim())
          .filter(p => p);
      }
    }

    // Create customer
    const customer = await Customer.create({
      companyId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phones: phonesArray,
      email: email?.trim() || undefined,
      address: address?.trim() || undefined,
      city: city?.trim() || undefined,
      taxId: taxId?.trim() || undefined,
      internalCode: internalCode?.trim() || undefined,
      clientType: clientType || 'particulier',
      classification: classification || undefined, // Will be auto-calculated if not provided
      vehicles: vehicles || [],
      isActive: isActive !== undefined ? isActive : true,
      notes: notes?.trim() || undefined,
    });

    return reply.code(201).send({ customer });
  } catch (error) {
    request.log.error(error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return reply.code(409).send({
        error: 'Customer with this internal code already exists',
      });
    }

    return reply.code(500).send({
      error: 'Failed to create customer',
    });
  }
}

/**
 * Update a customer
 * PUT /clients/:id
 */
export async function updateCustomer(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const {
      firstName,
      lastName,
      phones,
      email,
      address,
      city,
      taxId,
      internalCode,
      clientType,
      classification,
      vehicles,
      isActive,
      notes,
    } = request.body;

    // Find customer and ensure it belongs to user's company
    const customer = await Customer.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    });

    if (!customer) {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    // Validate clientType if provided
    if (clientType && !['particulier', 'professionnel'].includes(clientType)) {
      return reply.code(400).send({
        error: 'Invalid client type. Must be "particulier" or "professionnel"',
      });
    }

    // Validate classification if provided
    if (
      classification &&
      !['vert', 'jaune', 'rouge', 'noir'].includes(classification)
    ) {
      return reply.code(400).send({
        error:
          'Invalid classification. Must be "vert", "jaune", "rouge", or "noir"',
      });
    }

    // Update fields
    if (firstName !== undefined) customer.firstName = firstName.trim();
    if (lastName !== undefined) customer.lastName = lastName.trim();
    if (phones !== undefined) {
      if (Array.isArray(phones)) {
        customer.phones = phones.filter(p => p && p.trim());
      } else if (typeof phones === 'string') {
        customer.phones = phones
          .split(',')
          .map(p => p.trim())
          .filter(p => p);
      } else {
        customer.phones = [];
      }
    }
    if (email !== undefined) customer.email = email?.trim() || undefined;
    if (address !== undefined) customer.address = address?.trim() || undefined;
    if (city !== undefined) customer.city = city?.trim() || undefined;
    if (taxId !== undefined) customer.taxId = taxId?.trim() || undefined;
    if (internalCode !== undefined)
      customer.internalCode = internalCode?.trim() || undefined;
    if (clientType !== undefined) customer.clientType = clientType;
    if (classification !== undefined) customer.classification = classification;
    if (vehicles !== undefined) customer.vehicles = vehicles;
    if (isActive !== undefined) customer.isActive = isActive;
    if (notes !== undefined) customer.notes = notes?.trim() || undefined;

    await customer.save();

    return reply.send({ customer });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return reply.code(409).send({
        error: 'Customer with this internal code already exists',
      });
    }

    return reply.code(500).send({
      error: 'Failed to update customer',
    });
  }
}

/**
 * Soft delete a customer
 * DELETE /clients/:id
 */
export async function deleteCustomer(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const customer = await Customer.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    });

    if (!customer) {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    // Soft delete
    customer.isDeleted = true;
    await customer.save();

    return reply.send({
      message: 'Customer deleted successfully',
      customer,
    });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to delete customer',
    });
  }
}

/**
 * Get customer finance information
 * GET /clients/:id/finance
 */
export async function getCustomerFinance(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);
    const customerId = request.params.id;

    // Verify customer exists and belongs to company
    const customer = await Customer.findOne({
      _id: customerId,
      ...companyFilter,
      isDeleted: false,
    }).lean();

    if (!customer) {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    const { getCustomerFinanceSummary } = await import(
      '../utils/customerFinance.js'
    );
    const companyId = getUserCompanyId(request.user);
    const finance = await getCustomerFinanceSummary(customerId, companyId);

    return reply.send({ finance });
  } catch (error) {
    request.log.error(error);

    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to fetch customer finance',
    });
  }
}

/**
 * Get customer invoices
 * GET /clients/:id/invoices
 */
export async function getCustomerInvoices(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);
    const customerId = request.params.id;

    // Verify customer exists
    const customer = await Customer.findOne({
      _id: customerId,
      ...companyFilter,
      isDeleted: false,
    }).lean();

    if (!customer) {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    const companyId = getUserCompanyId(request.user);

    // Pagination
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Status filter
    const status = request.query.status;

    const filter = {
      customerId: customerId,
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    if (status) {
      filter.status = status;
    }

    const invoices = await Invoice.find(filter)
      .populate('saleId', 'reference saleDate')
      .sort({ invoiceDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Invoice.countDocuments(filter);

    return reply.send({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    request.log.error(error);

    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to fetch invoices',
    });
  }
}

/**
 * Record a payment for a customer
 * POST /clients/:id/payments
 */
export async function recordCustomerPayment(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);
    const customerId = request.params.id;

    // Verify customer exists
    const customer = await Customer.findOne({
      _id: customerId,
      ...companyFilter,
      isDeleted: false,
    }).lean();

    if (!customer) {
      return reply.code(404).send({
        error: 'Customer not found',
      });
    }

    const { invoiceId, amount, paymentMethod, reference, notes } = request.body;

    // Validate required fields
    if (!invoiceId || !amount || amount <= 0) {
      return reply.code(400).send({
        error: 'invoiceId and amount (amount > 0) are required',
      });
    }

    // Validate payment method
    const validPaymentMethods = [
      'CASH',
      'CHECK',
      'BANK_TRANSFER',
      'CREDIT_CARD',
      'OTHER',
    ];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return reply.code(400).send({
        error: `paymentMethod must be one of: ${validPaymentMethods.join(', ')}`,
      });
    }

    const { recordPayment } = await import('../utils/customerFinance.js');
    const companyId = getUserCompanyId(request.user);

    const result = await recordPayment(
      customerId,
      invoiceId,
      amount,
      paymentMethod || 'CASH',
      reference,
      notes,
      request.user.userId,
      companyId
    );

    return reply.code(201).send({
      payment: result.payment,
      invoice: result.invoice,
    });
  } catch (error) {
    request.log.error(error);

    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Invalid ID format',
      });
    }

    if (error.message === 'Invoice not found') {
      return reply.code(404).send({
        error: error.message,
      });
    }

    if (
      error.message.includes('exceeds') ||
      error.message.includes('cancelled')
    ) {
      return reply.code(400).send({
        error: error.message,
      });
    }

    return reply.code(500).send({
      error: 'Failed to record payment',
    });
  }
}
