/**
 * Brand controller for auto parts catalogue
 */
import Brand from '../models/brand.model.js';
import { getCompanyFilter, getUserCompanyId } from '../utils/company.js';

/**
 * Get all brands for the user's company
 * GET /brands?search=keyword
 */
export async function getBrands(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    // Search query
    const search = request.query.search || '';

    // Build filter
    const filter = {
      ...companyFilter,
    };

    // Add search filter
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    // Get brands, sorted by name
    const brands = await Brand.find(filter)
      .sort({ name: 1 })
      .select('_id name')
      .lean();

    return reply.send({ brands });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Failed to fetch brands',
    });
  }
}

/**
 * Create a new brand
 * POST /brands
 */
export async function createBrand(request, reply) {
  try {
    const companyId = getUserCompanyId(request.user);

    if (!companyId) {
      return reply.code(403).send({
        error: 'User must be associated with a company to create brands',
      });
    }

    const { name } = request.body;

    if (!name || !name.trim()) {
      return reply.code(400).send({
        error: 'Brand name is required',
      });
    }

    const brandName = name.trim();

    // Check if brand already exists for this company
    const existingBrand = await Brand.findOne({
      companyId,
      name: brandName,
    });

    if (existingBrand) {
      return reply.send({ brand: existingBrand });
    }

    // Create brand
    const brand = await Brand.create({
      companyId,
      name: brandName,
    });

    return reply.code(201).send({ brand });
  } catch (error) {
    request.log.error(error);

    // Handle duplicate key error (unique index)
    if (error.code === 11000) {
      // Brand already exists, try to find it and return it
      const companyId = getUserCompanyId(request.user);
      const { name } = request.body;
      if (companyId && name) {
        const existingBrand = await Brand.findOne({
          companyId,
          name: name.trim(),
        });
        if (existingBrand) {
          return reply.send({ brand: existingBrand });
        }
      }
      return reply.code(409).send({
        error: 'Brand with this name already exists for this company',
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
      error: 'Failed to create brand',
    });
  }
}
