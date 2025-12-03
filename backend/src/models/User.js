/**
 * User model with Mongoose
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    name: {
      type: String,
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
    },
    role: {
      type: String,
      enum: ['platform_admin', 'owner', 'manager', 'cashier', 'storekeeper'],
      default: 'owner',
    },
  },
  {
    timestamps: true,
  }
);

// Validate that non-platform-admin users must have a companyId
userSchema.pre('save', async function (next) {
  if (this.role !== 'platform_admin' && !this.companyId) {
    return next(
      new Error('Non-platform-admin users must be associated with a company')
    );
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Make model idempotent - check if it already exists before creating
export default mongoose.models.User || mongoose.model('User', userSchema);
