import mongoose from 'mongoose';

import Product from '../models/product.model.js';
import PurchaseOrder from '../models/purchaseOrder.model.js';
import StockMovement from '../models/stockMovement.model.js';
import { getUserCompanyId } from '../utils/company.js';
import { calculateRecommendedSalePrice } from '../utils/pricing.js';

/**
 * Core reception logic used by:
 * - POST /purchases/orders/:id/receive
 * - createPurchaseOrder when status === 'RECEIVED'
 *
 * Returns: { purchaseOrder, stockMovements }
 */
export async function receivePurchaseCore(
  request,
  { purchaseOrderId, lines, reference, note }
) {
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
        } catch {
          // Ignore errors when ending session
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
    if (!companyId) {
      throw Object.assign(
        new Error(
          'User must be associated with a company to receive purchase orders'
        ),
        { statusCode: 403 }
      );
    }

    // Load PO
    let poQuery = PurchaseOrder.findOne({
      _id: purchaseOrderId,
      companyId: new mongoose.Types.ObjectId(companyId),
      isDeleted: false,
    });
    if (useSession && session) poQuery = poQuery.session(session);
    const purchaseOrder = await poQuery;

    if (!purchaseOrder) {
      throw Object.assign(new Error('Purchase order not found'), {
        statusCode: 404,
      });
    }

    // Allow processing even if status is 'RECEIVED' as long as not fully received yet
    const isAlreadyFullyReceived = purchaseOrder.items.every(
      it => (it.receivedQuantity || 0) >= (it.quantity || 0)
    );
    if (isAlreadyFullyReceived) {
      throw Object.assign(
        new Error('Purchase order is already fully received'),
        { statusCode: 400 }
      );
    }

    // Build effective lines (if none provided, receive all remaining)
    let effectiveLines = Array.isArray(lines) ? [...lines] : [];
    if (!effectiveLines.length) {
      effectiveLines = purchaseOrder.items
        .map(it => ({
          productId: it.productId.toString(),
          qtyToReceive: Math.max(
            0,
            (it.quantity || 0) - (it.receivedQuantity || 0)
          ),
        }))
        .filter(l => l.qtyToReceive > 0);
    }

    // Validate lines
    for (const line of effectiveLines) {
      if (!line.productId || line.qtyToReceive === undefined) {
        throw Object.assign(
          new Error('Each line must have productId and qtyToReceive'),
          { statusCode: 400 }
        );
      }
      if (!mongoose.Types.ObjectId.isValid(line.productId)) {
        throw Object.assign(
          new Error(`Invalid productId format: ${line.productId}`),
          { statusCode: 400 }
        );
      }
      if (line.qtyToReceive <= 0) {
        throw Object.assign(new Error('qtyToReceive must be greater than 0'), {
          statusCode: 400,
        });
      }
    }

    const stockMovements = [];
    const processedProducts = new Map();
    let hasChanges = false;

    const productQuantities = new Map();
    const productOrderItems = new Map();

    for (const line of effectiveLines) {
      const { productId, qtyToReceive } = line;
      const orderItem = purchaseOrder.items.find(
        item => item.productId.toString() === productId
      );
      if (!orderItem) {
        throw Object.assign(
          new Error(`Product ${productId} not found in this purchase order`),
          { statusCode: 400 }
        );
      }
      const currentQty = productQuantities.get(productId) || 0;
      productQuantities.set(productId, currentQty + qtyToReceive);
      productOrderItems.set(productId, orderItem);
    }

    // Preload supplier once for denormalized name
    let supplierNameCache = null;
    if (purchaseOrder.supplierId) {
      try {
        // Lazy import to avoid circular deps at top
        const { default: Supplier } = await import(
          '../models/supplier.model.js'
        );
        const supplierDoc = await Supplier.findById(purchaseOrder.supplierId)
          .select('name')
          .lean();
        supplierNameCache = supplierDoc ? supplierDoc.name : null;
      } catch {
        // Ignore errors when loading supplier name
      }
    }

    for (const [productId, totalQtyToReceive] of productQuantities) {
      const productObjectId = new mongoose.Types.ObjectId(productId);
      const orderItem = productOrderItems.get(productId);

      const remainingToReceive =
        orderItem.quantity - orderItem.receivedQuantity;
      if (totalQtyToReceive > remainingToReceive) {
        throw Object.assign(
          new Error(
            `Cannot receive ${totalQtyToReceive} units for product ${productId}. Remaining to receive: ${remainingToReceive}`
          ),
          { statusCode: 400 }
        );
      }

      orderItem.receivedQuantity += totalQtyToReceive;
      hasChanges = true;

      let product;
      let initialStockQty;
      if (processedProducts.has(productId)) {
        const cached = processedProducts.get(productId);
        product = cached.product;
        initialStockQty = cached.initialStockQty;
      } else {
        let prodQuery = Product.findOne({
          _id: productObjectId,
          companyId: new mongoose.Types.ObjectId(companyId),
          isDeleted: false,
        });
        if (useSession && session) prodQuery = prodQuery.session(session);
        product = await prodQuery;
        if (!product) {
          throw Object.assign(new Error(`Product not found: ${productId}`), {
            statusCode: 404,
          });
        }
        initialStockQty = product.stockQty || 0;
        processedProducts.set(productId, { product, initialStockQty });
      }

      const beforeQty = initialStockQty;
      const afterQty = beforeQty + totalQtyToReceive;

      const existingPrice = product.purchasePrice || 0;
      const newPrice = orderItem.unitPrice;
      let newAveragePrice = newPrice;
      if (beforeQty > 0 && existingPrice > 0) {
        newAveragePrice =
          (beforeQty * existingPrice + totalQtyToReceive * newPrice) /
          (beforeQty + totalQtyToReceive);
      } else if (beforeQty === 0) {
        newAveragePrice = newPrice;
      }
      product.purchasePrice = newAveragePrice;
      product.lastPurchasePrice = newPrice;

      // Calculate recommended sale price using HYBRID pricing mode
      // This ensures target margin on average cost while guaranteeing minimum margin on last cost
      // The price is automatically updated everywhere when a purchase order is received
      const recommendedPrice = calculateRecommendedSalePrice(product);
      if (recommendedPrice > 0) {
        // Round to 2 decimal places for consistency
        product.salePrice = Math.round(recommendedPrice * 100) / 100;
      }

      product.stockQty = afterQty;

      // Maintain per-supplier pricing info on the product
      try {
        const supplierId = purchaseOrder.supplierId;
        if (supplierId) {
          const supplierIdStr = supplierId.toString();
          if (!Array.isArray(product.supplierInfos)) {
            product.supplierInfos = [];
          }
          const idx = product.supplierInfos.findIndex(
            si => si.supplierId && si.supplierId.toString() === supplierIdStr
          );
          const now = new Date();
          if (idx === -1) {
            // New supplier entry
            product.supplierInfos.push({
              supplierId,
              supplierName: supplierNameCache || undefined,
              lastPurchasePrice: newPrice,
              averagePurchasePrice: newPrice,
              totalQtyPurchased: totalQtyToReceive,
              lastPurchaseDate: now,
              // isPreferred defaults to false
            });
          } else {
            // Update existing entry
            const entry = product.supplierInfos[idx];
            const prevAvg = entry.averagePurchasePrice || 0;
            const prevQty = entry.totalQtyPurchased || 0;
            const newTotalQty = prevQty + totalQtyToReceive;
            let newSupplierAvg = newPrice;
            if (prevQty > 0 && prevAvg > 0) {
              newSupplierAvg =
                (prevQty * prevAvg + totalQtyToReceive * newPrice) /
                newTotalQty;
            }
            entry.supplierName = supplierNameCache || entry.supplierName;
            entry.lastPurchasePrice = newPrice;
            entry.averagePurchasePrice = newSupplierAvg;
            entry.totalQtyPurchased = newTotalQty;
            entry.lastPurchaseDate = now;
            product.supplierInfos[idx] = entry;
          }
        }
      } catch {
        // Ignore errors when updating supplier info
      }

      await product.save(useSession && session ? { session } : undefined);

      const movementReason = note
        ? `Purchase order receipt: ${purchaseOrder.orderNumber} - ${note}`
        : `Purchase order receipt: ${purchaseOrder.orderNumber}`;
      const movementReference = reference || purchaseOrder.orderNumber;

      const movement = await StockMovement.create(
        [
          {
            companyId: new mongoose.Types.ObjectId(companyId),
            productId: productObjectId,
            type: 'IN',
            quantity: totalQtyToReceive,
            beforeQty,
            afterQty,
            reason: movementReason,
            source: 'purchase',
            reference: movementReference,
            createdBy: new mongoose.Types.ObjectId(request.user.userId),
          },
        ],
        useSession && session ? { session } : undefined
      );
      stockMovements.push(movement[0]);
    }

    if (!hasChanges) {
      const alreadyFullyReceived = purchaseOrder.items.every(
        it => (it.receivedQuantity || 0) >= (it.quantity || 0)
      );
      if (alreadyFullyReceived) {
        purchaseOrder.status = 'RECEIVED';
        purchaseOrder.receivedAt = new Date();
        purchaseOrder.receivedBy = new mongoose.Types.ObjectId(
          request.user.userId
        );
        await purchaseOrder.save(
          useSession && session ? { session } : undefined
        );
        if (useSession && session) {
          await session.commitTransaction();
          await session.endSession();
        }
        await purchaseOrder.populate(
          'supplierId',
          'name contactName email phone'
        );
        await purchaseOrder.populate('items.productId', 'sku name');
        await purchaseOrder.populate('createdBy', 'name email');
        await purchaseOrder.populate('receivedBy', 'name email');
        return { purchaseOrder, stockMovements: [] };
      }
      throw Object.assign(new Error('No items were received'), {
        statusCode: 400,
      });
    }

    const allItemsReceived = purchaseOrder.items.every(
      item => item.receivedQuantity >= item.quantity
    );
    const someItemsReceived = purchaseOrder.items.some(
      item => item.receivedQuantity > 0
    );

    if (allItemsReceived) {
      purchaseOrder.status = 'RECEIVED';
      purchaseOrder.receivedAt = new Date();
      purchaseOrder.receivedBy = new mongoose.Types.ObjectId(
        request.user.userId
      );
    } else if (someItemsReceived) {
      purchaseOrder.status = 'PARTIAL';
    }

    await purchaseOrder.save(useSession && session ? { session } : undefined);

    if (useSession && session) {
      await session.commitTransaction();
      await session.endSession();
    }

    await purchaseOrder.populate('supplierId', 'name contactName email phone');
    await purchaseOrder.populate('items.productId', 'sku name');
    await purchaseOrder.populate('createdBy', 'name email');
    await purchaseOrder.populate('receivedBy', 'name email');

    return {
      purchaseOrder,
      stockMovements: stockMovements.map(m => ({
        id: m._id,
        productId: m.productId,
        quantity: m.quantity,
        beforeQty: m.beforeQty,
        afterQty: m.afterQty,
        reference: m.reference,
      })),
    };
  } catch (err) {
    if (useSession && session) {
      try {
        await session.abortTransaction();
        await session.endSession();
      } catch {
        // Ignore errors when aborting transaction
      }
    }
    throw err;
  }
}
