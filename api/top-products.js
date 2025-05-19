import Stripe from 'stripe';

// Initialize Stripe with error handling
let stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://jornadadeinsights.com'
    : 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Validate Stripe initialization
  if (!stripe) {
    console.error('Stripe not initialized');
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
    
    console.log('Fetching charges from:', new Date(startOfMonthUnix * 1000).toISOString());

    // Fetch successful charges from this month with error handling
    let charges;
    try {
      charges = await stripe.charges.list({
        created: { gte: startOfMonthUnix },
        limit: 100,
        status: 'succeeded'
      });
      console.log('Received charges:', charges?.data?.length || 0, 'charges');
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError);
      // Return empty array instead of error
      res.json({ products: [] });
      return;
    }

    // Validate charges data
    if (!charges?.data || !Array.isArray(charges.data)) {
      console.error('Invalid charges data received from Stripe');
      res.json({ products: [] });
      return;
    }

    // Group charges by product name and count sales
    const productMap = new Map();

    charges.data.forEach(charge => {
      if (!charge) return; // Skip invalid charges
      const productName = charge.description || 'Unknown Product';
      const current = productMap.get(productName) || { sales: 0 };
      productMap.set(productName, {
        sales: current.sales + 1
      });
    });

    console.log('Product map entries:', productMap.size);

    // Convert to array and sort by sales
    const products = Array.from(productMap.entries())
      .map(([name, data]) => ({
        name: name || 'Unknown Product',
        sales: data.sales || 0
      }))
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 3); // Get top 3 products

    console.log('Final products array:', products);

    // Always return a valid response
    res.json({ 
      products,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in top-products handler:', error);
    // Return empty array instead of error
    res.json({ 
      products: [],
      timestamp: new Date().toISOString()
    });
  }
} 