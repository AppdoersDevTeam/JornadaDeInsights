import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from './_lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';
import { captureServerError } from './_lib/monitoring.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// --- action=checkout (create-checkout-session) ---

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

const handleCheckout = async (req, res, requestMeta) => {
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
};

// --- action=donation (create-donation-session) ---

const handleDonation = async (req, res, requestMeta) => {
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
};

// --- action=completed (completed-orders) ---

const handleCompleted = async (req, res, requestMeta) => {
  if (req.method !== 'GET') {
    logger.warn('completed_orders_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) {
      return;
    }

    // List all checkout sessions and filter for paid sessions
    const allSessionsList = await stripe.checkout.sessions.list({ limit: 100 });
    const paidSessions = allSessionsList.data.filter(sess => sess.payment_status === 'paid');

    // For each paid session, fetch line items and map to ebook titles
    const ordersList = await Promise.all(
      paidSessions.map(async (sess) => {
        const lineItemsList = await stripe.checkout.sessions.listLineItems(sess.id, { limit: 100 });
        const items = lineItemsList.data.map(li => {
          const price = parseFloat(((li.amount_total ?? li.price?.unit_amount ?? 0) / 100).toFixed(2));
          return {
            name: li.price_data?.product_data?.name ||
                  li.price?.product_data?.name ||
                  li.description ||
                  'Unknown Item',
            price: price,
            ebookId: li.price_data?.product_data?.metadata?.ebookId ||
                     li.price?.product_data?.metadata?.ebookId ||
                     null
          };
        });
        return {
          id: sess.id,
          date: (sess.created ?? 0) * 1000,
          name: sess.customer_details?.name || '',
          email: sess.customer_details?.email || '',
          total: parseFloat(((sess.amount_total ?? 0) / 100).toFixed(2)),
          items,
        };
      })
    );
    res.status(200).json({ orders: ordersList });
  } catch (error) {
    logger.error('completed_orders_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=export (orders-export) ---

const parseDateToUnixSeconds = (value, endOfDay = false) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  // Expect YYYY-MM-DD from the UI date inputs.
  const iso = endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor(parsed.getTime() / 1000);
};

const csvEscape = (value) => {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const handleExport = async (req, res, requestMeta) => {
  if (req.method !== 'GET') {
    logger.warn('orders_export_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const from = parseDateToUnixSeconds(req.query.from);
    const to = parseDateToUnixSeconds(req.query.to, true);
    const paidOnlyRaw = typeof req.query.paidOnly === 'string' ? req.query.paidOnly : 'true';
    const paidOnly = paidOnlyRaw !== 'false';

    const sessions = [];
    let startingAfter = undefined;

    // Paginate a reasonable amount to avoid runaway exports.
    const MAX_SESSIONS = 1000;

    while (sessions.length < MAX_SESSIONS) {
      const page = await stripe.checkout.sessions.list({
        limit: 100,
        starting_after: startingAfter,
        ...(from || to
          ? {
              created: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      });

      if (!page.data?.length) break;
      sessions.push(...page.data);
      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
      if (!startingAfter) break;
    }

    const filtered = paidOnly ? sessions.filter((s) => s.payment_status === 'paid') : sessions;

    const rows = [];
    for (const sess of filtered) {
      const lineItems = await stripe.checkout.sessions.listLineItems(sess.id, { limit: 100 });
      const itemTitles = lineItems.data.map((li) => li.description || li.price_data?.product_data?.name || li.price?.product_data?.name || 'Item');
      const itemEbookIds = lineItems.data.map((li) => li.price_data?.product_data?.metadata?.ebookId || li.price?.product_data?.metadata?.ebookId || '').filter(Boolean);

      rows.push({
        session_id: sess.id,
        created_at: new Date((sess.created || 0) * 1000).toISOString(),
        email: (sess.customer_details?.email || sess.customer_email || '').trim(),
        name: sess.customer_details?.name || '',
        total_amount: Number(((sess.amount_total || 0) / 100).toFixed(2)),
        currency: (sess.currency || 'brl').toUpperCase(),
        item_count: lineItems.data.length,
        item_titles: itemTitles.join(' | '),
        item_ebook_ids: itemEbookIds.join(' | '),
      });
    }

    const header = [
      'session_id',
      'created_at',
      'email',
      'name',
      'total_amount',
      'currency',
      'item_count',
      'item_titles',
      'item_ebook_ids',
    ];

    const csv = [
      header.join(','),
      ...rows.map((r) => header.map((k) => csvEscape(r[k])).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-export.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    logger.error('orders_export_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=mine (my-orders) ---

const getAuthenticatedUser = async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    res.status(500).json({ error: 'Missing Supabase auth configuration' });
    return null;
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    res.status(401).json({ error: 'Missing auth token' });
    return null;
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(idToken);

  if (error || !user?.email) {
    res.status(401).json({ error: 'Invalid auth token' });
    return null;
  }

  return user;
};

const handleMine = async (req, res, requestMeta) => {
  if (req.method !== 'GET') {
    logger.warn('my_orders_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) {
      return;
    }

    const allSessionsList = await stripe.checkout.sessions.list({ limit: 100 });
    const paidSessions = allSessionsList.data.filter(
      (session) =>
        session.payment_status === 'paid' &&
        (session.customer_details?.email || '').toLowerCase() === user.email?.toLowerCase()
    );

    const ordersList = await Promise.all(
      paidSessions.map(async (session) => {
        const lineItemsList = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
        const items = lineItemsList.data.map((lineItem) => {
          const price = parseFloat(((lineItem.amount_total ?? lineItem.price?.unit_amount ?? 0) / 100).toFixed(2));
          return {
            name:
              lineItem.price_data?.product_data?.name ||
              lineItem.price?.product_data?.name ||
              lineItem.description ||
              'Unknown Item',
            price,
            ebookId:
              lineItem.price_data?.product_data?.metadata?.ebookId ||
              lineItem.price?.product_data?.metadata?.ebookId ||
              null,
          };
        });

        return {
          id: session.id,
          date: (session.created ?? 0) * 1000,
          name: session.customer_details?.name || '',
          email: session.customer_details?.email || '',
          total: parseFloat(((session.amount_total ?? 0) / 100).toFixed(2)),
          items,
        };
      })
    );

    res.status(200).json({ orders: ordersList });
  } catch (error) {
    logger.error('my_orders_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  const action = req.query?.action;

  const corsMethods =
    action === 'checkout' || action === 'donation'
      ? 'POST,OPTIONS'
      : 'GET,OPTIONS';
  applyCors(req, res, { methods: corsMethods });
  if (handleOptionsRequest(req, res)) return;

  switch (action) {
    case 'checkout':
      return handleCheckout(req, res, requestMeta);
    case 'donation':
      return handleDonation(req, res, requestMeta);
    case 'completed':
      return handleCompleted(req, res, requestMeta);
    case 'export':
      return handleExport(req, res, requestMeta);
    case 'mine':
      return handleMine(req, res, requestMeta);
    default:
      res.status(404).json({ error: 'Unknown orders action' });
  }
}
