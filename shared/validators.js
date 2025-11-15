/**
 * Simple JavaScript validation helpers
 */

/**
 * Check if a value is empty (null, undefined, empty string, or whitespace)
 * @param {any} value - Value to check
 * @returns {boolean} True if value is empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
}

/**
 * Check if a value is not empty
 * @param {any} value - Value to check
 * @returns {boolean} True if value is not empty
 */
export function isNotEmpty(value) {
  return !isEmpty(value);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} [options={}] - Validation options
 * @param {number} [options.minLength=8] - Minimum length
 * @param {boolean} [options.requireUppercase=false] - Require uppercase letter
 * @param {boolean} [options.requireLowercase=false] - Require lowercase letter
 * @param {boolean} [options.requireNumber=false] - Require number
 * @param {boolean} [options.requireSpecial=false] - Require special character
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    requireUppercase = false,
    requireLowercase = false,
    requireNumber = false,
    requireSpecial = false,
  } = options;

  const errors = [];

  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
export function isValidUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a string has minimum length
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} True if string meets minimum length
 */
export function hasMinLength(value, minLength) {
  if (typeof value !== 'string') {
    return false;
  }
  return value.trim().length >= minLength;
}

/**
 * Validate that a string has maximum length
 * @param {string} value - String to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} True if string meets maximum length
 */
export function hasMaxLength(value, maxLength) {
  if (typeof value !== 'string') {
    return false;
  }
  return value.trim().length <= maxLength;
}

/**
 * Validate that a string is within length range
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {boolean} True if string is within range
 */
export function isLengthInRange(value, minLength, maxLength) {
  return hasMinLength(value, minLength) && hasMaxLength(value, maxLength);
}

/**
 * Validate that a value is a number
 * @param {any} value - Value to validate
 * @returns {boolean} True if value is a number
 */
export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Validate that a value is an integer
 * @param {any} value - Value to validate
 * @returns {boolean} True if value is an integer
 */
export function isInteger(value) {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * Validate that a number is within a range
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if number is within range
 */
export function isInRange(value, min, max) {
  if (!isNumber(value)) {
    return false;
  }
  return value >= min && value <= max;
}

/**
 * Validate that a value is a valid date
 * @param {any} value - Value to validate
 * @returns {boolean} True if value is a valid date
 */
export function isValidDate(value) {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return false;
}

/**
 * Validate that a date is in the future
 * @param {any} value - Date to validate
 * @returns {boolean} True if date is in the future
 */
export function isFutureDate(value) {
  if (!isValidDate(value)) {
    return false;
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime() > Date.now();
}

/**
 * Validate that a date is in the past
 * @param {any} value - Date to validate
 * @returns {boolean} True if date is in the past
 */
export function isPastDate(value) {
  if (!isValidDate(value)) {
    return false;
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime() < Date.now();
}

/**
 * Validate that a value matches a regular expression
 * @param {string} value - Value to validate
 * @param {RegExp} regex - Regular expression to match
 * @returns {boolean} True if value matches regex
 */
export function matchesRegex(value, regex) {
  if (typeof value !== 'string') {
    return false;
  }
  return regex.test(value);
}

/**
 * Validate that a value is one of the allowed values
 * @param {any} value - Value to validate
 * @param {any[]} allowedValues - Array of allowed values
 * @returns {boolean} True if value is in allowed values
 */
export function isOneOf(value, allowedValues) {
  return allowedValues.includes(value);
}
