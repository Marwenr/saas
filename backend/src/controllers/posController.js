/**
 * POS (Point of Sale) controller for sales management
 */
import mongoose from 'mongoose';

import Customer from '../models/customer.model.js';
import Product from '../models/product.model.js';
import Sale from '../models/sale.model.js';
import StockMovement from '../models/stockMovement.model.js';
import { getCompanyFilter, getUserCompanyId } from '../utils/company.js';

/**
 * Create a new sale
 * POST /pos/sales
 * Body: {
 *   items: [{ productId, qty, unitPrice?, taxRate? }, ...],
 *   customerName?: string,
 *   paymentMethod?: 'CASH' | 'CHECK' | 'CREDIT',
 *   reference?: string,
 *   saleDate?: Date
 * }
 */
export async function createSale(request, reply) {
  let session = null;
  let useSession = false;

  const enableTransactions = process.env.MONGODB_TRANSACTIONS === 'true';
  if (enableTransactions) {
    session = await mongoose.startSession();
    try {
      await session.startTransaction();
      useSession = true;
    } catch (txnErr) {
      if (
        txnErr &&
        (txnErr.code === 20 || txnErr.name === 'MongoServerError')
      ) {
        try {
          await session.endSession();
        } catch (_err) {
          // Ignore cleanup errors
        }
        session = null;
        useSession = false;
      } else {
        throw txnErr;
      }
    }
  }

  try {
    const companyId = getUserCompanyId(request.user);

    // Ensure user has a companyId
    if (!companyId) {
      if (useSession && session) {
        await session.abortTransaction();
        await session.endSession();
      }
      return reply.code(403).send({
        error: 'User must be associated with a company to create sales',
      });
    }

    const {
      items,
      customerId,
      customerName,
      vehicleId,
      paymentMethod,
      reference,
      saleDate,
      isReturn,
      isReplacement,
      returnSaleId,
      loyaltyDiscount,
      loyaltyDiscountAmount,
    } = request.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      if (useSession && session) {
        await session.abortTransaction();
        await session.endSession();
      }
      return reply.code(400).send({
        error: 'Sale must have at least one item',
      });
    }

    // Validate paymentMethod
    if (paymentMethod && !['CASH', 'CHECK', 'CREDIT'].includes(paymentMethod)) {
      if (useSession && session) {
        await session.abortTransaction();
        await session.endSession();
      }
      return reply.code(400).send({
        error: 'paymentMethod must be "CASH", "CHECK", or "CREDIT"',
      });
    }

    // Validate all items and fetch products
    const productIds = items.map(item => item.productId).filter(Boolean);

    if (productIds.length !== items.length) {
      if (useSession && session) {
        await session.abortTransaction();
        await session.endSession();
      }
      return reply.code(400).send({
        error: 'All items must have a valid productId',
      });
    }

    // Validate ObjectId format for all productIds
    const invalidIds = productIds.filter(
      id => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      if (useSession && session) {
        await session.abortTransaction();
        await session.endSession();
      }
      return reply.code(400).send({
        error: 'Invalid productId format',
      });
    }

    // Fetch all products and ensure they belong to the user's company
    // Use $ne: true for isDeleted to catch both false and undefined/null
    let productsQuery = Product.find({
      _id: { $in: productIds },
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: { $ne: true },
      isActive: true,
    });
    if (useSession && session) productsQuery = productsQuery.session(session);
    const products = await productsQuery;

    if (products.length !== productIds.length) {
      if (useSession && session) {
        await session.abortTransaction();
        await session.endSession();
      }
      return reply.code(404).send({
        error:
          'One or more products not found or do not belong to your company',
      });
    }

    // Create a map for quick product lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // First, group items by productId to calculate total quantities needed
    const productQuantitiesNeeded = new Map();
    for (const item of items) {
      const { productId, qty } = item;

      // Validate required fields
      if (!productId || qty === undefined || qty <= 0) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(400).send({
          error: 'Each item must have productId and qty (qty > 0)',
        });
      }

      const productIdStr = productId.toString();
      const currentQty = productQuantitiesNeeded.get(productIdStr) || 0;
      productQuantitiesNeeded.set(productIdStr, currentQty + qty);
    }

    // Check stock availability for all products (using grouped quantities)
    for (const [
      productIdStr,
      totalQtyNeeded,
    ] of productQuantitiesNeeded.entries()) {
      const product = productMap.get(productIdStr);

      if (!product) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(404).send({
          error: `Product ${productIdStr} not found`,
        });
      }

      const currentStock = product.stockQty || 0;
      if (currentStock < totalQtyNeeded) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(400).send({
          error: `Insufficient stock for product ${product.name || product.sku}. Available: ${currentStock}, Requested: ${totalQtyNeeded}`,
        });
      }
    }

    // Validate and prepare sale items
    const saleItems = [];
    let totalExclTax = 0;
    let totalTax = 0;

    for (const item of items) {
      const {
        productId,
        qty,
        unitPrice,
        baseUnitPrice,
        discountRate,
        taxRate,
      } = item;

      // Get product
      const product = productMap.get(productId.toString());

      if (!product) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(404).send({
          error: `Product ${productId} not found`,
        });
      }

      // Use provided unitPrice or product.salePrice
      const itemUnitPrice =
        unitPrice !== undefined ? unitPrice : product.salePrice || 0;

      if (itemUnitPrice < 0) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(400).send({
          error: 'Item unitPrice must be greater than or equal to 0',
        });
      }

      // Get base unit price (before discount) if provided, otherwise use unitPrice
      const itemBaseUnitPrice =
        baseUnitPrice !== undefined ? baseUnitPrice : itemUnitPrice;

      // Get discount rate if provided, otherwise calculate from baseUnitPrice and unitPrice
      let itemDiscountRate = discountRate !== undefined ? discountRate : 0;
      if (
        itemDiscountRate === 0 &&
        itemBaseUnitPrice > 0 &&
        itemBaseUnitPrice !== itemUnitPrice
      ) {
        // Calculate discount rate from base price and final price
        itemDiscountRate =
          ((itemBaseUnitPrice - itemUnitPrice) / itemBaseUnitPrice) * 100;
      }

      // Get tax rate
      const itemTaxRate =
        taxRate !== undefined ? taxRate : product.taxRate || 0;

      // Calculate totals
      const itemTotalExclTax = qty * itemUnitPrice;
      const itemTax = itemTotalExclTax * (itemTaxRate / 100);
      const itemTotalInclTax = itemTotalExclTax + itemTax;

      saleItems.push({
        productId: product._id,
        sku: product.sku,
        name: product.name,
        qty,
        unitPrice: itemUnitPrice,
        baseUnitPrice: itemBaseUnitPrice > 0 ? itemBaseUnitPrice : undefined,
        discountRate: itemDiscountRate > 0 ? itemDiscountRate : undefined,
        taxRate: itemTaxRate,
        totalExclTax: itemTotalExclTax,
        totalInclTax: itemTotalInclTax,
      });

      totalExclTax += itemTotalExclTax;
      totalTax += itemTax;
    }

    // Calculate subtotal including tax
    const subtotalInclTax = totalExclTax + totalTax;

    // Fetch customer if customerId is provided (needed for loyalty discount, credit check, and vehicle info)
    let customer = null;
    if (customerId) {
      try {
        const customerObjectId = new mongoose.Types.ObjectId(customerId);
        let customerQuery = Customer.findOne({
          _id: customerObjectId,
          companyId: new mongoose.Types.ObjectId(companyId),
          isDeleted: { $ne: true },
        });
        if (useSession && session)
          customerQuery = customerQuery.session(session);
        customer = await customerQuery;

        if (!customer) {
          if (useSession && session) {
            await session.abortTransaction();
            await session.endSession();
          }
          return reply.code(404).send({
            error: 'Customer not found or does not belong to your company',
          });
        }
      } catch (_customerError) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(400).send({
          error: 'Invalid customerId format',
        });
      }
    }

    // Recalculate loyalty status to ensure it's up to date before applying discount
    // This syncs monthlyAveragePurchase from CustomerFinance and recalculates isLoyalClient
    if (customer) {
      try {
        // Sync monthlyAveragePurchase from CustomerFinance if available
        const CustomerFinance = mongoose.model('CustomerFinance');
        const customerFinance = await CustomerFinance.findOne({
          customerId: customer._id,
          companyId: new mongoose.Types.ObjectId(companyId),
        }).lean();

        if (
          customerFinance &&
          customerFinance.monthlyAveragePurchase !== undefined
        ) {
          // Recalculate loyalty status with updated monthlyAveragePurchase
          customer.calculateLoyaltyStatus(
            customerFinance.monthlyAveragePurchase
          );
          // Save the updated customer (but don't fail if save fails - discount is not critical)
          try {
            if (useSession && session) {
              await customer.save({ session });
            } else {
              await customer.save();
            }
          } catch (saveError) {
            // Log but continue - loyalty status update is not critical for sale creation
            request.log.warn(
              'Failed to save updated customer loyalty status:',
              saveError
            );
          }
        } else {
          // If CustomerFinance doesn't exist, still recalculate with current monthlyAveragePurchase
          customer.calculateLoyaltyStatus();
        }
      } catch (financeError) {
        // Log but continue - loyalty status calculation is not critical
        request.log.warn(
          'Failed to sync CustomerFinance for loyalty status:',
          financeError
        );
        // Still try to recalculate with current data
        customer.calculateLoyaltyStatus();
      }
    }

    // Apply loyalty discount automatically if customer is a loyal client
    // This applies to ALL payment methods (CASH, CHECK, CREDIT) - not just CREDIT
    let loyaltyDiscountApplied = 0;
    let loyaltyDiscountAmountApplied = 0;
    let totalInclTax = subtotalInclTax;

    if (customer && customer.isEligibleForLoyalty() && customer.isLoyalClient) {
      // Apply loyalty discount automatically (calculated dynamically based on monthlyAveragePurchase)
      // Discount ranges from 1% to 10% based on purchase amount
      loyaltyDiscountApplied = customer.loyaltyDiscount || 0;
      loyaltyDiscountAmountApplied =
        (subtotalInclTax * loyaltyDiscountApplied) / 100;
      totalInclTax = subtotalInclTax - loyaltyDiscountAmountApplied;
    } else if (
      loyaltyDiscount &&
      loyaltyDiscount > 0 &&
      loyaltyDiscountAmount &&
      loyaltyDiscountAmount > 0
    ) {
      // Fallback: If frontend provided loyalty discount but customer check didn't apply it,
      // validate and use frontend values (for edge cases)
      const expectedDiscountAmount = (subtotalInclTax * loyaltyDiscount) / 100;
      // Allow small floating point differences (0.01 TND tolerance)
      if (Math.abs(loyaltyDiscountAmount - expectedDiscountAmount) < 0.01) {
        loyaltyDiscountApplied = loyaltyDiscount;
        loyaltyDiscountAmountApplied = loyaltyDiscountAmount;
        totalInclTax = subtotalInclTax - loyaltyDiscountAmountApplied;
      } else {
        // If amounts don't match, recalculate (safety check)
        loyaltyDiscountApplied = loyaltyDiscount;
        loyaltyDiscountAmountApplied =
          (subtotalInclTax * loyaltyDiscount) / 100;
        totalInclTax = subtotalInclTax - loyaltyDiscountAmountApplied;
      }
    }

    // Validate credit limit if payment method is CREDIT (must be after totalInclTax is calculated)
    if (paymentMethod === 'CREDIT' && customerId) {
      const { getCustomerFinanceSummary } = await import(
        '../utils/customerFinance.js'
      );
      try {
        const finance = await getCustomerFinanceSummary(customerId, companyId);
        const newBalance = (finance.balance || 0) + totalInclTax;

        // Check if credit limit is exceeded
        if (finance.creditLimit > 0 && newBalance > finance.creditLimit) {
          if (useSession && session) {
            await session.abortTransaction();
            await session.endSession();
          }
          return reply.code(400).send({
            error: `Limite de crédit dépassée. Limite: ${finance.creditLimit.toFixed(2)} TND, Solde actuel: ${finance.balance.toFixed(2)} TND, Nouveau solde: ${newBalance.toFixed(2)} TND`,
          });
        }
      } catch (financeError) {
        request.log.error('Failed to check credit limit:', financeError);
        // Continue anyway - credit check is not critical if it fails
      }
    }

    // Fetch vehicle info if vehicleId is provided
    let vehicleInfo = null;
    if (vehicleId) {
      // Validate vehicleId
      if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(400).send({
          error: 'Invalid vehicleId format',
        });
      }

      // If customerId is provided, use already fetched customer to validate vehicle
      if (customerId && customer) {
        // Find vehicle in customer's vehicles array
        const vehicle = customer.vehicles?.find(
          v => v._id?.toString() === vehicleId.toString()
        );

        if (vehicle) {
          vehicleInfo = {
            vin: vehicle.vin || '',
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            year: vehicle.year || null,
          };
        }
      }
    }

    // Validate return/replacement fields
    if (isReturn && !returnSaleId) {
      if (useSession && session) {
        await session.abortTransaction();
        await session.endSession();
      }
      return reply.code(400).send({
        error: 'returnSaleId is required when isReturn is true',
      });
    }

    if (returnSaleId && !mongoose.Types.ObjectId.isValid(returnSaleId)) {
      if (useSession && session) {
        await session.abortTransaction();
        await session.endSession();
      }
      return reply.code(400).send({
        error: 'Invalid returnSaleId format',
      });
    }

    // Create sale document
    const saleData = {
      companyId: new mongoose.Types.ObjectId(companyId),
      createdBy: new mongoose.Types.ObjectId(request.user.userId),
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      reference,
      customerId: customerId
        ? new mongoose.Types.ObjectId(customerId)
        : undefined,
      customerName,
      vehicleId: vehicleId ? new mongoose.Types.ObjectId(vehicleId) : undefined,
      vehicleInfo,
      paymentMethod: paymentMethod || 'CASH',
      items: saleItems,
      totalExclTax,
      totalTax,
      totalInclTax,
      // Include loyalty discount information if applicable
      loyaltyDiscount:
        loyaltyDiscountApplied > 0 ? loyaltyDiscountApplied : undefined,
      loyaltyDiscountAmount:
        loyaltyDiscountAmountApplied > 0
          ? loyaltyDiscountAmountApplied
          : undefined,
      isReturn: isReturn === true,
      isReplacement: isReplacement === true,
      returnSaleId: returnSaleId
        ? new mongoose.Types.ObjectId(returnSaleId)
        : undefined,
    };

    let sale;
    if (useSession && session) {
      sale = await Sale.create([saleData], { session });
      sale = sale[0];
    } else {
      sale = await Sale.create(saleData);
    }

    // Decrement stock and create stock movements
    // Group items by productId to handle multiple items of the same product
    const productQuantities = new Map();
    for (const item of items) {
      const productIdStr = item.productId.toString();
      const currentQty = productQuantities.get(productIdStr) || 0;
      productQuantities.set(productIdStr, currentQty + item.qty);
    }

    const stockMovements = [];

    for (const [productIdStr, totalQty] of productQuantities.entries()) {
      // Reload product from DB to get latest stock (important for race condition prevention)
      const productObjectId = new mongoose.Types.ObjectId(productIdStr);
      let productQuery = Product.findOne({
        _id: productObjectId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: { $ne: true },
      });
      if (useSession && session) productQuery = productQuery.session(session);
      const product = await productQuery;

      if (!product) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(404).send({
          error: `Product ${productIdStr} not found`,
        });
      }

      // Double-check stock availability with latest DB values
      const beforeQty = product.stockQty || 0;
      if (beforeQty < totalQty) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(400).send({
          error: `Insufficient stock for product ${product.name || product.sku}. Available: ${beforeQty}, Requested: ${totalQty}`,
        });
      }

      const afterQty = beforeQty - totalQty;

      // Ensure afterQty is not negative (safety check)
      if (afterQty < 0) {
        if (useSession && session) {
          await session.abortTransaction();
          await session.endSession();
        }
        return reply.code(400).send({
          error: `Stock calculation error for product ${product.name || product.sku}. Cannot have negative stock.`,
        });
      }

      // Update product stock
      product.stockQty = afterQty;
      await product.save(useSession && session ? { session } : undefined);

      // Create stock movement
      const movementData = {
        companyId: new mongoose.Types.ObjectId(companyId),
        productId: product._id,
        type: 'OUT',
        quantity: totalQty,
        beforeQty,
        afterQty,
        reason: `Counter sale - ${product.name || product.sku}`,
        source: 'sale',
        reference: reference || sale._id.toString(),
        createdBy: new mongoose.Types.ObjectId(request.user.userId),
      };

      let movement;
      if (useSession && session) {
        movement = await StockMovement.create([movementData], { session });
        movement = movement[0];
      } else {
        movement = await StockMovement.create(movementData);
      }

      stockMovements.push(movement);
    }

    // Commit transaction if used
    if (useSession && session) {
      await session.commitTransaction();
      await session.endSession();
    }

    // Populate sale for response
    await sale.populate('createdBy', 'name email');
    await sale.populate('items.productId', 'sku name');

    // IMPORTANT: Update customer financial stats and loyalty status AFTER sale is committed
    // This MUST be done for ALL sales (CASH, CHECK, CREDIT) to update monthlyAveragePurchase
    // and recalculate loyalty status
    if (sale.customerId) {
      try {
        const { calculateCustomerFinancialStats } = await import(
          '../utils/customerFinance.js'
        );
        // This will:
        // 1. Recalculate monthlyAveragePurchase from all sales (including the one just created)
        // 2. Update CustomerFinance.monthlyAveragePurchase
        // 3. Sync to Customer.monthlyAveragePurchase
        // 4. Recalculate loyalty status (isLoyalClient, loyaltyDiscount)
        await calculateCustomerFinancialStats(
          sale.customerId.toString(),
          companyId
        );
        request.log.info(
          `Updated customer financial stats and loyalty status for customer ${sale.customerId} after sale ${sale._id}`
        );
      } catch (financeError) {
        // Log error but don't fail the sale - financial stats update is not critical
        request.log.error(
          'Failed to update customer financial stats after sale:',
          financeError
        );
      }
    }

    // Create invoice if customerId is provided and payment is not CASH (CREDIT, CHECK, etc.)
    // Note: calculateCustomerFinancialStats is already called above, so this will recalculate again
    // but that's fine as it's idempotent and ensures data consistency
    let invoice = null;
    if (sale.customerId && sale.paymentMethod !== 'CASH') {
      try {
        const { createInvoiceFromSale } = await import(
          '../utils/customerFinance.js'
        );
        invoice = await createInvoiceFromSale(
          sale,
          sale.customerId.toString(),
          companyId
        );
        // createInvoiceFromSale also calls calculateCustomerFinancialStats
        // This is fine - it ensures data is up to date after invoice creation
      } catch (invoiceError) {
        request.log.error('Failed to create invoice:', invoiceError);
        // Don't fail the sale if invoice creation fails
      }
    }

    return reply.code(201).send({
      sale,
      invoice,
      stockMovements: stockMovements.map(m => ({
        id: m._id,
        productId: m.productId,
        quantity: m.quantity,
        beforeQty: m.beforeQty,
        afterQty: m.afterQty,
      })),
    });
  } catch (error) {
    if (useSession && session) {
      try {
        await session.abortTransaction();
        await session.endSession();
      } catch (_err) {
        // Ignore cleanup errors
      }
    }

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
      error: 'Failed to create sale',
      details: error.message,
    });
  }
}

