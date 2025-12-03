/**
 * Customer Finance utility functions
 */
import mongoose from 'mongoose';

import Customer from '../models/customer.model.js';
import CustomerFinance from '../models/customerFinance.model.js';
import Invoice from '../models/invoice.model.js';
import Payment from '../models/payment.model.js';
import Sale from '../models/sale.model.js';

/**
 * Calculate customer finance metrics
 */
export async function calculateCustomerFinance(customerId, companyId) {
  const customerObjectId = new mongoose.Types.ObjectId(customerId);
  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  // Get all invoices for this customer
  const invoices = await Invoice.find({
    customerId: customerObjectId,
    companyId: companyObjectId,
    status: { $ne: 'cancelled' },
  }).lean();

  // Calculate totals
  let totalInvoiced = 0;
  let totalPaid = 0;
  let unpaidAmount = 0;
  let overdueAmount = 0;

  const now = new Date();

  for (const invoice of invoices) {
    totalInvoiced += invoice.total;
    totalPaid += invoice.paidAmount || 0;

    if (invoice.remainingAmount > 0) {
      unpaidAmount += invoice.remainingAmount;

      // Check if overdue
      if (invoice.dueDate < now && invoice.status !== 'paid') {
        overdueAmount += invoice.remainingAmount;
      }
    }
  }

  const balance = totalInvoiced - totalPaid;

  // Calculate monthly average purchase (last 12 months)
  // Only count regular sales (exclude returns)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const sales = await Sale.find({
    customerId: customerObjectId,
    companyId: companyObjectId,
    saleDate: { $gte: twelveMonthsAgo },
    isReturn: { $ne: true }, // Exclude return sales from monthly average calculation
  }).lean();

  let totalSalesAmount = 0;
  for (const sale of sales) {
    totalSalesAmount += sale.totalInclTax || 0;
  }

  const monthlyAveragePurchase = sales.length > 0 ? totalSalesAmount / 12 : 0;

  // Get or create customer finance record
  let customerFinance = await CustomerFinance.findOne({
    customerId: customerObjectId,
    companyId: companyObjectId,
  });

  if (!customerFinance) {
    customerFinance = await CustomerFinance.create({
      customerId: customerObjectId,
      companyId: companyObjectId,
      balance: 0,
      unpaidAmount: 0,
      overdueAmount: 0,
      creditLimit: 0,
      customDiscount: 0,
      monthlyAveragePurchase: 0,
    });
  }

  // Update finance record
  customerFinance.balance = balance;
  customerFinance.unpaidAmount = unpaidAmount;
  customerFinance.overdueAmount = overdueAmount;
  customerFinance.monthlyAveragePurchase = monthlyAveragePurchase;
  customerFinance.lastCalculatedAt = new Date();

  await customerFinance.save();

  return customerFinance;
}

/**
 * Create invoice from sale
 */
export async function createInvoiceFromSale(
  sale,
  customerId,
  companyId,
  paymentTerms = 30
) {
  // Generate invoice number
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Invoice.countDocuments({
    companyId: new mongoose.Types.ObjectId(companyId),
    invoiceNumber: { $regex: `^INV-${dateStr}-` },
  });
  const suffix = String(count + 1).padStart(4, '0');
  const invoiceNumber = `INV-${dateStr}-${suffix}`;

  // Calculate due date
  const dueDate = new Date(sale.saleDate || sale.createdAt);
  dueDate.setDate(dueDate.getDate() + paymentTerms);

  // Get customer discount if exists
  const customerFinance = await CustomerFinance.findOne({
    customerId: new mongoose.Types.ObjectId(customerId),
    companyId: new mongoose.Types.ObjectId(companyId),
  }).lean();

  const discountPercent = customerFinance?.customDiscount || 0;
  const discount = (sale.totalInclTax * discountPercent) / 100;
  const total = sale.totalInclTax - discount;

  // Create invoice
  const invoice = await Invoice.create({
    companyId: new mongoose.Types.ObjectId(companyId),
    customerId: new mongoose.Types.ObjectId(customerId),
    saleId: sale._id,
    invoiceNumber,
    invoiceDate: sale.saleDate || sale.createdAt,
    dueDate,
    subtotal: sale.totalExclTax,
    tax: sale.totalTax,
    discount,
    total,
    paidAmount: 0,
    remainingAmount: total,
    status: 'pending',
    paymentTerms,
  });

  // Update customer finance
  await calculateCustomerFinance(customerId, companyId);

  // Update customer financial stats for classification
  try {
    await calculateCustomerFinancialStats(customerId, companyId);
  } catch (error) {
    // Log error but don't fail invoice creation
    console.error('Failed to update customer financial stats:', error);
  }

  return invoice;
}

