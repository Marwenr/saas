/**
 * Supplier controller for purchasing module
 */
import Supplier from '../models/supplier.model.js';
import { getCompanyFilter, getUserCompanyId } from '../utils/company.js';

/**
 * Get all suppliers with pagination and search
 * GET /suppliers?page=1&limit=20&search=keyword&isActive=true
 */
export async function getSuppliers(request, reply) {
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

    // Build filter
    const filter = {
      ...companyFilter,
      isDeleted: false, // Only show non-deleted suppliers
    };

    // Add search filter (search in name, contactName, email, phone)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Add isActive filter
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Get suppliers
    const suppliers = await Supplier.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Supplier.countDocuments(filter);

    return reply.send({
      suppliers,
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
      error: 'Failed to fetch suppliers',
    });
  }
}

/**
 * Get a single supplier by ID
 * GET /suppliers/:id
 */
export async function getSupplier(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const supplier = await Supplier.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    }).lean();

    if (!supplier) {
      return reply.code(404).send({
        error: 'Supplier not found',
      });
    }

    return reply.send({ supplier });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Supplier not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to fetch supplier',
    });
  }
}

/**
 * Create a new supplier
 * POST /suppliers
 */
export async function createSupplier(request, reply) {
  try {
    // Get companyId from JWT token
    const companyId = getUserCompanyId(request.user);

    // Ensure user has a companyId
    if (!companyId) {
      return reply.code(403).send({
        error: 'User must be associated with a company to create suppliers',
      });
    }

    const {
      name,
      contactName,
      email,
      phone,
      taxNumber,
      address,
      city,
      country,
      isActive,
      notes,
    } = request.body;

    // Validate required fields
    if (!name) {
      return reply.code(400).send({
        error: 'Name is required',
      });
    }

    // Create supplier
    const supplier = await Supplier.create({
      companyId,
      name,
      contactName,
      email,
      phone,
      taxNumber,
      address,
      city,
      country,
      isActive: isActive !== undefined ? isActive : true,
      notes,
    });

    return reply.code(201).send({ supplier });
  } catch (error) {
    request.log.error(error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    return reply.code(500).send({
      error: 'Failed to create supplier',
    });
  }
}

/**
 * Update a supplier
 * PUT /suppliers/:id
 */
export async function updateSupplier(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const {
      name,
      contactName,
      email,
      phone,
      taxNumber,
      address,
      city,
      country,
      isActive,
      notes,
    } = request.body;

    // Find supplier and ensure it belongs to user's company
    const supplier = await Supplier.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    });

    if (!supplier) {
      return reply.code(404).send({
        error: 'Supplier not found',
      });
    }

    // Update fields
    if (name !== undefined) supplier.name = name;
    if (contactName !== undefined) supplier.contactName = contactName;
    if (email !== undefined) supplier.email = email;
    if (phone !== undefined) supplier.phone = phone;
    if (taxNumber !== undefined) supplier.taxNumber = taxNumber;
    if (address !== undefined) supplier.address = address;
    if (city !== undefined) supplier.city = city;
    if (country !== undefined) supplier.country = country;
    if (isActive !== undefined) supplier.isActive = isActive;
    if (notes !== undefined) supplier.notes = notes;

    await supplier.save();

    return reply.send({ supplier });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Supplier not found',
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    return reply.code(500).send({
      error: 'Failed to update supplier',
    });
  }
}

/**
 * Soft delete a supplier
 * DELETE /suppliers/:id
 */
export async function deleteSupplier(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const supplier = await Supplier.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    });

    if (!supplier) {
      return reply.code(404).send({
        error: 'Supplier not found',
      });
    }

    // Soft delete
    supplier.isDeleted = true;
    await supplier.save();

    return reply.send({
      message: 'Supplier deleted successfully',
      supplier,
    });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Supplier not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to delete supplier',
    });
  }
}
