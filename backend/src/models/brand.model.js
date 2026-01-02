/**
 * Brand model for auto parts catalogue
 */
import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

// Unique brand name per company
brandSchema.index({ companyId: 1, name: 1 }, { unique: true });

// Make model idempotent - check if it already exists before creating
export const Brand =
  mongoose.models.Brand || mongoose.model('Brand', brandSchema);
export default Brand;
