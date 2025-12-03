/**
 * Payment model - Represents payments made by customers
 */
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
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
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER'],
      default: 'CASH',
    },
    reference: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
paymentSchema.index({ companyId: 1, customerId: 1, paymentDate: -1 });
paymentSchema.index({ companyId: 1, invoiceId: 1 });
paymentSchema.index({ companyId: 1, paymentDate: -1 });

// Make model idempotent
export const Payment =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export default Payment;
