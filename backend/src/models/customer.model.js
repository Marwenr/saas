/**
 * Customer model for automotive ERP
 *
 * This model represents customers in an automotive spare parts store.
 * It includes vehicle tracking, financial statistics, and automatic classification
 * based on payment behavior, return rates, and reliability metrics.
 *
 * @module models/customer
 */

import mongoose from 'mongoose';

/**
 * Vehicle sub-schema
 * Tracks vehicles associated with a customer (VIN, model, engine, mileage)
 *
 * @typedef {Object} Vehicle
 * @property {string} vin - Vehicle Identification Number (uppercase, required)
 * @property {string} brand - Vehicle brand (required)
 * @property {string} model - Vehicle model (required)
 * @property {number} year - Manufacturing year (1900 to current year + 1)
 * @property {string} engine - Engine information
 * @property {string} fuelType - Type of fuel (essence, diesel, hybride, electrique, gpl, autre)
 * @property {number} mileage - Current mileage
 * @property {Date} acquisitionDate - Date when vehicle was acquired
 */
const vehicleSchema = new mongoose.Schema(
  {
    vin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      min: [1900, 'Year must be after 1900'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future'],
    },
    engine: {
      type: String,
      trim: true,
    },
    fuelType: {
      type: String,
      enum: ['essence', 'diesel', 'hybride', 'electrique', 'gpl', 'autre'],
      default: 'essence',
    },
    mileage: {
      type: Number,
      min: [0, 'Mileage must be positive'],
    },
    acquisitionDate: {
      type: Date,
    },
  },
  { _id: true, timestamps: true }
);

/**
 * Customer Financial Statistics sub-schema
 * Stores financial metrics used for classification calculation
 *
 * NOTE: This is synchronized with the CustomerFinance model (separate collection).
 * The CustomerFinance model is the source of truth for financial data (unpaidAmount,
 * overdueAmount, creditLimit). This sub-schema stores additional metrics needed for
 * classification (late payments, return rate, etc.) and is automatically synchronized
 * when calculateCustomerFinancialStats() is called.
 *
 * @typedef {Object} CustomerFinancialStats
 * @property {number} totalUnpaid - Total amount of unpaid invoices (TND) - synced from CustomerFinance.unpaidAmount
 * @property {number} totalOverdue - Total amount of overdue invoices (TND) - synced from CustomerFinance.overdueAmount
 * @property {number} latePaymentsCount - Number of late payments in last 6 months
 * @property {number} averagePaymentDelay - Average payment delay in days
 * @property {number} returnRate - Percentage of returned/exchanged items (0-100)
 * @property {number} totalPurchases - Total amount purchased (lifetime, TND)
 * @property {number} creditLimit - Credit limit assigned to customer (TND) - synced from CustomerFinance.creditLimit
 * @property {boolean} blockedManually - Whether customer is manually blocked by admin
 * @property {Date} lastCalculatedAt - Timestamp of last statistics calculation
 */
