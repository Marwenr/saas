/**
 * Supplier model for purchasing module
 */
import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    taxNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
supplierSchema.index({ companyId: 1, name: 1 });
supplierSchema.index({ companyId: 1, isDeleted: 1 });
supplierSchema.index({ companyId: 1, isActive: 1 });

// Make model idempotent - check if it already exists before creating
export const Supplier =
  mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
export default Supplier;
