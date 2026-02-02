/**
 * Product model for auto parts catalogue
 */
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    manufacturerRef: {
      type: String,
      required: true,
      trim: true,
    },
    oemRefs: [
      {
        type: String,
        trim: true,
      },
    ],
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
    },
    category: {
      type: String,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    salePrice: {
      type: Number,
      required: false, // Calculated on-the-fly, not stored
      min: 0,
      default: 0,
    },
    purchasePrice: {
      type: Number,
      min: 0,
      default: 0,
      // Average purchase cost (HT) - weighted average of all purchases
    },
    lastPurchasePrice: {
      type: Number,
      min: 0,
      default: 0,
      // Last purchase unit price from the latest reception (HT)
    },
    supplierInfos: [
      {
        supplierId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Supplier',
          required: true,
        },
        supplierName: {
          type: String,
          trim: true,
        },
        lastPurchasePrice: {
          type: Number,
          default: 0,
          min: 0,
        },
        averagePurchasePrice: {
          type: Number,
          default: 0,
          min: 0,
        },
        totalQtyPurchased: {
          type: Number,
          default: 0,
          min: 0,
        },
        lastPurchaseDate: {
          type: Date,
        },
        isPreferred: {
          type: Boolean,
          default: false,
        },
      },
    ],
    pricingMode: {
      type: String,
      enum: ['HYBRID'],
      default: 'HYBRID',
      // Pricing mode for calculating recommended sale price
    },
    marginRate: {
      type: Number,
      default: 40,
      min: 0,
      // Target margin percentage, e.g. 40 = 40%
    },
    minMarginOnLastPurchase: {
      type: Number,
      default: 10,
      min: 0,
      // Minimum margin percentage to guarantee on the last purchase cost, e.g. 10 = 10%
    },
    taxRate: {
      type: Number,
      default: 19,
      // Tax rate percentage, e.g. 19 = 19%
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
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
    },
    stockQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxStock: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

// Useful indexes for search
// Unique manufacturerRef per company
productSchema.index({ companyId: 1, manufacturerRef: 1 }, { unique: true });
// Search by name
productSchema.index({ companyId: 1, name: 1 });
// Search by manufacturer and OEM references
productSchema.index({ companyId: 1, manufacturerRef: 1 });
productSchema.index({ companyId: 1, oemRefs: 1 });
// Filter by isDeleted
productSchema.index({ companyId: 1, isDeleted: 1 });

// Make model idempotent - check if it already exists before creating
export const Product =
  mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
