/**
 * Company model with Mongoose
 */
import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Company email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: 'TN',
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
    subscriptionPlan: {
      type: String,
      default: 'basic',
      enum: ['basic', 'pro', 'enterprise'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Make model idempotent - check if it already exists before creating
export const Company =
  mongoose.models.Company || mongoose.model('Company', companySchema);
export default Company;