const customerFinancialStatsSchema = new mongoose.Schema(
  {
    totalUnpaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOverdue: {
      type: Number,
      default: 0,
      min: 0,
    },
    latePaymentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averagePaymentDelay: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    blockedManually: {
      type: Boolean,
      default: false,
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Main customer schema
 *
 * @typedef {Object} Customer
 * @property {mongoose.Types.ObjectId} companyId - Reference to Company (required, indexed)
 * @property {string} firstName - Customer first name (required)
 * @property {string} lastName - Customer last name (required)
 * @property {string[]} phones - Array of phone numbers
 * @property {string} email - Email address (validated)
 * @property {string} address - Physical address
 * @property {string} city - City name
 * @property {string} taxId - Tax identification number
 * @property {string} internalCode - Internal customer code (auto-generated if not provided)
 * @property {string} clientType - Type: 'particulier' or 'professionnel' (default: 'particulier')
 * @property {string} classification - Classification: 'vert', 'jaune', 'rouge', 'noir' (auto-calculated)
 * @property {Vehicle[]} vehicles - Array of vehicles associated with customer
 * @property {CustomerFinancialStats} financialStats - Financial statistics for classification
 * @property {boolean} isActive - Whether customer is active (default: true)
 * @property {boolean} isDeleted - Soft delete flag (default: false, indexed)
 * @property {string} notes - Additional notes about customer
 */
const customerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    // Basic information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    // Multiple phones
    phones: [
      {
        type: String,
        trim: true,
      },
    ],
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
    internalCode: {
      type: String,
      trim: true,
      unique: false, // Not globally unique, only per company
    },
    // Client type
    clientType: {
      type: String,
      enum: ['particulier', 'professionnel'],
      default: 'particulier',
      required: true,
    },
    // Automatic classification: vert (green), jaune (yellow), rouge (red), noir (black)
    // Calculated based on payment behavior, return rate, and reliability
    classification: {
      type: String,
      enum: ['vert', 'jaune', 'rouge', 'noir'],
      default: 'vert',
      required: true,
    },
    // Vehicles list
    vehicles: [vehicleSchema],
    // Financial statistics for classification calculation
    financialStats: {
      type: customerFinancialStatsSchema,
      default: () => ({}),
    },
    // Status
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
    // Loyalty program fields
    isLoyalClient: {
      type: Boolean,
      default: false,
      index: true,
    },
    loyaltyDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    monthlyAveragePurchase: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
customerSchema.index({ companyId: 1, lastName: 1, firstName: 1 });
customerSchema.index({ companyId: 1, isDeleted: 1 });
customerSchema.index({ companyId: 1, isActive: 1 });
customerSchema.index({ companyId: 1, classification: 1 });
customerSchema.index({ companyId: 1, clientType: 1 });
customerSchema.index({ companyId: 1, internalCode: 1 });
customerSchema.index({ 'vehicles.vin': 1 });
customerSchema.index({ companyId: 1, isLoyalClient: 1 });

// Virtual for full name
customerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

/**
 * Calculate customer classification based on financial statistics and business rules
 *
 * Classification Rules:
 * - VERT (Green - Good client):
 *   - No unpaid invoices
 *   - No late payments in last 6 months
 *   - Return rate < 10%
 *
 * - JAUNE (Yellow - Medium risk):
 *   - 1-2 late payments
 *   - Small unpaid balance (< 100 TND)
 *   - Return rate 10-20%
 *
 * - ROUGE (Red - High risk):
 *   - 3+ late payments
 *   - Unpaid balance > 100 TND
 *   - Return rate > 20%
 *   - Exceeded credit limit
 *
 * - NOIR (Black - Blocked):
 *   - Unpaid invoice > 30 days overdue
 *   - Fraud or bad behavior
 *   - Manually blocked by admin (blockedManually = true)
 *
 * @param {Object} stats - Financial statistics object
 * @param {number} stats.totalUnpaid - Total unpaid amount (TND)
 * @param {number} stats.totalOverdue - Total overdue amount (TND)
 * @param {number} stats.latePaymentsCount - Number of late payments in last 6 months
 * @param {number} stats.averagePaymentDelay - Average payment delay in days
 * @param {number} stats.returnRate - Return rate percentage (0-100)
 * @param {number} stats.creditLimit - Credit limit (TND)
 * @param {boolean} stats.blockedManually - Whether manually blocked
 * @returns {string} Classification: 'vert', 'jaune', 'rouge', or 'noir'
 */
customerSchema.statics.calculateClassification = function (stats = {}) {
  const {
    totalUnpaid = 0,
    totalOverdue = 0,
    latePaymentsCount = 0,
    averagePaymentDelay = 0,
    returnRate = 0,
    creditLimit = 0,
    blockedManually = false,
  } = stats;

  // Priority 1: Manual block always results in NOIR
  if (blockedManually) {
    return 'noir';
  }

  // Priority 2: Check for NOIR conditions (blocked)
  // - Unpaid invoice > 30 days overdue (totalOverdue > 0 means overdue exists)
  // - If there's overdue amount, check if any invoice is > 30 days past due
  // For simplicity, if totalOverdue > 0 and averagePaymentDelay > 30, consider it blocked
  if (totalOverdue > 0 && averagePaymentDelay > 30) {
    return 'noir';
  }

  // Priority 3: Check for ROUGE conditions (high risk)
  const hasHighRisk =
    latePaymentsCount >= 3 || // 3+ late payments
    totalUnpaid > 100 || // Unpaid balance > 100 TND
    returnRate > 20 || // Return rate > 20%
    (creditLimit > 0 && totalUnpaid > creditLimit); // Exceeded credit limit

  if (hasHighRisk) {
    return 'rouge';
  }

  // Priority 4: Check for JAUNE conditions (medium risk)
  const hasMediumRisk =
    (latePaymentsCount >= 1 && latePaymentsCount <= 2) || // 1-2 late payments
    (totalUnpaid > 0 && totalUnpaid <= 100) || // Small unpaid balance (< 100 TND)
    (returnRate >= 10 && returnRate <= 20); // Return rate 10-20%

  if (hasMediumRisk) {
    return 'jaune';
  }

  // Default: VERT (good client)
  // - No unpaid invoices (totalUnpaid === 0)
  // - No late payments in last 6 months (latePaymentsCount === 0)
  // - Return rate < 10% (returnRate < 10)
  return 'vert';
};

/**
 * Instance method to calculate classification using customer's financial stats
 *
 * @returns {string} Classification: 'vert', 'jaune', 'rouge', or 'noir'
 */
customerSchema.methods.calculateClassification = function () {
  const stats = this.financialStats || {};
  return this.constructor.calculateClassification(stats);
};

/**
 * Update financial statistics from external data sources
 * This method should be called when financial data changes (invoices, payments, returns)
 *
 * @param {Object} stats - Updated financial statistics
 * @param {number} [stats.totalUnpaid] - Total unpaid amount
 * @param {number} [stats.totalOverdue] - Total overdue amount
 * @param {number} [stats.latePaymentsCount] - Number of late payments
 * @param {number} [stats.averagePaymentDelay] - Average payment delay in days
 * @param {number} [stats.returnRate] - Return rate percentage
 * @param {number} [stats.totalPurchases] - Total purchases amount
 * @param {number} [stats.creditLimit] - Credit limit
 * @param {boolean} [stats.blockedManually] - Manual block flag
 */
customerSchema.methods.updateFinancialStats = function (stats = {}) {
  if (!this.financialStats) {
    this.financialStats = {};
  }

  // Update only provided fields
  if (stats.totalUnpaid !== undefined) {
    this.financialStats.totalUnpaid = stats.totalUnpaid;
  }
  if (stats.totalOverdue !== undefined) {
    this.financialStats.totalOverdue = stats.totalOverdue;
  }
  if (stats.latePaymentsCount !== undefined) {
    this.financialStats.latePaymentsCount = stats.latePaymentsCount;
  }
  if (stats.averagePaymentDelay !== undefined) {
    this.financialStats.averagePaymentDelay = stats.averagePaymentDelay;
  }
  if (stats.returnRate !== undefined) {
    this.financialStats.returnRate = stats.returnRate;
  }
  if (stats.totalPurchases !== undefined) {
    this.financialStats.totalPurchases = stats.totalPurchases;
  }
  if (stats.creditLimit !== undefined) {
    this.financialStats.creditLimit = stats.creditLimit;
  }
  if (stats.blockedManually !== undefined) {
    this.financialStats.blockedManually = stats.blockedManually;
  }

  // Update last calculated timestamp
  this.financialStats.lastCalculatedAt = new Date();

  // Recalculate classification automatically
  this.classification = this.calculateClassification();
};

/**
 * Manually block or unblock a customer
 *
 * @param {boolean} blocked - Whether to block (true) or unblock (false)
 */
customerSchema.methods.setBlocked = function (blocked) {
  if (!this.financialStats) {
    this.financialStats = {};
  }
  this.financialStats.blockedManually = blocked;
  // Classification will be recalculated in pre-save hook
  this.classification = this.calculateClassification();
};

/**
 * Check if customer is eligible for loyalty program
 *
 * A customer is considered loyal when:
 * - classification === 'vert'
 * - monthlyAveragePurchase >= 500 (TND)
 * - isActive === true
 * - isDeleted === false
 * - NOT manually blocked (blockedManually !== true)
 *
 * @returns {boolean} True if customer is eligible for loyalty program
 */
customerSchema.methods.isEligibleForLoyalty = function () {
  // Must be active and not deleted
  if (!this.isActive || this.isDeleted) {
    return false;
  }

  // Must not be manually blocked
  if (this.financialStats?.blockedManually === true) {
    return false;
  }

  // Must have 'vert' classification
  if (this.classification !== 'vert') {
    return false;
  }

  // Must have monthly average purchase >= 500 TND
  if (this.monthlyAveragePurchase < 500) {
    return false;
  }

  return true;
};

/**
 * Calculate loyalty discount percentage based on monthly average purchase
 *
 * Discount tiers:
 * - 500-999 TND: 1%
 * - 1000-1999 TND: 3%
 * - 2000-4999 TND: 5%
 * - 5000-9999 TND: 7%
 * - 10000+ TND: 10%
 *
 * @param {number} monthlyAveragePurchase - Monthly average purchase amount
 * @returns {number} Discount percentage (1-10)
 */
customerSchema.statics.calculateLoyaltyDiscount = function (
  monthlyAveragePurchase
) {
  if (!monthlyAveragePurchase || monthlyAveragePurchase < 500) {
    return 0;
  }

  if (monthlyAveragePurchase >= 10000) {
    return 10;
  } else if (monthlyAveragePurchase >= 5000) {
    return 7;
  } else if (monthlyAveragePurchase >= 2000) {
    return 5;
  } else if (monthlyAveragePurchase >= 1000) {
    return 3;
  } else {
    // 500-999 TND
    return 1;
  }
};

/**
 * Calculate and update loyalty status
 * This method should be called after classification and monthlyAveragePurchase are updated
 *
 * @param {number} [monthlyAveragePurchase] - Optional monthly average purchase to sync from CustomerFinance
 */
customerSchema.methods.calculateLoyaltyStatus = function (
  monthlyAveragePurchase
) {
  // Sync monthlyAveragePurchase if provided (from CustomerFinance model)
  if (monthlyAveragePurchase !== undefined) {
    this.monthlyAveragePurchase = monthlyAveragePurchase;
  }

  // Check eligibility
  const isEligible = this.isEligibleForLoyalty();

  if (isEligible) {
    this.isLoyalClient = true;
    // Calculate dynamic loyalty discount based on monthly average purchase (1% to 10%)
    // Only update if discount is 0 or if monthlyAveragePurchase has changed
    const calculatedDiscount = this.constructor.calculateLoyaltyDiscount(
      this.monthlyAveragePurchase
    );
    if (
      this.loyaltyDiscount === 0 ||
      calculatedDiscount !== this.loyaltyDiscount
    ) {
      this.loyaltyDiscount = calculatedDiscount;
    }
  } else {
    this.isLoyalClient = false;
    // Reset discount when not eligible
    this.loyaltyDiscount = 0;
  }
};

// Pre-save hook to auto-generate internal code, calculate classification, and loyalty status
customerSchema.pre('save', async function (next) {
  // Generate internal code if not provided
  if (!this.internalCode && this.companyId) {
    // Format: CL-YYYYMMDD-XXXX (auto-increment based on company)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Customer').countDocuments({
      companyId: this.companyId,
      internalCode: { $regex: `^CL-${dateStr}-` },
    });
    const suffix = String(count + 1).padStart(4, '0');
    this.internalCode = `CL-${dateStr}-${suffix}`;
  }

  // Ensure financialStats exists
  if (!this.financialStats) {
    this.financialStats = {};
  }

  // Auto-calculate classification based on financial stats
  // Priority: Manual block (blockedManually = true) always results in 'noir'
  // Otherwise, calculate based on financial statistics
  const isManuallyBlocked = this.financialStats?.blockedManually === true;

  if (isManuallyBlocked) {
    // Force 'noir' if manually blocked
    this.classification = 'noir';
  } else {
    // Recalculate classification based on financial stats
    // Only skip recalculation if classification was explicitly set AND it's not the default 'vert'
    // This allows admins to manually override classification if needed
    const classificationWasManuallySet =
      this.isModified('classification') &&
      !this.isNew &&
      this.classification !== 'vert';

    if (!classificationWasManuallySet) {
      // Auto-calculate classification
      this.classification = this.calculateClassification();
    }
    // If classification was manually set (and not 'vert'), keep it as is
  }

  // Sync monthlyAveragePurchase from CustomerFinance if available
  // This happens when calculateCustomerFinancialStats is called
  // We check if monthlyAveragePurchase needs to be synced from CustomerFinance
  if (this.isModified('financialStats') || this.isNew) {
    try {
      const CustomerFinance = mongoose.model('CustomerFinance');
      const customerFinance = await CustomerFinance.findOne({
        customerId: this._id,
        companyId: this.companyId,
      }).lean();

      if (
        customerFinance &&
        customerFinance.monthlyAveragePurchase !== undefined
      ) {
        this.monthlyAveragePurchase = customerFinance.monthlyAveragePurchase;
      }
    } catch (_error) {
      // If CustomerFinance model doesn't exist or query fails, continue without syncing
      // This is not critical for saving the customer
    }
  }

  // Calculate loyalty status after classification is determined
  // This will set isLoyalClient and loyaltyDiscount based on eligibility
  this.calculateLoyaltyStatus();

  next();
});

// Make model idempotent - check if it already exists before creating
export const Customer =
  mongoose.models.Customer || mongoose.model('Customer', customerSchema);
export default Customer;