/**
 * Record payment and update invoice
 */
export async function recordPayment(
  customerId,
  invoiceId,
  amount,
  paymentMethod,
  reference,
  notes,
  createdBy,
  companyId
) {
  const invoice = await Invoice.findOne({
    _id: new mongoose.Types.ObjectId(invoiceId),
    customerId: new mongoose.Types.ObjectId(customerId),
    companyId: new mongoose.Types.ObjectId(companyId),
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'cancelled') {
    throw new Error('Cannot record payment for cancelled invoice');
  }

  // Check if payment exceeds remaining amount
  const newPaidAmount = (invoice.paidAmount || 0) + amount;
  if (newPaidAmount > invoice.total) {
    throw new Error('Payment amount exceeds invoice total');
  }

  // Create payment record
  const payment = await Payment.create({
    companyId: new mongoose.Types.ObjectId(companyId),
    customerId: new mongoose.Types.ObjectId(customerId),
    invoiceId: new mongoose.Types.ObjectId(invoiceId),
    paymentDate: new Date(),
    amount,
    paymentMethod: paymentMethod || 'CASH',
    reference: reference?.trim() || undefined,
    notes: notes?.trim() || undefined,
    createdBy: new mongoose.Types.ObjectId(createdBy),
  });

  // Update invoice
  invoice.paidAmount = newPaidAmount;
  invoice.remainingAmount = invoice.total - newPaidAmount;
  invoice.updateStatus();
  await invoice.save();

  // Recalculate customer finance
  await calculateCustomerFinance(customerId, companyId);

  // Update customer financial stats for classification
  try {
    await calculateCustomerFinancialStats(customerId, companyId);
  } catch (error) {
    // Log error but don't fail payment recording
    console.error('Failed to update customer financial stats:', error);
  }

  return { payment, invoice };
}

/**
 * Get customer finance summary
 */
export async function getCustomerFinanceSummary(customerId, companyId) {
  const customerObjectId = new mongoose.Types.ObjectId(customerId);
  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  // Get or calculate finance
  let customerFinance = await CustomerFinance.findOne({
    customerId: customerObjectId,
    companyId: companyObjectId,
  }).lean();

  if (!customerFinance) {
    customerFinance = await calculateCustomerFinance(customerId, companyId);
  } else {
    // Recalculate to ensure data is up to date
    customerFinance = await calculateCustomerFinance(customerId, companyId);
  }

  // Get pending invoices count
  const pendingInvoicesCount = await Invoice.countDocuments({
    customerId: customerObjectId,
    companyId: companyObjectId,
    status: 'pending',
  });

  // Get overdue invoices count
  const overdueInvoicesCount = await Invoice.countDocuments({
    customerId: customerObjectId,
    companyId: companyObjectId,
    status: 'overdue',
  });

  return {
    ...customerFinance,
    pendingInvoicesCount,
    overdueInvoicesCount,
  };
}

/**
 * Calculate and update customer financial statistics for classification
 *
 * This function synchronizes data from CustomerFinance model (source of truth)
 * and calculates additional metrics needed for classification:
 * - Total unpaid and overdue amounts (from CustomerFinance)
 * - Late payments count (last 6 months)
 * - Average payment delay
 * - Return rate
 * - Total purchases
 * - Credit limit (from CustomerFinance)
 *
 * After calculation, updates the customer's financialStats and recalculates classification
 *
 * @param {string|mongoose.Types.ObjectId} customerId - Customer ID
 * @param {string|mongoose.Types.ObjectId} companyId - Company ID
 * @returns {Promise<Object>} Updated financial statistics
 */
export async function calculateCustomerFinancialStats(customerId, companyId) {
  const customerObjectId = new mongoose.Types.ObjectId(customerId);
  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  // Get customer
  const customer = await Customer.findOne({
    _id: customerObjectId,
    companyId: companyObjectId,
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Step 1: Ensure CustomerFinance is up to date (source of truth for financial data)
  const customerFinance = await calculateCustomerFinance(customerId, companyId);

  // Use values from CustomerFinance (source of truth)
  const totalUnpaid = customerFinance.unpaidAmount || 0;
  const totalOverdue = customerFinance.overdueAmount || 0;
  const creditLimit = customerFinance.creditLimit || 0;

  // Calculate late payments count (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Get payments made after due date (late payments)
  const latePayments = await Payment.aggregate([
    {
      $match: {
        customerId: customerObjectId,
        companyId: companyObjectId,
        paymentDate: { $gte: sixMonthsAgo },
      },
    },
    {
      $lookup: {
        from: 'invoices',
        localField: 'invoiceId',
        foreignField: '_id',
        as: 'invoice',
      },
    },
    {
      $unwind: '$invoice',
    },
    {
      $match: {
        'invoice.dueDate': { $lt: '$paymentDate' }, // Payment made after due date
      },
    },
  ]);

  const latePaymentsCount = latePayments.length;

  // Calculate average payment delay
  let totalDelayDays = 0;
  let delayCount = 0;

  for (const payment of latePayments) {
    if (payment.invoice && payment.invoice.dueDate) {
      const delayDays = Math.floor(
        (new Date(payment.paymentDate) - new Date(payment.invoice.dueDate)) /
          (1000 * 60 * 60 * 24)
      );
      if (delayDays > 0) {
        totalDelayDays += delayDays;
        delayCount++;
      }
    }
  }

  const averagePaymentDelay = delayCount > 0 ? totalDelayDays / delayCount : 0;

  // Calculate return rate
  // Get all sales (non-return sales)
  const allSales = await Sale.find({
    customerId: customerObjectId,
    companyId: companyObjectId,
    isReturn: false,
  }).lean();

  // Get return sales
  const returnSales = await Sale.find({
    customerId: customerObjectId,
    companyId: companyObjectId,
    isReturn: true,
  }).lean();

  // Calculate total items sold and returned
  let totalItemsSold = 0;
  let totalItemsReturned = 0;

  for (const sale of allSales) {
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        totalItemsSold += item.qty || 0;
      }
    }
  }

  for (const sale of returnSales) {
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        totalItemsReturned += item.qty || 0;
      }
    }
  }

  const returnRate =
    totalItemsSold > 0 ? (totalItemsReturned / totalItemsSold) * 100 : 0;

  // Calculate total purchases (lifetime)
  let totalPurchases = 0;
  for (const sale of allSales) {
    totalPurchases += sale.totalInclTax || 0;
  }

  // Get manual block status from customer (preserve it)
  const blockedManually = customer.financialStats?.blockedManually || false;

  // Update customer's financial stats
  const stats = {
    totalUnpaid,
    totalOverdue,
    latePaymentsCount,
    averagePaymentDelay: Math.round(averagePaymentDelay * 10) / 10, // Round to 1 decimal
    returnRate: Math.round(returnRate * 10) / 10, // Round to 1 decimal
    totalPurchases,
    creditLimit,
    blockedManually,
  };

  customer.updateFinancialStats(stats);

  // Sync monthlyAveragePurchase from CustomerFinance to Customer model
  customer.monthlyAveragePurchase = customerFinance.monthlyAveragePurchase || 0;

  // Recalculate loyalty status after syncing monthlyAveragePurchase
  customer.calculateLoyaltyStatus(customerFinance.monthlyAveragePurchase);

  await customer.save();

  return stats;
}
