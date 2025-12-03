/**
 * Stock Movement model for inventory tracking
 */
import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['IN', 'OUT', 'ADJUST'],
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    beforeQty: {
      type: Number,
      required: true,
      min: 0,
    },
    afterQty: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    reference: {
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

// Indexes for efficient queries
stockMovementSchema.index({ companyId: 1, productId: 1, createdAt: -1 });
stockMovementSchema.index({ companyId: 1, createdAt: -1 });
stockMovementSchema.index({ companyId: 1, type: 1 });

// Make model idempotent - check if it already exists before creating
export const StockMovement =
  mongoose.models.StockMovement ||
  mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
