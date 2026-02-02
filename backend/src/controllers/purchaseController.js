/**
 * Purchase controller for purchasing module
 */
import mongoose from 'mongoose';

import Product from '../models/product.model.js';
import PurchaseOrder from '../models/purchaseOrder.model.js';
import Supplier from '../models/supplier.model.js';
import { getCompanyFilter, getUserCompanyId } from '../utils/company.js';

import { receivePurchaseCore } from './purchaseReceiveHelper.js';

/**
 * Create a new purchase order
 * POST /purchases/orders
 */
export async function createPurchaseOrder(request, reply) {
  try {
    const companyId = getUserCompanyId(request.user);

    // Ensure user has a companyId
    if (!companyId) {
      return reply.code(403).send({
        error:
          'User must be associated with a company to create purchase orders',
      });
    }

    const {
      supplierId,
      orderNumber,
      orderDate,
      expectedDate,
      items,
      notes,
      status,
    } = request.body;

    // Validate required fields
    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({
        error: 'supplierId and items array are required',
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return reply.code(400).send({
        error: 'Invalid supplierId format',
      });
    }

    // Verify supplier belongs to user's company
    // Use $ne: true to catch both false and undefined/null
    const supplier = await Supplier.findOne({
      _id: supplierId,
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
    });

    if (!supplier) {
      return reply.code(404).send({
        error: 'Supplier not found',
      });
    }

    // Validate and process items
    const processedItems = [];
    let totalAmount = 0;
    let totalAmountVatIncluded = 0;

    for (const item of items) {
      const { productId, quantity, unitPrice, taxRate } = item;

      if (!productId || !quantity || unitPrice === undefined) {
        return reply.code(400).send({
          error: 'Each item must have productId, quantity, and unitPrice',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return reply.code(400).send({
          error: `Invalid productId format: ${productId}`,
        });
      }

      // Verify product belongs to user's company
      // Use $ne: true to catch both false and undefined/null
      const product = await Product.findOne({
        _id: productId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: { $ne: true },
      });

      if (!product) {
        return reply.code(404).send({
          error: `Product ${productId} not found`,
        });
      }

      const itemTaxRate = taxRate !== undefined ? taxRate : 0;
      // subtotal is stored as EXCLUDING VAT (HT) to match product routes expectations (totalExclTax)
      const subtotal = quantity * unitPrice;
      const subtotalVatIncluded = subtotal * (1 + itemTaxRate / 100);

      processedItems.push({
        productId: new mongoose.Types.ObjectId(productId),
        quantity,
        receivedQuantity: 0,
        unitPrice,
        taxRate: itemTaxRate,
        subtotal,
      });

      totalAmount += subtotal;
      totalAmountVatIncluded += subtotalVatIncluded;
    }

    // Generate order number if not provided
    let finalOrderNumber = orderNumber;
    if (!finalOrderNumber) {
      // Generate order number: PO-YYYYMMDD-XXX
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await PurchaseOrder.countDocuments({
        companyId: new mongoose.Types.ObjectId(companyId),
        orderNumber: { $regex: `^PO-${dateStr}-` },
      });
      finalOrderNumber = `PO-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    } else {
      // Check if order number already exists for this company
      const existingOrder = await PurchaseOrder.findOne({
        companyId: new mongoose.Types.ObjectId(companyId),
        orderNumber: finalOrderNumber,
        isDeleted: false,
      });

      if (existingOrder) {
        return reply.code(409).send({
          error: 'Purchase order with this order number already exists',
        });
      }
    }

    // Create purchase order
    let purchaseOrder = await PurchaseOrder.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      supplierId: new mongoose.Types.ObjectId(supplierId),
      orderNumber: finalOrderNumber,
      status: status || 'DRAFT',
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      items: processedItems,
      totalAmount,
      totalAmountVatIncluded,
      notes,
      createdBy: new mongoose.Types.ObjectId(request.user.userId),
      isDeleted: false, // Explicitly set to false to ensure it's not undefined
    });

    // If the PO is created directly with status = 'RECEIVED', immediately receive all remaining quantities
    if ((status || 'DRAFT') === 'RECEIVED') {
      try {
        const result = await receivePurchaseCore(request, {
          purchaseOrderId: purchaseOrder._id,
          lines: [], // auto receive all remaining quantities
          reference: purchaseOrder.orderNumber,
          note: 'Auto-received on creation',
        });
        purchaseOrder = result.purchaseOrder;
      } catch (receiveErr) {
        // If auto-receive fails, propagate an error
        const code = receiveErr.statusCode || 500;
        return reply.code(code).send({
          error:
            'Failed to auto-receive purchase order created with status RECEIVED',
          details: receiveErr.message,
        });
      }
    } else {
      // Populate for response
      await purchaseOrder.populate(
        'supplierId',
        'name contactName email phone'
      );
      await purchaseOrder.populate('items.productId', 'manufacturerRef name');
      await purchaseOrder.populate('createdBy', 'name email');
    }

    return reply.code(201).send({ purchaseOrder });
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
        error:
          'Purchase order with this order number already exists for this company',
      });
    }

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(400).send({
        error: 'Invalid ID format',
      });
    }

    return reply.code(500).send({
      error: 'Failed to create purchase order',
    });
  }
}

/**
 * Get all purchase orders with pagination and filtering
 * GET /purchases/orders?page=1&limit=20&status=PENDING&supplierId=xxx
 */
export async function getPurchaseOrders(request, reply) {
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
    };

    // Filter by status
    if (request.query.status) {
      const validStatuses = [
        'DRAFT',
        'PENDING',
        'PARTIAL',
        'RECEIVED',
        'CANCELLED',
      ];
      if (validStatuses.includes(request.query.status)) {
        filter.status = request.query.status;
      }
    }

    // Filter by supplierId
    if (request.query.supplierId) {
      if (!mongoose.Types.ObjectId.isValid(request.query.supplierId)) {
        return reply.code(400).send({
          error: 'Invalid supplierId format',
        });
      }

      // Verify supplier belongs to user's company
      // Use $ne: true to catch both false and undefined/null
      const supplier = await Supplier.findOne({
        _id: request.query.supplierId,
        ...companyFilter,
        isDeleted: { $ne: true },
      });

      if (!supplier) {
        return reply.code(404).send({
          error: 'Supplier not found',
        });
      }

      filter.supplierId = new mongoose.Types.ObjectId(request.query.supplierId);
    }

    // Get purchase orders
    const purchaseOrders = await PurchaseOrder.find(filter)
      .populate('supplierId', 'name contactName email phone')
      .populate('items.productId', 'manufacturerRef name')
      .populate('createdBy', 'name email')
      .populate('receivedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await PurchaseOrder.countDocuments(filter);

    return reply.send({
      purchaseOrders,
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
      error: 'Failed to fetch purchase orders',
    });
  }
}

/**
 * Get a single purchase order by ID
 * GET /purchases/orders/:id
 */
export async function getPurchaseOrder(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const purchaseOrder = await PurchaseOrder.findOne({
      _id: request.params.id,
      ...companyFilter,
      isDeleted: false,
    })
      .populate(
        'supplierId',
        'name contactName email phone address city country'
      )
      .populate(
        'items.productId',
        'manufacturerRef name salePrice purchasePrice stockQty'
      )
      .populate('createdBy', 'name email')
      .populate('receivedBy', 'name email')
      .lean();

    if (!purchaseOrder) {
      return reply.code(404).send({
        error: 'Purchase order not found',
      });
    }

    return reply.send({ purchaseOrder });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Purchase order not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to fetch purchase order',
    });
  }
}

/**
 * Receive products from a purchase order
 * POST /purchases/orders/:id/receive
 * Body: {
 *   lines: [{ productId: "PRODUCT_ID", qtyToReceive: 5 }, ...],
 *   reference: "INV-2025-001",
 *   note: "Réception partielle"
 * }
 */
export async function receivePurchaseOrder(request, reply) {
  try {
    const { lines, reference, note } = request.body || {};
    const result = await receivePurchaseCore(request, {
      purchaseOrderId: request.params.id,
      lines,
      reference,
      note,
    });
    return reply.send(result);
  } catch (error) {
    const status = error.statusCode || 500;
    // Only log server errors as errors; client errors (400-499) are expected validation errors
    if (status >= 500) {
      request.log.error(error);
      return reply.code(500).send({
        error: 'Failed to receive purchase order',
        details: error.message,
      });
    }
    // Log client errors at debug level to avoid cluttering logs with expected validation errors
    request.log.debug(
      { error: error.message, statusCode: status },
      'Purchase order reception validation error'
    );
    return reply.code(status).send({ error: error.message });
  }
}
