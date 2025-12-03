/**
 * Invoice model - Represents invoices for customer sales
 */
import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
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
      index: true,
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
      unique: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    // Invoice amounts
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    // Payment tracking
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Status: pending, partial, paid, overdue, cancelled
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
      index: true,
    },
    // Payment terms in days (default 30)
    paymentTerms: {
      type: Number,
      default: 30,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
invoiceSchema.index({ companyId: 1, customerId: 1, invoiceDate: -1 });
invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ companyId: 1, dueDate: 1 });
invoiceSchema.index({ companyId: 1, invoiceNumber: 1 });

// Virtual to check if invoice is overdue
invoiceSchema.virtual('isOverdue').get(function () {
  if (this.status === 'paid' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate && this.remainingAmount > 0;
});

// Method to update status based on payment
invoiceSchema.methods.updateStatus = function () {
  if (this.status === 'cancelled') {
    return;
  }

  if (this.remainingAmount <= 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else {
    this.status = 'pending';
  }

  // Check if overdue
  if (this.status !== 'paid' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
};

// Pre-save hook to update status
invoiceSchema.pre('save', function (next) {
  this.updateStatus();
  next();
});

// Make model idempotent
export const Invoice =
  mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
export default Invoice;
