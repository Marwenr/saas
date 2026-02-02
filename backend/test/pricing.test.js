/**
 * Test: HYBRID Pricing Calculation
 */
import { describe, it, expect } from 'vitest';

import {
  calculateHybridRecommendedPrice,
  calculateRecommendedSalePrice,
} from '../src/utils/pricing.js';

describe('HYBRID Pricing Calculation', () => {
  describe('calculateHybridRecommendedPrice', () => {
    it('should calculate price with target margin and minimum protection', () => {
      const result = calculateHybridRecommendedPrice({
        avgCost: 100,
        lastCost: 100,
        targetMargin: 20,
        minMarginOnLast: 10,
        taxRate: 19,
      });

      // priceTarget = 100 * 1.20 = 120
      // priceMinSafe = 100 * 1.10 = 110
      // priceHT = max(120, 110) = 120
      // priceTTC = 120 * 1.19 = 142.80
      expect(result).toBeCloseTo(142.8, 2);
    });

    it('should use minimum safe price when last cost is higher', () => {
      const result = calculateHybridRecommendedPrice({
        avgCost: 50,
        lastCost: 100,
        targetMargin: 20,
        minMarginOnLast: 10,
        taxRate: 19,
      });

      // priceTarget = 50 * 1.20 = 60
      // priceMinSafe = 100 * 1.10 = 110
      // priceHT = max(60, 110) = 110 (protection wins)
      // priceTTC = 110 * 1.19 = 130.90
      expect(result).toBeCloseTo(130.9, 2);
    });

    it('should use target price when average cost is higher', () => {
      const result = calculateHybridRecommendedPrice({
        avgCost: 100,
        lastCost: 50,
        targetMargin: 20,
        minMarginOnLast: 10,
        taxRate: 19,
      });

      // priceTarget = 100 * 1.20 = 120
      // priceMinSafe = 50 * 1.10 = 55
      // priceHT = max(120, 55) = 120 (target wins)
      // priceTTC = 120 * 1.19 = 142.80
      expect(result).toBeCloseTo(142.8, 2);
    });

    it('should handle zero margin rate', () => {
      const result = calculateHybridRecommendedPrice({
        avgCost: 100,
        lastCost: 100,
        targetMargin: 0,
        minMarginOnLast: 10,
        taxRate: 19,
      });

      // priceTarget = 0 (no gain)
      // priceMinSafe = 100 * 1.10 = 110
      // priceHT = 110 (only protection)
      // priceTTC = 110 * 1.19 = 130.90
      expect(result).toBeCloseTo(130.9, 2);
    });

    it('should handle zero tax rate', () => {
      const result = calculateHybridRecommendedPrice({
        avgCost: 100,
        lastCost: 100,
        targetMargin: 20,
        minMarginOnLast: 10,
        taxRate: 0,
      });

      // priceTarget = 100 * 1.20 = 120
      // priceMinSafe = 100 * 1.10 = 110
      // priceHT = max(120, 110) = 120
      // priceTTC = 120 * 1.00 = 120
      expect(result).toBeCloseTo(120.0, 2);
    });

    it('should round to 2 decimal places', () => {
      const result = calculateHybridRecommendedPrice({
        avgCost: 33.33,
        lastCost: 33.33,
        targetMargin: 20,
        minMarginOnLast: 10,
        taxRate: 19,
      });

      // Should be rounded to 3 decimal places
      const rounded = Math.round(result * 1000) / 1000;
      expect(result).toBe(rounded);
      expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(
        3
      );
    });

    it('should return 0 when no costs available', () => {
      const result = calculateHybridRecommendedPrice({
        avgCost: 0,
        lastCost: 0,
        targetMargin: 20,
        minMarginOnLast: 10,
        taxRate: 19,
      });

      expect(result).toBe(0);
    });

    it('should handle string numbers', () => {
      const result = calculateHybridRecommendedPrice({
        avgCost: '100',
        lastCost: '100',
        targetMargin: '20',
        minMarginOnLast: '10',
        taxRate: '19',
      });

      expect(result).toBeCloseTo(142.8, 2);
    });
  });

  describe('calculateRecommendedSalePrice', () => {
    it('should calculate price for product with HYBRID mode', () => {
      const product = {
        pricingMode: 'HYBRID',
        purchasePrice: 100,
        lastPurchasePrice: 100,
        marginRate: 20,
        minMarginOnLastPurchase: 10,
        taxRate: 19,
      };

      const result = calculateRecommendedSalePrice(product);
      expect(result).toBeCloseTo(142.8, 2);
    });

    it('should use default values when fields are missing', () => {
      const product = {
        pricingMode: 'HYBRID',
        purchasePrice: 100,
        lastPurchasePrice: 100,
        // marginRate missing -> defaults to 20
        // minMarginOnLastPurchase missing -> defaults to 10
        // taxRate missing -> defaults to 19
      };

      const result = calculateRecommendedSalePrice(product);
      expect(result).toBeCloseTo(142.8, 2);
    });

    it('should handle product with only average cost', () => {
      const product = {
        pricingMode: 'HYBRID',
        purchasePrice: 100,
        lastPurchasePrice: 0,
        marginRate: 20,
        minMarginOnLastPurchase: 10,
        taxRate: 19,
      };

      const result = calculateRecommendedSalePrice(product);
      // priceTarget = 100 * 1.20 = 120
      // priceMinSafe = 0 (no last cost)
      // priceHT = 120
      // priceTTC = 120 * 1.19 = 142.80
      expect(result).toBeCloseTo(142.8, 2);
    });

    it('should handle product with only last cost', () => {
      const product = {
        pricingMode: 'HYBRID',
        purchasePrice: 0,
        lastPurchasePrice: 100,
        marginRate: 20,
        minMarginOnLastPurchase: 10,
        taxRate: 19,
      };

      const result = calculateRecommendedSalePrice(product);
      // priceTarget = 0 (no average cost)
      // priceMinSafe = 100 * 1.10 = 110
      // priceHT = 110
      // priceTTC = 110 * 1.19 = 130.90
      expect(result).toBeCloseTo(130.9, 2);
    });

    it('should return 0 for null/undefined product', () => {
      expect(calculateRecommendedSalePrice(null)).toBe(0);
      expect(calculateRecommendedSalePrice(undefined)).toBe(0);
    });

    it('should return current salePrice for non-HYBRID mode', () => {
      const product = {
        pricingMode: 'OTHER',
        salePrice: 150,
      };

      const result = calculateRecommendedSalePrice(product);
      expect(result).toBe(150);
    });
  });
});
