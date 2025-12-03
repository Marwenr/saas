/**
 * Pricing utilities for product sale price calculation
 */

/**
 * Calculate recommended sale price using HYBRID pricing mode
 *
 * HYBRID mode ensures:
 * - marginRate (Taux de gain): Applied independently to average cost (gain/profit)
 * - minMarginOnLastPurchase (Marge min. sur dernier achat): Applied independently as protection
 * - taxRate (Taux de TVA): Applied independently to the final price
 *
 * All 3 are independent and included in the automatic calculation.
 *
 * @param {Object} params - Pricing parameters
 * @param {number} params.avgCost - Weighted average purchase cost (all stock layers)
 * @param {number} params.lastCost - Last purchase unit cost (from latest reception)
 * @param {number} params.targetMargin - Product margin target/gain (e.g. 30 for 30%)
 * @param {number} params.minMarginOnLast - Minimum margin protection on last cost (e.g. 10 for 10%)
 * @param {number} params.taxRate - Tax rate (e.g. 19 for 19%)
 * @returns {number} Recommended sale price (TTC - including tax)
 */
export function calculateHybridRecommendedPrice({
  avgCost,
  lastCost,
  targetMargin,
  minMarginOnLast,
  taxRate = 0,
}) {
  // Ensure all values are valid numbers
  const avg = Number(avgCost) || 0;
  const last = Number(lastCost) || 0;
  const target = Number(targetMargin) || 0;
  const min = Number(minMarginOnLast) || 0;
  const tax = Number(taxRate) || 0;

  // If no costs available, return 0
  if (avg <= 0 && last <= 0) {
    return 0;
  }

  // Step 1: Calculate price HT with gain (marginRate) - independent
  // priceTarget = avgCost * (1 + targetMargin / 100)
  const priceTarget = avg > 0 && target > 0 ? avg * (1 + target / 100) : 0;

  // Step 2: Calculate minimum safe price HT (minMarginOnLastPurchase) - independent
  // priceMinSafe = lastCost * (1 + minMarginOnLast / 100)
  const priceMinSafe = last > 0 ? last * (1 + min / 100) : 0;

  // Step 3: Get the best HT price (maximum of both to avoid losses)
  let priceHT = 0;
  if (target > 0 && priceTarget > 0) {
    priceHT = Math.max(priceTarget, priceMinSafe);
  } else {
    priceHT = priceMinSafe;
  }

  // Step 4: Add tax (taxRate) - independent
  // priceTTC = priceHT * (1 + taxRate / 100)
  const priceTTC = priceHT > 0 ? priceHT * (1 + tax / 100) : 0;

  // Round to 2 decimal places
  return Math.round(priceTTC * 100) / 100;
}

/**
 * Calculate recommended sale price for a product based on its pricing mode
 *
 * @param {Object} product - Product document or object with pricing fields
 * @returns {number} Recommended sale price (TTC - including tax)
 */
export function calculateRecommendedSalePrice(product) {
  if (!product) {
    return 0;
  }

  const pricingMode = product.pricingMode || 'HYBRID';

  if (pricingMode === 'HYBRID') {
    return calculateHybridRecommendedPrice({
      avgCost: product.purchasePrice || 0,
      lastCost: product.lastPurchasePrice || 0,
      targetMargin: product.marginRate || 20,
      minMarginOnLast: product.minMarginOnLastPurchase || 10,
      taxRate: product.taxRate || 19,
    });
  }

  // Default fallback: if no pricing mode matches, return current sale price or 0
  return product.salePrice || 0;
}
