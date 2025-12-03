/**
 * Purchase Order model for purchasing module
 */
import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedDate: {
      type: Date,
    },
    items: [purchaseOrderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
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
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receivedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
purchaseOrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ companyId: 1, supplierId: 1 });
purchaseOrderSchema.index({ companyId: 1, status: 1 });
purchaseOrderSchema.index({ companyId: 1, isDeleted: 1 });
purchaseOrderSchema.index({ companyId: 1, orderDate: -1 });

// Make model idempotent - check if it already exists before creating
export const PurchaseOrder =
  mongoose.models.PurchaseOrder ||
  mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;
