/**
 * Reports routes
 */
import {
  getRecommendedSuppliersReport,
  getSalesProductsReport,
  getStockAlertsReport,
  getTopProductsReport,
  getSalesSummaryReport,
} from '../controllers/reportsController.js';
import { authenticate } from '../utils/auth.js';

async function reportRoutes(fastify, _options) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Recommended suppliers report
  fastify.get('/recommended-suppliers', getRecommendedSuppliersReport);

  // Sales products analytics report
  fastify.get('/sales-products', getSalesProductsReport);

  // Stock alerts report
  fastify.get('/stock-alerts', getStockAlertsReport);

  // Top products report
  fastify.get('/top-products', getTopProductsReport);

  // Sales summary report
  fastify.get('/sales-summary', getSalesSummaryReport);
}

export default reportRoutes;
