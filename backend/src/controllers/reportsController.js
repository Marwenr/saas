/**
 * Reports controller
 */
import mongoose from 'mongoose';

import Product from '../models/product.model.js';
import PurchaseOrder from '../models/purchaseOrder.model.js';
import Sale from '../models/sale.model.js';
import { getCompanyFilter } from '../utils/company.js';

function computeRecommendedSupplierEntry(supplierInfos) {
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
  return best;
}

/**
 * GET /reports/recommended-suppliers
 * Returns a list of products with their recommended supplier summary
 */
export async function getRecommendedSuppliersReport(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);
    const products = await Product.find({
      ...companyFilter,
      isDeleted: false,
    })
      .select('sku name supplierInfos')
      .lean();

    const data = products.map(p => {
      const rec = computeRecommendedSupplierEntry(p.supplierInfos || []);
      return {
        productId: p._id,
        sku: p.sku,
        name: p.name,
        recommendedSupplierId: rec && rec.supplierId ? rec.supplierId : null,
        recommendedSupplierName:
          rec && rec.supplierName ? rec.supplierName : null,
        recommendedLastPrice:
          rec && typeof rec.lastPurchasePrice === 'number'
            ? rec.lastPurchasePrice
            : null,
        recommendedAveragePrice:
          rec && typeof rec.averagePurchasePrice === 'number'
            ? rec.averagePurchasePrice
            : null,
        suppliersCount: Array.isArray(p.supplierInfos)
          ? p.supplierInfos.length
          : 0,
      };
    });

    return reply.send({ items: data });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Failed to generate recommended suppliers report',
    });
  }
}

/**
 * Compute date range based on period
 */
