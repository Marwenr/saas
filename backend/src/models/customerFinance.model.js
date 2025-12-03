/**
 * Customer Finance model - Stores financial information for customers
 */
import mongoose from 'mongoose';

const customerFinanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true,
      index: true,
    },
    // Credit limit
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Current balance (calculated: total invoices - total payments)
    balance: {
      type: Number,
      default: 0,
    },
    // Unpaid amount (invoices not fully paid)
    unpaidAmount: {
      type: Number,
      default: 0,
    },
    // Overdue amount (invoices past due date)
    overdueAmount: {
      type: Number,
      default: 0,
    },
    // Custom discount percentage
    customDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Monthly average purchase (calculated from last 12 months)
    monthlyAveragePurchase: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Last calculated date
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
customerFinanceSchema.index({ companyId: 1, customerId: 1 });
customerFinanceSchema.index({ companyId: 1, balance: -1 });
customerFinanceSchema.index({ companyId: 1, overdueAmount: -1 });

// Make model idempotent
export const CustomerFinance =
  mongoose.models.CustomerFinance ||
  mongoose.model('CustomerFinance', customerFinanceSchema);
export default CustomerFinance;
