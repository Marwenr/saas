/**
 * Product controller for auto parts catalogue
 */
import mongoose from 'mongoose';

import Brand from '../models/brand.model.js';
import Product from '../models/product.model.js';
import { getCompanyFilter, getUserCompanyId } from '../utils/company.js';
import { calculateRecommendedSalePrice } from '../utils/pricing.js';

function computeRecommendedSupplierId(supplierInfos) {
  if (!Array.isArray(supplierInfos) || supplierInfos.length === 0) return null;
  const preferred = supplierInfos.filter(si => si.isPreferred);
  const pool = preferred.length > 0 ? preferred : supplierInfos;
  let best = null;
  for (const si of pool) {
    const price = si.lastPurchasePrice ?? Number.POSITIVE_INFINITY;
    if (best === null) {
      best = si;
    } else {
      const bestPrice = best.lastPurchasePrice ?? Number.POSITIVE_INFINITY;
      if (price < bestPrice) best = si;
    }
  }
  return best && best.supplierId ? best.supplierId : null;
}

/**
 * Helper function to find or create a brand by name
 * @param {string} companyId - Company ID
 * @param {string|ObjectId} brandInput - Brand name (string) or Brand ID (ObjectId)
 * @returns {Promise<ObjectId|null>} Brand ID or null
 */
async function findOrCreateBrand(companyId, brandInput) {
  if (!brandInput) return null;

  // Check if it's a valid ObjectId
  const isValidObjectId =
    typeof brandInput === 'object' ||
    (typeof brandInput === 'string' &&
      mongoose.Types.ObjectId.isValid(brandInput) &&
      brandInput.length === 24);

  if (isValidObjectId) {
    // Check if brand exists
    try {
      const brand = await Brand.findOne({
        _id: brandInput,
        companyId,
      });
      return brand ? brand._id : null;
    } catch (error) {
      // If casting fails, treat it as a string name
      // Fall through to string handling below
    }
  }

  // If it's a string (or invalid ObjectId), treat it as a brand name
  if (typeof brandInput === 'string') {
    const brandName = brandInput.trim();
    if (!brandName) return null;

    // Try to find existing brand
    let brand = await Brand.findOne({
      companyId,
      name: brandName,
    });

    // If not found, create it
    if (!brand) {
      try {
        brand = await Brand.create({
          companyId,
          name: brandName,
        });
      } catch (error) {
        // If creation fails due to duplicate (race condition), find it again
        if (error.code === 11000) {
          brand = await Brand.findOne({
            companyId,
            name: brandName,
          });
        } else {
          throw error;
        }
      }
    }

    return brand ? brand._id : null;
  }

  return null;
}

/**
 * Get suppliers for a product with recommended supplier
 * GET /products/:id/suppliers
 */
export async function getProductSuppliers(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);
    const product = await Product.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    })
      .select('sku name supplierInfos')
      .lean();

    if (!product) {
      return reply.code(404).send({ error: 'Product not found' });
    }

    const supplierInfos = Array.isArray(product.supplierInfos)
      ? [...product.supplierInfos]
      : [];
    supplierInfos.sort((a, b) => {
      // Preferred first
      if (a.isPreferred && !b.isPreferred) return -1;
      if (!a.isPreferred && b.isPreferred) return 1;
      // Then by lowest lastPurchasePrice
      const ap = a.lastPurchasePrice ?? Number.POSITIVE_INFINITY;
      const bp = b.lastPurchasePrice ?? Number.POSITIVE_INFINITY;
      return ap - bp;
    });

    const recommendedSupplierId = computeRecommendedSupplierId(
      product.supplierInfos || []
    );

    return reply.send({
      product: { id: product._id, sku: product.sku, name: product.name },
      suppliers: supplierInfos,
      recommendedSupplierId,
    });
  } catch (error) {
    request.log.error(error);
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({ error: 'Product not found' });
    }
    return reply.code(500).send({
      error: 'Failed to fetch product suppliers',
    });
  }
}

/**
 * Get all products with pagination and search
 * GET /products?page=1&limit=20&search=keyword&category=Freinage
 */
export async function getProducts(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    // Pagination
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Search query
    const search = request.query.search || '';
    const category = request.query.category || '';
    const isActive =
      request.query.isActive !== undefined
        ? request.query.isActive === 'true'
        : undefined;

    // Build filter
    const filter = {
      ...companyFilter,
      isDeleted: false, // Only show non-deleted products
    };

    // Add search filter (search in name, sku, oemRefs, description)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { oemRefs: { $regex: search, $options: 'i' } },
        { manufacturerRef: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Add category filter
    if (category) {
      filter.category = category;
    }

    // Add isActive filter
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Get products and populate brand safely (handle legacy string values)
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Safely populate brand for each product
    for (const product of products) {
      if (product.brand) {
        // Only populate if brand is a valid ObjectId
        if (
          mongoose.Types.ObjectId.isValid(product.brand) &&
          String(product.brand).length === 24
        ) {
          try {
            const brand = await Brand.findById(product.brand)
              .select('name')
              .lean();
            product.brand = brand || null;
          } catch (error) {
            // If populate fails, set to null
            product.brand = null;
          }
        } else {
          // Legacy string value - set to null (or you could migrate it)
          product.brand = null;
        }
      }
    }

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    return reply.send({
      products,
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
      error: 'Failed to fetch products',
    });
  }
}

