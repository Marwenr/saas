/**
 * Date utility functions for period calculations and comparisons
 */

/**
 * Calculate date range for a period
 * @param {string} period - "day" | "week" | "month" | "year" | "range"
 * @param {string} [from] - ISO date string YYYY-MM-DD (required if period="range")
 * @param {string} [to] - ISO date string YYYY-MM-DD (required if period="range")
 * @returns {{startDate: Date, endDate: Date}}
 */
export function getDateRange(period, from, to) {
  const now = new Date();
  let startDate;
  let endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  switch (period) {
    case 'day':
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      break;
    case 'week': {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      break;
    }
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case 'range':
      if (!from || !to) {
        throw new Error(
          'from and to dates are required when period is "range"'
        );
      }
      startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      // Default to month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  return { startDate, endDate };
}

/**
 * Calculate previous period date range
 * @param {string} period - "day" | "week" | "month" | "year" | "range"
 * @param {string} [from] - ISO date string YYYY-MM-DD (required if period="range")
 * @param {string} [to] - ISO date string YYYY-MM-DD (required if period="range")
 * @returns {{startDate: Date, endDate: Date}}
 */
export function getPreviousPeriodRange(period, from, to) {
  const currentRange = getDateRange(period, from, to);
  const duration = currentRange.endDate - currentRange.startDate;

  let previousStartDate;
  let previousEndDate;

  if (period === 'range' && from && to) {
    // For custom range, calculate previous period of same length
    previousEndDate = new Date(currentRange.startDate);
    previousEndDate.setMilliseconds(previousEndDate.getMilliseconds() - 1);
    previousStartDate = new Date(previousEndDate);
    previousStartDate.setTime(previousStartDate.getTime() - duration);
  } else {
    // For preset periods, calculate previous period
    const now = new Date();
    previousEndDate = new Date(currentRange.startDate);
    previousEndDate.setMilliseconds(previousEndDate.getMilliseconds() - 1);

    switch (period) {
      case 'day':
        previousStartDate = new Date(previousEndDate);
        previousStartDate.setHours(0, 0, 0, 0);
        break;
      case 'week': {
        const dayOfWeek = previousEndDate.getDay();
        const diff =
          previousEndDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        previousStartDate = new Date(
          previousEndDate.getFullYear(),
          previousEndDate.getMonth(),
          diff,
          0,
          0,
          0,
          0
        );
        break;
      }
      case 'month':
        previousStartDate = new Date(
          previousEndDate.getFullYear(),
          previousEndDate.getMonth(),
          1,
          0,
          0,
          0,
          0
        );
        break;
      case 'year':
        previousStartDate = new Date(
          previousEndDate.getFullYear(),
          0,
          1,
          0,
          0,
          0,
          0
        );
        break;
      default:
        previousStartDate = new Date(
          previousEndDate.getFullYear(),
          previousEndDate.getMonth(),
          1,
          0,
          0,
          0,
          0
        );
    }
  }

  return { startDate: previousStartDate, endDate: previousEndDate };
}

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
export function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display
 * @param {Date} date
 * @returns {string}
 */
export function formatDateDisplay(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
