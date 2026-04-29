import Stripe from 'stripe';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';
import { captureServerError } from './_lib/monitoring.js';

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
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'POST,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    logger.warn('create_checkout_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error('create_checkout_missing_stripe_key', requestMeta);
      res.status(500).json({ error: 'Server configuration error: Missing STRIPE_SECRET_KEY' });
      return;
    }
    if (!process.env.FRONTEND_URL) {
      logger.error('create_checkout_missing_frontend_url', requestMeta);
      res.status(500).json({ error: 'Server configuration error: Missing FRONTEND_URL' });
      return;
    }

    const { items, customerEmail } = req.body;

    if (!items) {
      logger.warn('create_checkout_missing_items', requestMeta);
      res.status(400).json({ error: 'No items provided' });
      return;
    }

    // Validate cart items
    try {
      validateCartItems(items);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid cart payload';
      logger.warn('create_checkout_validation_failed', { ...requestMeta, errorMessage });
      res.status(400).json({ error: errorMessage });
      return;
    }

    const productNames = items.map(item => item.name).join(', ');

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      locale: 'pt-BR',
      currency: 'brl',
      customer_email: typeof customerEmail === 'string' ? customerEmail : undefined,
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
            logger.warn('create_checkout_invalid_image_url', requestMeta);
            imageUrl = undefined;
          }
        }

        // Price is already in BRL cents
        return {
          price_data: {
            currency: 'brl',
            product_data: {
              name: item.name,
              description: item.description || 'Digital eBook',
              images: imageUrl ? [imageUrl] : [],
              metadata: { 
                ebookId: item.id,
                type: 'ebook'
              }
            },
            unit_amount: item.price, // Price is already in BRL cents
          },
          quantity: item.quantity,
          adjustable_quantity: {
            enabled: false
          }
        };
      }),
      payment_intent_data: {
        metadata: {
          product_names: productNames,
          type: 'ebook_purchase'
        }
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'required'
    });

    logger.info('create_checkout_session_created', {
      ...requestMeta,
      itemCount: items.length,
      hasCustomerEmail: typeof customerEmail === 'string' && customerEmail.length > 0,
    });
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    captureServerError(error, { route: 'create-checkout-session' });
    logger.error('create_checkout_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    // Ensure we're sending a proper JSON response even for errors
    res.status(500).json({
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'unknown_error',
    });
  }
} 