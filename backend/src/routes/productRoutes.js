/**
 * Product routes
 */
import mongoose from 'mongoose';

import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductSuppliers,
} from '../controllers/productController.js';
import Brand from '../models/brand.model.js';
import Product from '../models/product.model.js';
import PurchaseOrder from '../models/purchaseOrder.model.js';
import Sale from '../models/sale.model.js';
import { authenticate } from '../utils/auth.js';
import { getUserCompanyId } from '../utils/company.js';

async function productRoutes(fastify, _options) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get all products (with pagination and search)
  fastify.get('/', getProducts);

  // Get a single product by ID
  fastify.get('/:id', getProduct);

  // Get suppliers for a product
  fastify.get('/:id/suppliers', getProductSuppliers);

  // Product analytics
  fastify.get('/:id/analytics', async (request, reply) => {
    try {
      const { id } = request.params;
      const companyIdStr = getUserCompanyId(request.user);
      if (!companyIdStr) {
        return reply.code(403).send({ message: 'Unauthorized' });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return reply.code(400).send({ message: 'Invalid product id' });
      }

      if (!mongoose.Types.ObjectId.isValid(companyIdStr)) {
        return reply.code(403).send({ message: 'Invalid company id' });
      }

      // 1) Load product
      const product = await Product.findOne({
        _id: new mongoose.Types.ObjectId(id),
        companyId: new mongoose.Types.ObjectId(companyIdStr),
        isDeleted: { $ne: true },
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
        return reply.code(404).send({ message: 'Product not found' });
      }

      // 2) Supplier stats from product.supplierInfos
      const supplierInfos = Array.isArray(product.supplierInfos)
        ? product.supplierInfos
        : [];

      let recommended = null;
      if (supplierInfos.length > 0) {
        const preferred = supplierInfos.filter(s => s.isPreferred);
        if (preferred.length > 0) {
          recommended = preferred.reduce((best, curr) => {
            if (!best) return curr;
            if ((curr.lastPurchasePrice || 0) < (best.lastPurchasePrice || 0)) {
              return curr;
            }
            return best;
          }, null);
        } else {
          recommended = supplierInfos.reduce((best, curr) => {
            if (!best) return curr;
            if ((curr.lastPurchasePrice || 0) < (best.lastPurchasePrice || 0)) {
              return curr;
            }
            return best;
          }, null);
        }
      }

      const supplierStats = {
        suppliers: supplierInfos,
        recommendedSupplierId: recommended ? recommended.supplierId : null,
        recommendedSupplier: recommended || null,
      };

      // 3) Purchase history & stats
      const limitHistory = 10;
      const productObjectId = new mongoose.Types.ObjectId(product._id);
      const companyObjectId = new mongoose.Types.ObjectId(companyIdStr);

      // Adapted to PurchaseOrder schema (items.quantity, items.receivedQuantity, items.unitPrice, items.subtotal)
      const purchaseAgg = await PurchaseOrder.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            isDeleted: { $ne: true },
            status: { $in: ['RECEIVED', 'PARTIAL'] },
            'items.productId': productObjectId,
          },
        },
        { $unwind: '$items' },
        {
          $match: {
            'items.productId': productObjectId,
          },
        },
        {
          $lookup: {
            from: 'suppliers',
            localField: 'supplierId',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        {
          $unwind: {
            path: '$supplier',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            orderDate: 1,
            status: 1,
            supplierId: 1,
            'supplier.name': 1,
            'items.quantity': 1,
            'items.receivedQuantity': 1,
            'items.unitPrice': 1,
            'items.subtotal': 1,
          },
        },
        { $sort: { orderDate: -1 } },
      ]);

      let totalPurchaseQty = 0;
      let totalPurchaseAmount = 0;
      purchaseAgg.forEach(row => {
        const qty = row.items.receivedQuantity || row.items.quantity || 0;
        const price = row.items.unitPrice || 0;
        totalPurchaseQty += qty;
        totalPurchaseAmount += qty * price;
      });

      const averagePurchasePrice =
        totalPurchaseQty > 0 ? totalPurchaseAmount / totalPurchaseQty : 0;

      const purchaseHistory = purchaseAgg.slice(0, limitHistory).map(row => ({
        orderDate: row.orderDate,
        status: row.status,
        supplierId: row.supplierId,
        supplierName: row.supplier?.name || null,
        qtyOrdered: row.items.quantity || 0,
        qtyReceived: row.items.receivedQuantity || 0,
        unitPrice: row.items.unitPrice || 0,
        totalExclTax: row.items.subtotal || 0,
      }));

      const purchaseStats = {
        totalQty: totalPurchaseQty,
        totalAmount: totalPurchaseAmount,
        averagePrice: averagePurchasePrice,
        historyLimit: limitHistory,
      };

      // 4) Sales history & stats using Sale model (items.productId, items.qty, items.unitPrice)
      const salesAgg = await Sale.aggregate([
        {
          $match: {
            companyId: companyObjectId,
            'items.productId': productObjectId,
          },
        },
        { $unwind: '$items' },
        {
          $match: {
            'items.productId': productObjectId,
          },
        },
        {
          $project: {
            createdAt: 1,
            customerName: 1,
            'items.qty': 1,
            'items.unitPrice': 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ]);

      let totalSalesQty = 0;
      let totalSalesAmount = 0;
      salesAgg.forEach(row => {
        const qty = row.items.qty || 0;
        const price = row.items.unitPrice || 0;
        totalSalesQty += qty;
        totalSalesAmount += qty * price;
      });

      const averageSalePrice =
        totalSalesQty > 0 ? totalSalesAmount / totalSalesQty : 0;

      const salesHistory = salesAgg.slice(0, limitHistory).map(row => ({
        date: row.createdAt,
        customerName: row.customerName || null,
        qty: row.items.qty || 0,
        unitPrice: row.items.unitPrice || 0,
      }));

      const salesStats = {
        totalQty: totalSalesQty,
        totalAmount: totalSalesAmount,
        averagePrice: averageSalePrice,
        historyLimit: limitHistory,
      };

      return reply.send({
        product,
        supplierStats,
        purchaseStats,
        purchaseHistory,
        salesStats,
        salesHistory,
      });
    } catch (error) {
      request.log.error(error);
      return reply
        .code(500)
        .send({ message: 'Failed to load product analytics' });
    }
  });

  // Create a new product
  fastify.post('/', createProduct);

  // Update a product
  fastify.put('/:id', updateProduct);

  // Soft delete a product
  fastify.delete('/:id', deleteProduct);
}

export default productRoutes;
