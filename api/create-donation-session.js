import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://jornadadeinsights.com'
    : 'http://localhost:5173');
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
    const { amount, note, isRecurring } = req.body;

    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount < 500) {
      return res.status(400).json({ 
        error: 'O valor mínimo da doação é R$ 5,00 (500 centavos)' 
      });
    }

    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return res.status(500).json({ error: 'Server configuration error: Missing STRIPE_SECRET_KEY' });
    }
    if (!process.env.FRONTEND_URL) {
      console.error('Missing FRONTEND_URL environment variable');
      return res.status(500).json({ error: 'Server configuration error: Missing FRONTEND_URL' });
    }

    // Create Stripe checkout session for donation
    const sessionConfig = {
      payment_method_types: ['card'],
      locale: 'pt-BR',
      currency: 'brl',
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: isRecurring ? 'Doação Recorrente - Jornada de Insights' : 'Doação Única - Jornada de Insights',
            description: note || 'Doação para apoiar o ministério Jornada de Insights',
            metadata: {
              type: 'donation',
              note: note || '',
            }
          },
          unit_amount: amount, // Amount in cents
          ...(isRecurring && {
            recurring: {
              interval: 'month'
            }
          })
        },
        quantity: 1,
      }],
      mode: isRecurring ? 'subscription' : 'payment',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&type=donation`,
      cancel_url: `${process.env.FRONTEND_URL}/donation`,
      allow_promotion_codes: false,
      billing_address_collection: 'required',
      metadata: {
        type: 'donation',
        isRecurring: isRecurring ? 'true' : 'false',
        note: note || '',
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating donation checkout session:', error);
    res.status(500).json({ 
      error: error.message || 'Falha ao criar sessão de pagamento' 
    });
  }
}

