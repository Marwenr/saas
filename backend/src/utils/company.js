/**
 * Company utility functions for multi-tenant filtering
 */
import mongoose from 'mongoose';

/**
 * Get company filter for database queries
 * Platform admins can see all companies (no filter)
 * Regular users can only see their own company data
 *
 * @param {Object} user - User object from JWT token (request.user)
 * @returns {Object} MongoDB filter object
 */
export function getCompanyFilter(user) {
  // Platform admins can access all companies
  if (user.role === 'platform_admin') {
    return {};
  }

  // Regular users can only access their own company
  const companyId = extractCompanyId(user.companyId);
  if (companyId) {
    return { companyId };
  }

  // If user has no companyId and is not platform admin, return a filter that matches nothing
  // This should not happen in normal operation due to validation
  return { companyId: null };
}

/**
 * Ensure user has access to a specific company
 *
 * @param {Object} user - User object from JWT token (request.user)
 * @param {String|ObjectId} companyId - Company ID to check access for
 * @returns {Boolean} True if user has access, false otherwise
 */
export function hasCompanyAccess(user, companyId) {
  // Platform admins have access to all companies
  if (user.role === 'platform_admin') {
    return true;
  }

  // Regular users can only access their own company
  return user.companyId && user.companyId.toString() === companyId.toString();
}

/**
 * Extract company ID from user object, handling various formats
 *
 * @param {any} companyIdValue - Company ID value (could be string, ObjectId, or object)
 * @returns {String|null} Company ID string or null
 */
function extractCompanyId(companyIdValue) {
  if (!companyIdValue) {
    return null;
  }

  // Handle Mongoose ObjectId
  if (companyIdValue instanceof mongoose.Types.ObjectId) {
    return companyIdValue.toString();
  }

  // Handle plain objects (e.g., populated company object)
  if (typeof companyIdValue === 'object' && companyIdValue !== null) {
    // If it's an object with _id property, extract the _id
    if (companyIdValue._id) {
      return companyIdValue._id instanceof mongoose.Types.ObjectId
        ? companyIdValue._id.toString()
        : String(companyIdValue._id);
    }
    // Try to convert to string
    return String(companyIdValue);
  }

  // If it's a string, validate and extract ObjectId if needed
  if (typeof companyIdValue === 'string') {
    // Check if it's a valid 24-character hex ObjectId
    const validObjectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (validObjectIdRegex.test(companyIdValue)) {
      // Valid ObjectId string, use as-is
      return companyIdValue;
    }

    // Might be a stringified object, try to extract ObjectId
    // Pattern: _id: new ObjectId('...')
    const objectIdMatch = companyIdValue.match(
      /ObjectId\(['"]([0-9a-fA-F]{24})['"]\)/i
    );
    if (objectIdMatch && objectIdMatch[1]) {
      return objectIdMatch[1];
    }

    // Try JSON parsing as fallback
    try {
      const parsed = JSON.parse(companyIdValue);
      if (parsed && parsed._id) {
        return String(parsed._id);
      }
    } catch (_e) {
      // Not valid JSON
    }
  }

  return null;
}

/**
 * Get user's company ID from JWT token
 *
 * @param {Object} user - User object from JWT token (request.user)
 * @returns {String|null} Company ID or null
 */
export function getUserCompanyId(user) {
  if (!user || !user.companyId) {
    return null;
  }
  return extractCompanyId(user.companyId);
}