function computeDateRange(period, from, to) {
  const now = new Date();
  let startDate;
  let endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  switch (period) {
    case 'day':
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      break;
    case 'week': {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      break;
    }
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case 'range':
      if (!from || !to) {
        throw new Error(
          'from and to dates are required when period is "range"'
        );
      }
      startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      // Default to month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  return { startDate, endDate };
}

/**
 * GET /reports/sales-products
 * Returns analytics about best-selling and most profitable products
 * Query params:
 *   - period: "day" | "week" | "month" | "year" | "range" (default: "month")
 *   - from: ISO date string YYYY-MM-DD (required if period="range")
 *   - to: ISO date string YYYY-MM-DD (required if period="range")
 *   - sortBy: "qty" | "revenue" | "margin" (default: "qty")
 *   - limit: number (default: 50, max: 200)
 */
export async function getSalesProductsReport(request, reply) {
  try {
    const companyFilterRaw = getCompanyFilter(request.user);

    // Convert companyId to ObjectId if it's a string (for MongoDB consistency)
    // This matches the pattern used in /products/:id/analytics
    const companyFilter = {};
    if (companyFilterRaw.companyId) {
      if (typeof companyFilterRaw.companyId === 'string') {
        companyFilter.companyId = new mongoose.Types.ObjectId(
          companyFilterRaw.companyId
        );
      } else {
        companyFilter.companyId = companyFilterRaw.companyId;
      }
    } else if (Object.keys(companyFilterRaw).length === 0) {
      // Platform admin - no filter needed
      Object.assign(companyFilter, companyFilterRaw);
    } else {
      Object.assign(companyFilter, companyFilterRaw);
    }

    // Parse query parameters
    const period = request.query.period || 'month';
    const from = request.query.from;
    const to = request.query.to;
    const sortBy = request.query.sortBy || 'qty';
    const limit = Math.min(parseInt(request.query.limit) || 50, 200);

    // Validate period
    if (!['day', 'week', 'month', 'year', 'range'].includes(period)) {
      return reply.code(400).send({
        error: 'Invalid period. Must be one of: day, week, month, year, range',
      });
    }

    // Validate sortBy
    if (!['qty', 'revenue', 'margin'].includes(sortBy)) {
      return reply.code(400).send({
        error: 'Invalid sortBy. Must be one of: qty, revenue, margin',
      });
    }

    // Compute date range
    let dateRange;
    try {
      dateRange = computeDateRange(period, from, to);
    } catch (error) {
      return reply.code(400).send({
        error: error.message,
      });
    }

    // Build aggregation pipeline
    const pipeline = [
      // Match sales for the company and date range
      // Split into two $match stages for better performance
      {
        $match: {
          ...companyFilter,
        },
      },
      // Add effectiveDate field for easier filtering
      {
        $addFields: {
          effectiveDate: {
            $ifNull: ['$saleDate', '$createdAt'],
          },
        },
      },
      // Filter by date range using effectiveDate
      {
        $match: {
          effectiveDate: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate,
          },
        },
      },
      // Unwind items array
      {
        $unwind: '$items',
      },
      // Compute item revenues from qty, unitPrice, taxRate if not present
      {
        $addFields: {
          itemTotalExclTax: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$items.totalExclTax', 0] },
                  { $ne: ['$items.totalExclTax', null] },
                ],
              },
              then: '$items.totalExclTax',
              else: {
                $multiply: [
                  { $ifNull: ['$items.qty', 0] },
                  { $ifNull: ['$items.unitPrice', 0] },
                ],
              },
            },
          },
          itemTotalInclTax: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$items.totalInclTax', 0] },
                  { $ne: ['$items.totalInclTax', null] },
                ],
              },
              then: '$items.totalInclTax',
              else: {
                $let: {
                  vars: {
                    exclTax: {
                      $multiply: [
                        { $ifNull: ['$items.qty', 0] },
                        { $ifNull: ['$items.unitPrice', 0] },
                      ],
                    },
                    taxRate: { $ifNull: ['$items.taxRate', 0] },
                  },
                  in: {
                    $multiply: [
                      '$$exclTax',
                      { $add: [1, { $divide: ['$$taxRate', 100] }] },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      // Group by productId
      {
        $group: {
          _id: '$items.productId',
          totalQty: { $sum: { $ifNull: ['$items.qty', 0] } },
          totalRevenueExcl: { $sum: '$itemTotalExclTax' },
          totalRevenueIncl: { $sum: '$itemTotalInclTax' },
        },
      },
      // Lookup product details
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      // Unwind product (should be single match)
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Add calculated fields
      {
        $addFields: {
          productName: {
            $ifNull: ['$product.name', 'Unknown Product'],
          },
          productSku: {
            $ifNull: ['$product.sku', 'N/A'],
          },
          purchasePrice: {
            $ifNull: ['$product.purchasePrice', 0],
          },
          // Calculate total cost (using current purchasePrice as approximation)
          totalCost: {
            $multiply: [
              { $ifNull: ['$product.purchasePrice', 0] },
              '$totalQty',
            ],
          },
        },
      },
      // Calculate margins
      {
        $addFields: {
          marginExcl: {
            $subtract: ['$totalRevenueExcl', '$totalCost'],
          },
          marginRate: {
            $cond: {
              if: { $gt: ['$totalRevenueExcl', 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ['$totalRevenueExcl', '$totalCost'] },
                      '$totalRevenueExcl',
                    ],
                  },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },
      // Project final fields
      {
        $project: {
          _id: 0,
          productId: '$_id',
          sku: '$productSku',
          name: '$productName',
          totalQty: 1,
          totalRevenueExcl: { $round: ['$totalRevenueExcl', 2] },
          totalRevenueIncl: { $round: ['$totalRevenueIncl', 2] },
          totalCost: { $round: ['$totalCost', 2] },
          marginExcl: { $round: ['$marginExcl', 2] },
          marginRate: { $round: ['$marginRate', 2] },
          purchasePrice: { $round: ['$purchasePrice', 2] },
        },
      },
    ];

    // Determine sort field
    let sortField;
    switch (sortBy) {
      case 'qty':
        sortField = { totalQty: -1 };
        break;
      case 'revenue':
        sortField = { totalRevenueExcl: -1 };
        break;
      case 'margin':
        sortField = { marginExcl: -1 };
        break;
      default:
        sortField = { totalQty: -1 };
    }

    // Add sorting and limit
    pipeline.push({ $sort: sortField });
    pipeline.push({ $limit: limit });

    // Debug: Log the date range and company filter
    request.log.info({
      msg: 'Sales products analytics',
      dateRange: {
        from: dateRange.startDate.toISOString(),
        to: dateRange.endDate.toISOString(),
      },
      companyFilter,
      period,
      sortBy,
      limit,
    });

    // First, check if any sales exist for this company
    const salesCount = await Sale.countDocuments(companyFilter);

    // Check sales count after date filter
    const salesWithDateCount = await Sale.aggregate([
      { $match: companyFilter },
      {
        $addFields: { effectiveDate: { $ifNull: ['$saleDate', '$createdAt'] } },
      },
      {
        $match: {
          effectiveDate: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      { $count: 'total' },
    ]);

    request.log.info({
      msg: 'Sales counts for debugging',
      totalSalesForCompany: salesCount,
      salesInDateRange: salesWithDateCount[0]?.total || 0,
      companyFilter,
      dateRange: {
        from: dateRange.startDate.toISOString(),
        to: dateRange.endDate.toISOString(),
      },
    });

    // Execute aggregation
    const products = await Sale.aggregate(pipeline);

    // Debug: Log results
    request.log.info({
      msg: 'Sales products aggregation results',
      productsCount: products.length,
      firstProduct: products[0] || null,
      sampleItems: products.slice(0, 3),
    });

    // Compute period-average purchase prices for products
    const productIds = products.map(p => p.productId);

    // Query PurchaseOrder to get weighted average purchase price per product in the period
    const purchaseMatch = {
      ...companyFilter,
      status: 'RECEIVED',
      receivedAt: {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate,
      },
    };

    const purchaseAgg = await PurchaseOrder.aggregate([
      { $match: purchaseMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQtyPurchased: { $sum: '$items.receivedQuantity' },
          totalCost: {
            $sum: {
              $multiply: ['$items.receivedQuantity', '$items.unitPrice'],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          totalQtyPurchased: 1,
          avgPurchasePrice: {
            $cond: [
              { $gt: ['$totalQtyPurchased', 0] },
              { $divide: ['$totalCost', '$totalQtyPurchased'] },
              null,
            ],
          },
        },
      },
    ]);

    // Convert to Map for quick lookup
    const periodPurchaseMap = new Map(
      purchaseAgg
        .filter(p => p.avgPurchasePrice !== null)
        .map(p => [String(p.productId), p])
    );

    // Get all products to fetch lastPurchasePrice/purchasePrice (needed for averaging)
    let productPriceMap = new Map();
    if (productIds.length > 0) {
      const productsForPricing = await Product.find({
        _id: { $in: productIds },
        ...companyFilter,
      })
        .select('_id lastPurchasePrice purchasePrice')
        .lean();

      productPriceMap = new Map(
        productsForPricing.map(p => [
          String(p._id),
          {
            lastPurchasePrice: p.lastPurchasePrice || 0,
            purchasePrice: p.purchasePrice || 0,
          },
        ])
      );
    }

    // Add period-average purchase price fields to each product
    for (const product of products) {
      const productIdStr = String(product.productId);
      const periodPurchase = periodPurchaseMap.get(productIdStr);
      const productPricing = productPriceMap.get(productIdStr);

      let periodAvgPurchasePrice = 0;
      let periodAvgSource = 'fallback';

      const periodAvg = periodPurchase?.avgPurchasePrice || null;
      const lastPrice = productPricing?.lastPurchasePrice || 0;

      if (periodAvg !== null && lastPrice > 0) {
        // Average the period purchase price with the last purchase price
        periodAvgPurchasePrice = (periodAvg + lastPrice) / 2;
        periodAvgSource = 'period+last';
      } else if (periodAvg !== null) {
        // Use period average only
        periodAvgPurchasePrice = periodAvg;
        periodAvgSource = 'period';
      } else if (lastPrice > 0) {
        // Use last purchase price only
        periodAvgPurchasePrice = lastPrice;
        periodAvgSource = 'last';
      } else {
        // Fallback to purchasePrice
        const fallbackPrice =
          productPricing?.purchasePrice || product.purchasePrice || 0;
        periodAvgPurchasePrice = fallbackPrice;
        periodAvgSource = 'fallback';
      }

      // Calculate period-based cost and margin
      const periodCostTotal = periodAvgPurchasePrice * product.totalQty;
      const periodMargin = product.totalRevenueExcl - periodCostTotal;
      const periodMarginRate =
        periodCostTotal > 0 ? (periodMargin / periodCostTotal) * 100 : 0;

      // Add new fields to product
      product.periodAvgPurchasePrice =
        Math.round(periodAvgPurchasePrice * 100) / 100;
      product.periodAvgSource = periodAvgSource;
      product.periodCostTotal = Math.round(periodCostTotal * 100) / 100;
      product.periodMargin = Math.round(periodMargin * 100) / 100;
      product.periodMarginRate = Math.round(periodMarginRate * 100) / 100;
    }

    // Also check if there are sales with items
    const salesWithItems = await Sale.aggregate([
      { $match: companyFilter },
      {
        $addFields: { effectiveDate: { $ifNull: ['$saleDate', '$createdAt'] } },
      },
      {
        $match: {
          effectiveDate: { $gte: dateRange.startDate, $lte: dateRange.endDate },
        },
      },
      { $match: { 'items.0': { $exists: true } } },
      {
        $project: { _id: 1, itemsCount: { $size: '$items' }, effectiveDate: 1 },
      },
      { $limit: 5 },
    ]);

    request.log.info({
      msg: 'Sample sales with items',
      salesWithItems,
    });

    // Compute global totals (run a separate aggregation without limit)
    const totalsPipeline = [
      // Match sales for the company
      {
        $match: {
          ...companyFilter,
        },
      },
      // Add effectiveDate field for easier filtering
      {
        $addFields: {
          effectiveDate: {
            $ifNull: ['$saleDate', '$createdAt'],
          },
        },
      },
      // Filter by date range using effectiveDate
      {
        $match: {
          effectiveDate: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate,
          },
        },
      },
      // Unwind items to compute revenues properly
      {
        $unwind: '$items',
      },
      // Compute item revenues
      {
        $addFields: {
          itemTotalExclTax: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$items.totalExclTax', 0] },
                  { $ne: ['$items.totalExclTax', null] },
                ],
              },
              then: '$items.totalExclTax',
              else: {
                $multiply: [
                  { $ifNull: ['$items.qty', 0] },
                  { $ifNull: ['$items.unitPrice', 0] },
                ],
              },
            },
          },
          itemTotalInclTax: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$items.totalInclTax', 0] },
                  { $ne: ['$items.totalInclTax', null] },
                ],
              },
              then: '$items.totalInclTax',
              else: {
                $let: {
                  vars: {
                    exclTax: {
                      $multiply: [
                        { $ifNull: ['$items.qty', 0] },
                        { $ifNull: ['$items.unitPrice', 0] },
                      ],
                    },
                    taxRate: { $ifNull: ['$items.taxRate', 0] },
                  },
                  in: {
                    $multiply: [
                      '$$exclTax',
                      { $add: [1, { $divide: ['$$taxRate', 100] }] },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      // Group to get totals
      {
        $group: {
          _id: null,
          totalQty: { $sum: { $ifNull: ['$items.qty', 0] } },
          totalRevenueExcl: { $sum: '$itemTotalExclTax' },
          totalRevenueIncl: { $sum: '$itemTotalInclTax' },
        },
      },
    ];

    const totalsResult = await Sale.aggregate(totalsPipeline);
    const totals = totalsResult[0] || {
      totalQty: 0,
      totalRevenueExcl: 0,
      totalRevenueIncl: 0,
    };

    // Calculate total cost for all products (approximate)
    const costPipeline = [
      // Match sales for the company
      {
        $match: {
          ...companyFilter,
        },
      },
      // Add effectiveDate field for easier filtering
      {
        $addFields: {
          effectiveDate: {
            $ifNull: ['$saleDate', '$createdAt'],
          },
        },
      },
      // Filter by date range using effectiveDate
      {
        $match: {
          effectiveDate: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate,
          },
        },
      },
      {
        $unwind: '$items',
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          totalCost: {
            $sum: {
              $multiply: [
                { $ifNull: ['$product.purchasePrice', 0] },
                '$items.qty',
              ],
            },
          },
        },
      },
    ];

    const costResult = await Sale.aggregate(costPipeline);
    const totalCost = costResult[0]?.totalCost || 0;

    const totalMarginExcl = totals.totalRevenueExcl - totalCost;
    const totalMarginRate =
      totals.totalRevenueExcl > 0
        ? (totalMarginExcl / totals.totalRevenueExcl) * 100
        : 0;

    return reply.send({
      period,
      dateRange: {
        from: dateRange.startDate.toISOString(),
        to: dateRange.endDate.toISOString(),
      },
      sortBy,
      products,
      totals: {
        totalQty: totals.totalQty,
        totalRevenueExcl: Math.round(totals.totalRevenueExcl * 100) / 100,
        totalRevenueIncl: Math.round(totals.totalRevenueIncl * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalMarginExcl: Math.round(totalMarginExcl * 100) / 100,
        totalMarginRate: Math.round(totalMarginRate * 100) / 100,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Failed to generate sales products report',
      message: error.message,
    });
  }
}

/**
 * GET /reports/stock-alerts
 * Returns products that are below their minimum stock threshold
 * Query params:
 *   - limit: number (default: 50, max: 200)
 *   - sort: "asc" | "desc" (default: "asc" - stock ascending)
 */
export async function getStockAlertsReport(request, reply) {
  try {
    const companyFilter = getCompanyFilter(request.user);

    // Parse query parameters
    const limit = Math.min(parseInt(request.query.limit) || 50, 200);
    const sort = request.query.sort || 'asc';

    // Validate sort parameter
    if (!['asc', 'desc'].includes(sort)) {
      return reply.code(400).send({
        error: 'Invalid sort. Must be one of: asc, desc',
      });
    }

    // Build query for products that need restocking
    const query = {
      ...companyFilter,
      isDeleted: false,
      isActive: true,
      // Stock is at or below minimum threshold
      $expr: {
        $lte: ['$stockQty', '$minStock'],
      },
      // Only include products with minStock > 0 (configured threshold)
      minStock: { $gt: 0 },
    };

    // Determine sort order
    const sortOrder = sort === 'asc' ? 1 : -1;

    // Query products
    const products = await Product.find(query)
      .select('_id sku name brand stockQty minStock')
      .sort({ stockQty: sortOrder })
      .limit(limit)
      .lean();

    // Format response
    const items = products.map(p => ({
      productId: p._id.toString(),
      sku: p.sku,
      name: p.name,
      brand: p.brand || null,
      stockQty: p.stockQty,
      minStockQty: p.minStock,
      difference: p.stockQty - p.minStock,
    }));

    // Get total count (without limit)
    const totalAlerts = await Product.countDocuments(query);

    return reply.send({
      items,
      totalAlerts,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Failed to generate stock alerts report',
      message: error.message,
    });
  }
}

/**
 * GET /reports/top-products
 * Returns top-selling products by quantity or revenue
 * Query params:
 *   - period: "day" | "week" | "month" | "year" | "range" (default: "month")
 *   - from: ISO date string YYYY-MM-DD (required if period="range")
 *   - to: ISO date string YYYY-MM-DD (required if period="range")
 *   - sortBy: "qty" | "revenue" (default: "qty")
 *   - limit: number (default: 10, max: 100)
 */
export async function getTopProductsReport(request, reply) {
  try {
    const companyFilterRaw = getCompanyFilter(request.user);

    // Convert companyId to ObjectId if it's a string
    const companyFilter = {};
    if (companyFilterRaw.companyId) {
      if (typeof companyFilterRaw.companyId === 'string') {
        companyFilter.companyId = new mongoose.Types.ObjectId(
          companyFilterRaw.companyId
        );
      } else {
        companyFilter.companyId = companyFilterRaw.companyId;
      }
    } else if (Object.keys(companyFilterRaw).length === 0) {
      Object.assign(companyFilter, companyFilterRaw);
    } else {
      Object.assign(companyFilter, companyFilterRaw);
    }

    // Parse query parameters
    const period = request.query.period || 'month';
    const from = request.query.from;
    const to = request.query.to;
    const sortBy = request.query.sortBy || 'qty';
    const limit = Math.min(parseInt(request.query.limit) || 10, 100);

    // Validate period
    if (!['day', 'week', 'month', 'year', 'range'].includes(period)) {
      return reply.code(400).send({
        error: 'Invalid period. Must be one of: day, week, month, year, range',
      });
    }

    // Validate sortBy
    if (!['qty', 'revenue'].includes(sortBy)) {
      return reply.code(400).send({
        error: 'Invalid sortBy. Must be one of: qty, revenue',
      });
    }

    // Compute date range
    let dateRange;
    try {
      dateRange = computeDateRange(period, from, to);
    } catch (error) {
      return reply.code(400).send({
        error: error.message,
      });
    }

    // Build aggregation pipeline
    const pipeline = [
      // Match sales for the company
      {
        $match: {
          ...companyFilter,
        },
      },
      // Add effectiveDate field
      {
        $addFields: {
          effectiveDate: {
            $ifNull: ['$saleDate', '$createdAt'],
          },
        },
      },
      // Filter by date range
      {
        $match: {
          effectiveDate: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate,
          },
        },
      },
      // Unwind items array
      {
        $unwind: '$items',
      },
      // Compute item revenue
      {
        $addFields: {
          itemRevenue: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$items.totalExclTax', 0] },
                  { $ne: ['$items.totalExclTax', null] },
                ],
              },
              then: '$items.totalExclTax',
              else: {
                $multiply: [
                  { $ifNull: ['$items.qty', 0] },
                  { $ifNull: ['$items.unitPrice', 0] },
                ],
              },
            },
          },
        },
      },
      // Group by productId
      {
        $group: {
          _id: '$items.productId',
          totalQty: { $sum: { $ifNull: ['$items.qty', 0] } },
          totalRevenue: { $sum: '$itemRevenue' },
        },
      },
      // Lookup product details
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      // Unwind product
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Project final fields
      {
        $project: {
          _id: 0,
          productId: '$_id',
          sku: { $ifNull: ['$product.sku', 'N/A'] },
          name: { $ifNull: ['$product.name', 'Unknown Product'] },
          brand: { $ifNull: ['$product.brand', null] },
          totalQty: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
        },
      },
    ];

    // Determine sort field
    const sortField =
      sortBy === 'qty' ? { totalQty: -1 } : { totalRevenue: -1 };

    // Add sorting and limit
    pipeline.push({ $sort: sortField });
    pipeline.push({ $limit: limit });

    // Execute aggregation
    const products = await Sale.aggregate(pipeline);

    return reply.send({
      period,
      dateRange: {
        from: dateRange.startDate.toISOString(),
        to: dateRange.endDate.toISOString(),
      },
      sortBy,
      products,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Failed to generate top products report',
      message: error.message,
    });
  }
}

