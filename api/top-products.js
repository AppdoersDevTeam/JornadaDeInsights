import Stripe from 'stripe';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';

// Initialize Stripe with error handling
let stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
} catch (error) {
  logger.error('top_products_stripe_init_failed', {
    errorMessage: error instanceof Error ? error.message : 'unknown_error',
  });
}

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    logger.warn('top_products_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Validate Stripe initialization
  if (!stripe) {
    logger.error('top_products_stripe_unavailable', requestMeta);
    res.status(500).json({ 
      error: 'Payment service unavailable',
      products: [] // Return empty array instead of error
    });
    return;
  }

  try {
    // Get current month's start date
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthUnix = Math.floor(startOfMonth.getTime() / 1000);
    
    // Fetch successful charges from this month with error handling
    let charges;
    try {
      charges = await stripe.charges.list({
        created: { gte: startOfMonthUnix },
        limit: 100,
        status: 'succeeded'
      });
    } catch (stripeError) {
      logger.error('top_products_stripe_api_failed', {
        ...requestMeta,
        errorMessage: stripeError instanceof Error ? stripeError.message : 'unknown_error',
      });
      // Return empty array instead of error
      res.json({ products: [] });
      return;
    }

    // Validate charges data
    if (!charges?.data || !Array.isArray(charges.data)) {
      logger.warn('top_products_invalid_stripe_payload', requestMeta);
      res.json({ products: [] });
      return;
    }

    // Normalize by a single currency to avoid mixing totals from different currencies.
    const primaryCurrency = charges.data.find((charge) => charge.currency)?.currency || 'brl';
    const normalizedCharges = charges.data.filter((charge) => charge.currency === primaryCurrency);

    // Group charges by product name and count sales/revenue.
    const productMap = new Map();

    normalizedCharges.forEach(charge => {
      if (!charge) return; // Skip invalid charges
      const productNames = charge.metadata?.product_names || charge.description || 'Unknown Product';
      const chargeAmount = (charge.amount || 0) / 100;
      productNames.split(',').forEach(name => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const current = productMap.get(trimmed) || { sales: 0, revenue: 0 };
        productMap.set(trimmed, {
          sales: current.sales + 1,
          revenue: Number((current.revenue + chargeAmount).toFixed(2)),
        });
      });
    });

    // Convert to array and sort by sales
    const products = Array.from(productMap.entries())
      .map(([name, data]) => ({
        name: name || 'Unknown Product',
        sales: data.sales || 0,
        revenue: data.revenue || 0,
      }))
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 3); // Get top 3 products

    // Always return a valid response
    res.json({ 
      products,
      currency: primaryCurrency.toUpperCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('top_products_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    // Return empty array instead of error
    res.json({ 
      products: [],
      currency: 'BRL',
      timestamp: new Date().toISOString()
    });
  }
} 