/**
 * Inventory controller for stock management
 */
import mongoose from 'mongoose';

import Product from '../models/product.model.js';
import StockMovement from '../models/stockMovement.model.js';
import { getCompanyFilter, getUserCompanyId } from '../utils/company.js';

/**
 * Get stock movements with pagination and filtering
 * GET /inventory/movements?page=1&limit=20&productId=xxx
 */
export async function getStockMovements(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    // Pagination
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      ...companyFilter,
    };

    // Filter by productId if provided
    if (request.query.productId) {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(request.query.productId)) {
        return reply.code(400).send({
          error: 'Invalid productId format',
        });
      }

      // Ensure product belongs to user's company
      const product = await Product.findOne({
        _id: request.query.productId,
        ...companyFilter,
        isDeleted: false,
      });

      if (!product) {
        return reply.code(404).send({
          error: 'Product not found',
        });
      }

      filter.productId = new mongoose.Types.ObjectId(request.query.productId);
    }

    // Optional filter by type
    if (
      request.query.type &&
      ['IN', 'OUT', 'ADJUST'].includes(request.query.type)
    ) {
      filter.type = request.query.type;
    }

    // Get movements
    const movements = await StockMovement.find(filter)
      .populate('productId', 'manufacturerRef name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await StockMovement.countDocuments(filter);

    return reply.send({
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(400).send({
        error: 'Invalid ID format',
      });
    }

    return reply.code(500).send({
      error: 'Failed to fetch stock movements',
    });
  }
}

/**
 * Create a stock movement and update product stock
 * POST /inventory/movements
 */
export async function createStockMovement(request, reply) {
  try {
    const companyId = getUserCompanyId(request.user);

    // Ensure user has a companyId
    if (!companyId) {
      return reply.code(403).send({
        error:
          'User must be associated with a company to create stock movements',
      });
    }

    const { productId, type, quantity, reason, source, reference } =
      request.body;

    // Validate required fields
    if (!productId || !type || quantity === undefined) {
      return reply.code(400).send({
        error: 'productId, type, and quantity are required',
      });
    }

    // Validate type
    if (!['IN', 'OUT', 'ADJUST'].includes(type)) {
      return reply.code(400).send({
        error: 'type must be IN, OUT, or ADJUST',
      });
    }

    // Validate quantity
    // For IN and OUT, quantity must be > 0 (change amount)
    // For ADJUST, quantity >= 0 (target stock level, can be 0)
    if (type === 'ADJUST') {
      if (quantity < 0) {
        return reply.code(400).send({
          error: 'quantity must be greater than or equal to 0 for ADJUST',
        });
      }
    } else {
      if (quantity <= 0) {
        return reply.code(400).send({
          error: 'quantity must be greater than 0 for IN and OUT',
        });
      }
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return reply.code(400).send({
        error: 'Invalid productId format',
      });
    }

    // Find product and ensure it belongs to user's company
    const product = await Product.findOne({
      _id: productId,
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false,
    });

    if (!product) {
      return reply.code(404).send({
        error: 'Product not found',
      });
    }

    // Calculate stock change
    const beforeQty = product.stockQty || 0;
    let afterQty;

    if (type === 'IN') {
      afterQty = beforeQty + quantity;
    } else if (type === 'OUT') {
      // Check if enough stock
      if (beforeQty < quantity) {
        return reply.code(400).send({
          error: `Insufficient stock. Current stock: ${beforeQty}, requested: ${quantity}`,
        });
      }
      afterQty = beforeQty - quantity;
    } else if (type === 'ADJUST') {
      // ADJUST sets the stock to the specified quantity
      afterQty = quantity;
    }

    // Ensure afterQty is not negative
    if (afterQty < 0) {
      return reply.code(400).send({
        error: 'Stock quantity cannot be negative',
      });
    }

    // Create stock movement
    const movement = await StockMovement.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      productId: new mongoose.Types.ObjectId(productId),
      type,
      quantity: type === 'ADJUST' ? Math.abs(afterQty - beforeQty) : quantity,
      beforeQty,
      afterQty,
      reason,
      source,
      reference,
      createdBy: new mongoose.Types.ObjectId(request.user.userId),
    });

    // Update product stock
    product.stockQty = afterQty;
    await product.save();

    // Populate movement for response
    await movement.populate('productId', 'manufacturerRef name');
    await movement.populate('createdBy', 'name email');

    return reply.code(201).send({
      movement,
      product: {
        id: product._id,
        stockQty: product.stockQty,
      },
    });
  } catch (error) {
    request.log.error(error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(400).send({
        error: 'Invalid ID format',
      });
    }

    return reply.code(500).send({
      error: 'Failed to create stock movement',
    });
  }
}

/**
 * Get products with low stock (stockQty <= minStock)
 * GET /inventory/low-stock?page=1&limit=20
 */
export async function getLowStockProducts(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    // Pagination
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      ...companyFilter,
      isDeleted: false,
      isActive: true,
    };

    // Find products where stockQty <= minStock
    // Using aggregation to calculate this condition
    const products = await Product.aggregate([
      {
        $match: filter,
      },
      {
        $addFields: {
          stockQty: { $ifNull: ['$stockQty', 0] },
          minStock: { $ifNull: ['$minStock', 0] },
        },
      },
      {
        $match: {
          $expr: { $lte: ['$stockQty', '$minStock'] },
        },
      },
      {
        $sort: { stockQty: 1, createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    // Get total count for pagination
    const total = await Product.aggregate([
      {
        $match: filter,
      },
      {
        $addFields: {
          stockQty: { $ifNull: ['$stockQty', 0] },
          minStock: { $ifNull: ['$minStock', 0] },
        },
      },
      {
        $match: {
          $expr: { $lte: ['$stockQty', '$minStock'] },
        },
      },
      {
        $count: 'total',
      },
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;

    return reply.send({
      products,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Failed to fetch low stock products',
    });
  }
}