/**
 * Calculate previous period date range based on current period
 * @param {Date} startDate - Start date of current period
 * @param {Date} endDate - End date of current period
 * @returns {Object} Previous period date range with startDate and endDate
 */
function computePreviousPeriodDateRange(startDate, endDate) {
  // Calculate the duration of the current period in milliseconds
  const periodDuration = endDate.getTime() - startDate.getTime();

  // Calculate previous period end date (one day before current period starts)
  const previousEndDate = new Date(startDate);
  previousEndDate.setMilliseconds(previousEndDate.getMilliseconds() - 1);
  previousEndDate.setHours(23, 59, 59, 999);

  // Calculate previous period start date (subtract the duration)
  const previousStartDate = new Date(
    previousEndDate.getTime() - periodDuration
  );
  previousStartDate.setHours(0, 0, 0, 0);

  return {
    startDate: previousStartDate,
    endDate: previousEndDate,
  };
}

/**
 * Build aggregation pipeline for sales summary
 * @param {Object} companyFilter - Company filter for multi-tenant support
 * @param {Date} startDate - Start date of the period
 * @param {Date} endDate - End date of the period
 * @returns {Array} MongoDB aggregation pipeline
 */
function buildSalesSummaryPipeline(companyFilter, startDate, endDate) {
  return [
    // Match sales for the company
    {
      $match: {
        ...companyFilter,
      },
    },
    // Add effectiveDate field
    {
      $addFields: {
        effectiveDate: {
          $ifNull: ['$saleDate', '$createdAt'],
        },
      },
    },
    // Filter by date range
    {
      $match: {
        effectiveDate: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    // Add field to calculate total quantity from items array
    {
      $addFields: {
        totalQty: {
          $reduce: {
            input: { $ifNull: ['$items', []] },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.qty', 0] }] },
          },
        },
      },
    },
    // Group to get totals
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenueExcl: { $sum: { $ifNull: ['$totalExclTax', 0] } },
        totalRevenueIncl: { $sum: { $ifNull: ['$totalInclTax', 0] } },
        totalTax: { $sum: { $ifNull: ['$totalTax', 0] } },
        totalItems: { $sum: '$totalQty' },
      },
    },
  ];
}

