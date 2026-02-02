/**
 * Pricing utilities for product sale price calculation
 */

/**
 * Calculate Weighted Average Cost (CMP - Coût Moyen Pondéré)
 * CMP = (ancienStock × ancienPrix + nouvelAchat × nouveauPrix) / (ancienStock + nouvelAchat)
 *
 * @param {Object} params - Parameters for CMP calculation
 * @param {number} params.oldStock - Existing stock quantity (ancienStock)
 * @param {number} params.oldPrice - Existing average purchase price (ancienPrix)
 * @param {number} params.newPurchaseQty - New purchase quantity (nouvelAchat)
 * @param {number} params.newPurchasePrice - New purchase unit price (nouveauPrix)
 * @returns {number} Weighted average cost (CMP)
 */
export function calculateWeightedAveragePrice({
  oldStock,
  oldPrice,
  newPurchaseQty,
  newPurchasePrice,
}) {
  const oldQty = Number(oldStock) || 0;
  const oldP = Number(oldPrice) || 0;
  const newQty = Number(newPurchaseQty) || 0;
  const newP = Number(newPurchasePrice) || 0;

  // If no new purchase, return old price
  if (newQty <= 0 || newP <= 0) {
    return oldP;
  }

  // If no old stock, return new price
  if (oldQty <= 0 || oldP <= 0) {
    return newP;
  }

  // Calculate weighted average: (oldStock × oldPrice + newQty × newPrice) / (oldStock + newQty)
  const totalValue = oldQty * oldP + newQty * newP;
  const totalQty = oldQty + newQty;

  if (totalQty <= 0) {
    return 0;
  }

  const weightedAverage = totalValue / totalQty;

  // Round to 3 decimal places for consistency
  return Math.round(weightedAverage * 1000) / 1000;
}

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

  // Round to 3 decimal places
  return Math.round(priceTTC * 1000) / 1000;
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
    // Use nullish coalescing to preserve 0 values (only use defaults for null/undefined)
    const avgCost = product.purchasePrice ?? 0;
    const lastCost = product.lastPurchasePrice ?? 0;
    const targetMargin = product.marginRate ?? 20;
    const minMarginOnLast = product.minMarginOnLastPurchase ?? 10;
    const taxRate = product.taxRate ?? 0; // Default to 0 for tax, not 19

    return calculateHybridRecommendedPrice({
      avgCost,
      lastCost,
      targetMargin,
      minMarginOnLast,
      taxRate,
    });
  }

  // Default fallback: if no pricing mode matches, return current sale price or 0
  return product.salePrice || 0;
}

/**
 * Decompose product pricing to show all details
 * Returns: lastPurchasePrice, CMP (purchasePrice), priceHT, priceWithoutMargin, marginRate, taxRate
 *
 * @param {Object} product - Product document or object with pricing fields
 * @returns {Object} Decomposed pricing details
 */
export function decomposeProductPricing(product) {
  if (!product) {
    return {
      lastPurchasePrice: 0,
      cmpPrice: 0,
      priceHT: 0,
      priceWithoutMargin: 0,
      marginRate: 0,
      taxRate: 0,
      salePriceTTC: 0,
      marginAmount: 0,
      taxAmount: 0,
    };
  }

  const salePriceTTC = Number(product.salePrice) || 0;
  const taxRate = Number(product.taxRate) || 0;
  const marginRate = Number(product.marginRate) || 0;
  const cmpPrice = Number(product.purchasePrice) || 0;
  const lastPurchasePrice = Number(product.lastPurchasePrice) || 0;

  // Calculate price HT (without tax): priceHT = salePriceTTC / (1 + taxRate/100)
  let priceHT = 0;
  if (salePriceTTC > 0 && taxRate >= 0) {
    priceHT = salePriceTTC / (1 + taxRate / 100);
  }

  // Price without margin = CMP (purchasePrice)
  const priceWithoutMargin = cmpPrice;

  // Calculate margin amount: priceHT - priceWithoutMargin
  const marginAmount = priceHT - priceWithoutMargin;

  // Calculate tax amount: salePriceTTC - priceHT
  const taxAmount = salePriceTTC - priceHT;

  return {
    lastPurchasePrice: Math.round(lastPurchasePrice * 1000) / 1000,
    cmpPrice: Math.round(cmpPrice * 1000) / 1000,
    priceHT: Math.round(priceHT * 1000) / 1000,
    priceWithoutMargin: Math.round(priceWithoutMargin * 1000) / 1000,
    marginRate: Math.round(marginRate * 1000) / 1000,
    taxRate: Math.round(taxRate * 1000) / 1000,
    salePriceTTC: Math.round(salePriceTTC * 1000) / 1000,
    marginAmount: Math.round(marginAmount * 1000) / 1000,
    taxAmount: Math.round(taxAmount * 1000) / 1000,
  };
}
