/**
 * Sale model for Point of Sale (POS) transactions
 */
import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Base unit price before discount (for tracking discounts per item)
    baseUnitPrice: {
      type: Number,
      min: 0,
    },
    // Discount rate percentage (0-100)
    discountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalExclTax: {
      type: Number,
      required: true,
      min: 0,
    },
    totalInclTax: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    // optional simple counter / reference (can be improved later)
    reference: {
      type: String,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    // Vehicle used for this sale (optional, references customer.vehicles._id)
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    vehicleInfo: {
      vin: { type: String, trim: true },
      brand: { type: String, trim: true },
      model: { type: String, trim: true },
      year: { type: Number },
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CHECK', 'CREDIT'],
      default: 'CASH',
    },
    // Returns and replacements
    returnSaleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      index: true,
    },
    isReturn: {
      type: Boolean,
      default: false,
      index: true,
    },
    isReplacement: {
      type: Boolean,
      default: false,
      index: true,
    },
    items: {
      type: [saleItemSchema],
      validate: [val => val.length > 0, 'Sale must have at least one item'],
    },
    totalExclTax: {
      type: Number,
      required: true,
      min: 0,
    },
    totalTax: {
      type: Number,
      required: true,
      min: 0,
    },
    totalInclTax: {
      type: Number,
      required: true,
      min: 0,
    },
    // Loyalty discount fields (optional, only present when loyalty discount is applied)
    loyaltyDiscount: {
      type: Number,
      min: 0,
      max: 100,
    },
    loyaltyDiscountAmount: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
saleSchema.index({ companyId: 1, saleDate: -1 });
saleSchema.index({ companyId: 1, createdAt: -1 });
saleSchema.index({ companyId: 1, reference: 1 });
saleSchema.index({ companyId: 1, customerId: 1, saleDate: -1 });
saleSchema.index({ companyId: 1, customerId: 1, createdAt: -1 });
saleSchema.index({ companyId: 1, vehicleId: 1 });

// Make model idempotent - check if it already exists before creating
export const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
export default Sale;