/**
 * GET /reports/sales-summary
 * Returns summary statistics for sales with previous period comparison
 * Query params:
 *   - period: "day" | "week" | "month" | "year" | "range" (default: "month")
 *   - from: ISO date string YYYY-MM-DD (required if period="range")
 *   - to: ISO date string YYYY-MM-DD (required if period="range")
 */
export async function getSalesSummaryReport(request, reply) {
  try {
    const companyFilterRaw = getCompanyFilter(request.user);

    // Convert companyId to ObjectId if it's a string
    const companyFilter = {};
    if (companyFilterRaw.companyId) {
      if (typeof companyFilterRaw.companyId === 'string') {
        companyFilter.companyId = new mongoose.Types.ObjectId(
          companyFilterRaw.companyId
        );
      } else {
        companyFilter.companyId = companyFilterRaw.companyId;
      }
    } else if (Object.keys(companyFilterRaw).length === 0) {
      Object.assign(companyFilter, companyFilterRaw);
    } else {
      Object.assign(companyFilter, companyFilterRaw);
    }

    // Parse query parameters
    const period = request.query.period || 'month';
    const from = request.query.from;
    const to = request.query.to;

    // Validate period
    if (!['day', 'week', 'month', 'year', 'range'].includes(period)) {
      return reply.code(400).send({
        error: 'Invalid period. Must be one of: day, week, month, year, range',
      });
    }

    // Compute date range
    let dateRange;
    try {
      dateRange = computeDateRange(period, from, to);
    } catch (error) {
      return reply.code(400).send({
        error: error.message,
      });
    }

    // Calculate previous period date range
    const previousPeriodRange = computePreviousPeriodDateRange(
      dateRange.startDate,
      dateRange.endDate
    );

    // Build aggregation pipeline for current period summary
    const pipeline = buildSalesSummaryPipeline(
      companyFilter,
      dateRange.startDate,
      dateRange.endDate
    );

    // Build aggregation pipeline for previous period summary
    const previousPipeline = buildSalesSummaryPipeline(
      companyFilter,
      previousPeriodRange.startDate,
      previousPeriodRange.endDate
    );

    // Execute both aggregations in parallel
    const [summaryResult, previousSummaryResult] = await Promise.all([
      Sale.aggregate(pipeline),
      Sale.aggregate(previousPipeline),
    ]);

    const summary = summaryResult[0] || {
      totalSales: 0,
      totalRevenueExcl: 0,
      totalRevenueIncl: 0,
      totalTax: 0,
      totalItems: 0,
    };

    const previousSummary = previousSummaryResult[0] || {
      totalSales: 0,
      totalRevenueExcl: 0,
      totalRevenueIncl: 0,
      totalTax: 0,
      totalItems: 0,
    };

    // Calculate average sale value for current period
    const averageSaleValue =
      summary.totalSales > 0
        ? summary.totalRevenueIncl / summary.totalSales
        : 0;

    // Calculate average sale value for previous period
    const previousAverageSaleValue =
      previousSummary.totalSales > 0
        ? previousSummary.totalRevenueIncl / previousSummary.totalSales
        : 0;

    // Get payment method breakdown
    const paymentMethodPipeline = [
      {
        $match: {
          ...companyFilter,
        },
      },
      {
        $addFields: {
          effectiveDate: {
            $ifNull: ['$saleDate', '$createdAt'],
          },
        },
      },
      {
        $match: {
          effectiveDate: {
            $gte: dateRange.startDate,
            $lte: dateRange.endDate,
          },
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$totalInclTax', 0] } },
        },
      },
    ];

    const paymentMethods = await Sale.aggregate(paymentMethodPipeline);

    // Format summary data
    const formattedSummary = {
      totalSales: summary.totalSales,
      totalOrders: summary.totalSales, // Alias for consistency
      totalRevenueExcl: Math.round(summary.totalRevenueExcl * 100) / 100,
      totalRevenueIncl: Math.round(summary.totalRevenueIncl * 100) / 100,
      totalTax: Math.round(summary.totalTax * 100) / 100,
      totalItems: summary.totalItems,
      totalQty: summary.totalItems, // Alias for consistency
      averageSaleValue: Math.round(averageSaleValue * 100) / 100,
    };

    // Format previous period summary data
    const formattedPreviousSummary = {
      totalSales: previousSummary.totalSales,
      totalOrders: previousSummary.totalSales, // Alias for consistency
      totalRevenueExcl:
        Math.round(previousSummary.totalRevenueExcl * 100) / 100,
      totalRevenueIncl:
        Math.round(previousSummary.totalRevenueIncl * 100) / 100,
      totalTax: Math.round(previousSummary.totalTax * 100) / 100,
      totalItems: previousSummary.totalItems,
      totalQty: previousSummary.totalItems, // Alias for consistency
      averageSaleValue: Math.round(previousAverageSaleValue * 100) / 100,
    };

    return reply.send({
      from: dateRange.startDate.toISOString(),
      to: dateRange.endDate.toISOString(),
      period,
      dateRange: {
        from: dateRange.startDate.toISOString(),
        to: dateRange.endDate.toISOString(),
      },
      summary: formattedSummary,
      previousPeriod: {
        from: previousPeriodRange.startDate.toISOString(),
        to: previousPeriodRange.endDate.toISOString(),
        summary: formattedPreviousSummary,
      },
      paymentMethods: paymentMethods.map(pm => ({
        method: pm._id || 'UNKNOWN',
        count: pm.count,
        totalRevenue: Math.round(pm.totalRevenue * 100) / 100,
      })),
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Failed to generate sales summary report',
      message: error.message,
    });
  }
}