/**
 * Get a single product by ID
 * GET /products/:id
 */
export async function getProduct(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const product = await Product.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    }).lean();

    // Safely populate brand if it exists and is a valid ObjectId
    if (product && product.brand) {
      if (
        mongoose.Types.ObjectId.isValid(product.brand) &&
        String(product.brand).length === 24
      ) {
        try {
          const brand = await Brand.findById(product.brand)
            .select('name')
            .lean();
          product.brand = brand || null;
        } catch (error) {
          product.brand = null;
        }
      } else {
        // Legacy string value
        product.brand = null;
      }
    }

    if (!product) {
      return reply.code(404).send({
        error: 'Product not found',
      });
    }

    return reply.send({ product });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Product not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to fetch product',
    });
  }
}

/**
 * Create a new product
 * POST /products
 */
export async function createProduct(request, reply) {
  try {
    // Get companyId from JWT token (properly extracted)
    const companyId = getUserCompanyId(request.user);

    // Ensure user has a companyId (required for creating products)
    if (!companyId) {
      return reply.code(403).send({
        error: 'User must be associated with a company to create products',
      });
    }

    const {
      sku,
      manufacturerRef,
      oemRefs,
      name,
      description,
      brand,
      category,
      subCategory,
      salePrice,
      purchasePrice,
      taxRate,
      marginRate,
      minMarginOnLastPurchase,
      isActive,
      tags,
      notes,
    } = request.body;

    // Validate required fields
    // salePrice is required UNLESS purchasePrice is provided (it will be calculated)
    if (
      !sku ||
      !name ||
      (salePrice === undefined && purchasePrice === undefined)
    ) {
      return reply.code(400).send({
        error: 'SKU, name, and salePrice (or purchasePrice) are required',
      });
    }

    // Check if SKU already exists for this company
    // Check for any product with this SKU that is not deleted (isDeleted !== true)
    const existingProduct = await Product.findOne({
      companyId,
      sku,
      isDeleted: { $ne: true },
    });

    if (existingProduct) {
      return reply.code(409).send({
        error: 'Product with this SKU already exists',
      });
    }

    // Normalize oemRefs - handle both array and string inputs
    let normalizedOemRefs = [];
    if (oemRefs !== undefined && oemRefs !== null) {
      if (Array.isArray(oemRefs)) {
        normalizedOemRefs = oemRefs
          .map(ref =>
            typeof ref === 'string' ? ref.trim() : String(ref).trim()
          )
          .filter(ref => ref.length > 0);
      } else if (typeof oemRefs === 'string') {
        // Split by comma, newline, or semicolon, then trim and filter empty
        normalizedOemRefs = oemRefs
          .split(/[,;\n\r]+/)
          .map(ref => ref.trim())
          .filter(ref => ref.length > 0);
      }
    }

    // Find or create brand
    const brandId = await findOrCreateBrand(companyId, brand);

    // Prepare product data
    const productData = {
      companyId,
      sku,
      manufacturerRef: manufacturerRef?.trim() || undefined,
      oemRefs: normalizedOemRefs.length > 0 ? normalizedOemRefs : undefined,
      name,
      description,
      brand: brandId || undefined,
      category,
      subCategory,
      purchasePrice,
      taxRate: taxRate !== undefined ? taxRate : 19,
      marginRate: marginRate !== undefined ? marginRate : 20,
      minMarginOnLastPurchase:
        minMarginOnLastPurchase !== undefined ? minMarginOnLastPurchase : 10,
      isActive: isActive !== undefined ? isActive : true,
      isDeleted: false, // Explicitly set to false to ensure it's not undefined
      tags: tags || [],
      notes,
    };

    // If purchasePrice is provided, set lastPurchasePrice and calculate salePrice using HYBRID mode
    if (purchasePrice !== undefined && purchasePrice > 0) {
      productData.lastPurchasePrice = purchasePrice;
      // Calculate recommended sale price using HYBRID mode (includes taxRate)
      const recommendedPrice = calculateRecommendedSalePrice({
        purchasePrice: purchasePrice,
        lastPurchasePrice: purchasePrice,
        marginRate: productData.marginRate,
        minMarginOnLastPurchase: productData.minMarginOnLastPurchase,
        taxRate: productData.taxRate,
      });
      if (recommendedPrice > 0) {
        // Round to 2 decimal places for consistency
        productData.salePrice = Math.round(recommendedPrice * 100) / 100;
      }
    } else if (salePrice !== undefined) {
      // If only salePrice is provided (without purchasePrice), use it directly
      productData.salePrice = salePrice;
    }

    // Create product
    const product = await Product.create(productData);

    // Populate brand before returning (if it exists and is valid)
    if (product.brand) {
      try {
        await product.populate('brand', 'name');
      } catch (error) {
        // If populate fails (invalid ObjectId), set to null
        product.brand = null;
      }
    }

    return reply.code(201).send({ product });
  } catch (error) {
    request.log.error(error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    // Handle duplicate key error (unique index)
    if (error.code === 11000) {
      return reply.code(409).send({
        error: 'Product with this SKU already exists for this company',
      });
    }

    return reply.code(500).send({
      error: 'Failed to create product',
    });
  }
}

/**
 * Update a product
 * PUT /products/:id
 */
export async function updateProduct(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const {
      sku,
      manufacturerRef,
      oemRefs,
      name,
      description,
      brand,
      category,
      subCategory,
      salePrice,
      purchasePrice,
      taxRate,
      marginRate,
      minMarginOnLastPurchase,
      isActive,
      tags,
      notes,
    } = request.body;

    // Find product and ensure it belongs to user's company
    const product = await Product.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    });

    if (!product) {
      return reply.code(404).send({
        error: 'Product not found',
      });
    }

    // If SKU is being updated, check for duplicates
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({
        companyId: product.companyId,
        sku,
        isDeleted: { $ne: true },
        _id: { $ne: product._id },
      });

      if (existingProduct) {
        return reply.code(409).send({
          error: 'Product with this SKU already exists',
        });
      }
    }

    // Update fields
    if (sku !== undefined) product.sku = sku;
    if (manufacturerRef !== undefined) {
      product.manufacturerRef = manufacturerRef?.trim() || undefined;
    }
    if (oemRefs !== undefined) {
      // Normalize oemRefs - handle both array and string inputs
      let normalizedOemRefs = [];
      if (oemRefs !== null) {
        if (Array.isArray(oemRefs)) {
          normalizedOemRefs = oemRefs
            .map(ref =>
              typeof ref === 'string' ? ref.trim() : String(ref).trim()
            )
            .filter(ref => ref.length > 0);
        } else if (typeof oemRefs === 'string') {
          // Split by comma, newline, or semicolon, then trim and filter empty
          normalizedOemRefs = oemRefs
            .split(/[,;\n\r]+/)
            .map(ref => ref.trim())
            .filter(ref => ref.length > 0);
        }
      }
      product.oemRefs = normalizedOemRefs.length > 0 ? normalizedOemRefs : [];
    }
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (brand !== undefined) {
      const brandId = await findOrCreateBrand(product.companyId, brand);
      product.brand = brandId || undefined;
    }
    if (category !== undefined) product.category = category;
    if (subCategory !== undefined) product.subCategory = subCategory;
    if (taxRate !== undefined) product.taxRate = taxRate;
    if (marginRate !== undefined) product.marginRate = marginRate;
    if (minMarginOnLastPurchase !== undefined)
      product.minMarginOnLastPurchase = minMarginOnLastPurchase;
    if (isActive !== undefined) product.isActive = isActive;
    if (tags !== undefined) product.tags = tags;
    if (notes !== undefined) product.notes = notes;

    // Handle purchasePrice and salePrice with HYBRID pricing
    if (purchasePrice !== undefined) {
      product.purchasePrice = purchasePrice;
      // If purchasePrice is provided and > 0, update lastPurchasePrice and recalculate salePrice
      if (purchasePrice > 0) {
        product.lastPurchasePrice = purchasePrice;
        // Calculate recommended sale price using HYBRID mode (includes taxRate)
        const recommendedPrice = calculateRecommendedSalePrice({
          purchasePrice: product.purchasePrice,
          lastPurchasePrice: product.lastPurchasePrice,
          marginRate: product.marginRate,
          minMarginOnLastPurchase: product.minMarginOnLastPurchase,
          taxRate: product.taxRate,
        });
        if (recommendedPrice > 0) {
          // Round to 2 decimal places for consistency
          product.salePrice = Math.round(recommendedPrice * 100) / 100;
        }
      }
    } else if (salePrice !== undefined) {
      // If only salePrice is provided (without purchasePrice), update it directly
      product.salePrice = salePrice;
    }

    await product.save();

    // Populate brand before returning (if it exists and is valid)
    if (product.brand) {
      try {
        await product.populate('brand', 'name');
      } catch (error) {
        // If populate fails (invalid ObjectId), set to null
        product.brand = null;
      }
    }

    return reply.send({ product });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Product not found',
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return reply.code(409).send({
        error: 'Product with this SKU already exists for this company',
      });
    }

    return reply.code(500).send({
      error: 'Failed to update product',
    });
  }
}

/**
 * Soft delete a product
 * DELETE /products/:id
 */
export async function deleteProduct(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const product = await Product.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    });

    if (!product) {
      return reply.code(404).send({
        error: 'Product not found',
      });
    }

    // Soft delete
    product.isDeleted = true;
    await product.save();

    return reply.send({
      message: 'Product deleted successfully',
      product,
    });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Product not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to delete product',
    });
  }
}
