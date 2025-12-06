/**
 * Company controller
 */
import Company from '../models/company.model.js';
import User from '../models/User.js';

/**
 * Register a new company with owner
 * This creates both the company and the owner user atomically
 * If user creation fails, the company is cleaned up automatically
 */
export async function registerCompany(request, reply) {
  // Extract and normalize emails early for use in error handling
  const {
    // Company data
    companyName,
    companyEmail: rawCompanyEmail,
    companyPhone,
    companyAddress,
    companyCountry,
    companyTaxId,
    // Owner user data
    ownerEmail: rawOwnerEmail,
    ownerPassword,
    ownerName,
  } = request.body;

  // Normalize emails (lowercase and trim)
  const companyEmail = rawCompanyEmail?.toLowerCase().trim();
  const ownerEmail = rawOwnerEmail?.toLowerCase().trim();

  try {
    // Validate required fields
    if (!companyName || !companyEmail || !ownerEmail || !ownerPassword) {
      return reply.code(400).send({
        error:
          'Company name, company email, owner email, and owner password are required',
      });
    }

    // Check if company email already exists
    // Email is normalized (lowercased and trimmed) above, and schema has lowercase: true
    // This ensures case-insensitive duplicate detection
    const existingCompany = await Company.findOne({ email: companyEmail });
    if (existingCompany) {
      return reply.code(409).send({
        error: 'This email is already used for other company',
      });
    }

    // Check if owner email already exists
    // Need to lowercase the query email to match what's stored (schema has lowercase: true)
    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser) {
      return reply.code(409).send({
        error: 'User with this email already exists',
      });
    }

    // Create company and owner
    // Create sequentially and clean up on error
    // Note: Transactions require replica sets, so we use sequential creation
    // with cleanup for better compatibility across environments
    let company;
    let owner;

    try {
      // Create company first
      company = await Company.create({
        name: companyName,
        email: companyEmail,
        phone: companyPhone || undefined,
        address: companyAddress || undefined,
        country: companyCountry || undefined,
        taxId: companyTaxId || undefined,
        subscriptionPlan: 'basic',
        isActive: true,
      });

      // Create owner user linked to company
      owner = await User.create({
        email: ownerEmail,
        password: ownerPassword,
        name: ownerName || '',
        companyId: company._id,
        role: 'owner',
      });
    } catch (createError) {
      // If user creation failed, try to clean up the company
      if (company && company._id) {
        try {
          await Company.findByIdAndDelete(company._id);
        } catch (cleanupError) {
          // Log cleanup error but don't fail the request
          request.log.warn(
            'Failed to cleanup company after user creation error:',
            cleanupError
          );
        }
      }
      // Re-throw the original error to be handled by outer catch block
      throw createError;
    }

    // Generate tokens
    const accessToken = request.server.jwt.sign(
      {
        userId: owner._id,
        companyId: company._id.toString(),
        role: owner.role || 'owner',
      },
      { expiresIn: '15m' }
    );

    const refreshToken = request.server.jwt.sign(
      {
        userId: owner._id,
        companyId: company._id.toString(),
      },
      { expiresIn: '7d' }
    );

    // Set secure cookies
    // Use 'none' for cross-origin in production, 'strict' for same-origin in development
    const isProduction = process.env.NODE_ENV === 'production';
    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return reply.code(201).send({
      user: {
        id: owner._id.toString(),
        email: owner.email,
        name: owner.name,
        role: owner.role,
        companyId: company._id.toString(),
      },
      company: {
        id: company._id.toString(),
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        country: company.country,
        taxId: company.taxId,
        subscriptionPlan: company.subscriptionPlan,
        isActive: company.isActive,
      },
    });
  } catch (error) {
    console.log(error);
    request.log.error(error);

    // Handle duplicate key errors (MongoDB unique index violations)
    if (error.code === 11000 || error.code === 11001) {
      const field = error.keyPattern
        ? Object.keys(error.keyPattern)[0]
        : 'field';
      if (field === 'email') {
        // Check if it's company or user email (emails are already normalized)
        const duplicateEmail = error.keyValue?.email?.toLowerCase();
        // Check if it's a company email duplicate
        if (duplicateEmail && companyEmail && duplicateEmail === companyEmail) {
          return reply.code(409).send({
            error: 'This email is already used for other company',
          });
        } else if (
          duplicateEmail &&
          ownerEmail &&
          duplicateEmail === ownerEmail
        ) {
          return reply.code(409).send({
            error: 'User with this email already exists',
          });
        }
        // If we can't determine which email, check the collection/model
        // MongoDB error might indicate which collection had the duplicate
        if (error.message && error.message.includes('companies')) {
          return reply.code(409).send({
            error: 'This email is already used for other company',
          });
        }
      }
      return reply.code(409).send({
        error: 'Duplicate entry detected',
        details: error.message,
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    return reply.code(500).send({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

/**
 * Get company information (protected route)
 */
export async function getCompany(request, reply) {
  try {
    const user = await User.findById(request.user.userId).populate('companyId');

    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }

    // Platform admins don't have a company (they can see all companies later)
    if (user.role === 'platform_admin') {
      return reply.code(404).send({
        error: 'Platform admins are not associated with a company',
      });
    }

    // Regular users must have a company
    if (!user.companyId) {
      return reply.code(403).send({
        error: 'User is not associated with a company',
      });
    }

    const company = user.companyId;
    if (!company) {
      return reply.code(404).send({
        error: 'Company not found',
      });
    }

    return reply.send({
      company: {
        id: company._id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        country: company.country,
        taxId: company.taxId,
        subscriptionPlan: company.subscriptionPlan,
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}
