import Stripe from 'stripe';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'POST,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    logger.warn('create_donation_method_not_allowed', requestMeta);
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
      logger.error('create_donation_missing_stripe_key', requestMeta);
      return res.status(500).json({ error: 'Server configuration error: Missing STRIPE_SECRET_KEY' });
    }
    if (!process.env.FRONTEND_URL) {
      logger.error('create_donation_missing_frontend_url', requestMeta);
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
    logger.error('create_donation_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ 
      error: (error instanceof Error ? error.message : null) || 'Falha ao criar sessão de pagamento' 
    });
  }
}