/**
 * Get all sales with pagination and date filtering
 * GET /pos/sales?page=1&limit=20&startDate=2024-01-01&endDate=2024-12-31&paymentMethod=CASH
 */
export async function getSales(request, reply) {
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

    // Date filtering (use saleDate, fallback to createdAt)
    if (request.query.startDate || request.query.endDate) {
      filter.saleDate = {};

      if (request.query.startDate) {
        const startDate = new Date(request.query.startDate);
        if (isNaN(startDate.getTime())) {
          return reply.code(400).send({
            error: 'Invalid startDate format. Use YYYY-MM-DD',
          });
        }
        // Set to start of day
        startDate.setHours(0, 0, 0, 0);
        filter.saleDate.$gte = startDate;
      }

      if (request.query.endDate) {
        const endDate = new Date(request.query.endDate);
        if (isNaN(endDate.getTime())) {
          return reply.code(400).send({
            error: 'Invalid endDate format. Use YYYY-MM-DD',
          });
        }
        // Set to end of day
        endDate.setHours(23, 59, 59, 999);
        filter.saleDate.$lte = endDate;
      }
    }

    // Optional filter by paymentMethod
    if (
      request.query.paymentMethod &&
      ['CASH', 'CHECK', 'CREDIT'].includes(request.query.paymentMethod)
    ) {
      filter.paymentMethod = request.query.paymentMethod;
    }

    // Optional filter by customerId (query param: client)
    if (request.query.client) {
      const customerId = request.query.client;
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return reply.code(400).send({
          error: 'Invalid customerId format',
        });
      }
      filter.customerId = new mongoose.Types.ObjectId(customerId);
    }

    // Get sales
    const sales = await Sale.find(filter)
      .populate('createdBy', 'name email')
      .populate('items.productId', 'sku name')
      .populate('customerId', 'firstName lastName internalCode')
      .sort({ saleDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Sale.countDocuments(filter);

    return reply.send({
      sales,
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
      error: 'Failed to fetch sales',
    });
  }
}

/**
 * Get a single sale by ID
 * GET /pos/sales/:id
 */
export async function getSale(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    const sale = await Sale.findOne({
      _id: request.params.id,
      ...companyFilter,
    })
      .populate('createdBy', 'name email')
      .populate('items.productId', 'sku name stockQty')
      .populate('customerId', 'firstName lastName internalCode')
      .populate('returnSaleId', 'reference saleDate totalInclTax')
      .lean();

    if (!sale) {
      return reply.code(404).send({
        error: 'Sale not found',
      });
    }

    return reply.send({ sale });
  } catch (error) {
    request.log.error(error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return reply.code(404).send({
        error: 'Sale not found',
      });
    }

    return reply.code(500).send({
      error: 'Failed to fetch sale',
    });
  }
}
