import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Validate cart items
const validateCartItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart must be a non-empty array');
  }

  return items.every(item => {
    if (!item.name || typeof item.name !== 'string') {
      throw new Error('Each item must have a valid name');
    }
    if (!Number.isInteger(item.price) || item.price <= 0) {
      throw new Error('Each item must have a valid price in cents');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Each item must have a valid quantity');
    }
    return true;
  });
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://jornadadeinsights.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Log request body for debugging
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      res.status(500).json({ error: 'Server configuration error: Missing STRIPE_SECRET_KEY' });
      return;
    }
    if (!process.env.FRONTEND_URL) {
      console.error('Missing FRONTEND_URL environment variable');
      res.status(500).json({ error: 'Server configuration error: Missing FRONTEND_URL' });
      return;
    }

    const { items } = req.body;

    if (!items) {
      console.error('No items provided in request body');
      res.status(400).json({ error: 'No items provided' });
      return;
    }

    // Validate cart items
    try {
      validateCartItems(items);
    } catch (error) {
      console.error('Cart validation error:', error.message);
      res.status(400).json({ error: error.message });
      return;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      locale: 'pt-BR',
      currency: 'brl',
      line_items: items.map(item => {
        // Ensure image URL is properly formatted for Stripe
        let imageUrl = item.image;
        if (imageUrl) {
          try {
            const url = new URL(imageUrl);
            url.search = '';
            url.hash = '';
            url.protocol = 'https:';
            imageUrl = url.toString();
          } catch (error) {
            console.error('Error processing image URL:', error);
            imageUrl = undefined;
          }
        }

        // Convert USD price to BRL
        const exchangeRate = 5; // This should be fetched from a real exchange rate API
        const priceInBRL = Math.round(item.price * exchangeRate);

        return {
          price_data: {
            currency: 'brl',
            product_data: {
              name: item.name,
              description: `${item.description || 'Digital eBook'} ($${(item.price/100).toFixed(2)} USD / R$${(priceInBRL/100).toFixed(2)} BRL)`,
              images: imageUrl ? [imageUrl] : [],
              metadata: { 
                ebookId: item.id,
                type: 'ebook'
              }
            },
            unit_amount: priceInBRL,
          },
          quantity: item.quantity,
          adjustable_quantity: {
            enabled: false
          }
        };
      }),
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'required'
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    // Ensure we're sending a proper JSON response even for errors
    res.status(500).json({
      error: 'An unexpected error occurred',
      details: error.message
    });
  }
} 