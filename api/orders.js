import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';
import { captureServerError } from '../lib/monitoring.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// --- action=checkout (create-checkout-session) ---

const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// Validate cart shape only — prices are resolved server-side from ebooks_metadata.
const validateCartItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart must be a non-empty array');
  }

  return items.every((item) => {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error('Each item must have a valid id');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Each item must have a valid quantity');
    }
    return true;
  });
};

/** Resolve authoritative BRL prices from catalog; ignore client-sent amounts. */
const resolveCheckoutItems = async (items) => {
  const supabaseAdmin = createSupabaseAdmin();
  const ids = items.map((item) => item.id);
  const { data, error } = await supabaseAdmin
    .from('ebooks_metadata')
    .select('id, title, description, price, filename')
    .in('id', ids);

  if (error) {
    throw error;
  }

  const byId = new Map((data || []).map((row) => [row.id, row]));

  return items.map((item) => {
    const row = byId.get(item.id);
    if (!row) {
      throw new Error(`Unknown ebook: ${item.id}`);
    }
    const unitAmount = Math.round(Number(row.price) * 100);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      throw new Error(`Invalid catalog price for ebook: ${item.id}`);
    }
    return {
      id: row.id,
      name: row.title || item.name || 'eBook',
      description: item.description || row.description || 'Digital eBook',
      price: unitAmount,
      quantity: item.quantity,
      image: item.image,
    };
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

    const { items, customerEmail, locale } = req.body;

    if (!items) {
      logger.warn('create_checkout_missing_items', requestMeta);
      res.status(400).json({ error: 'No items provided' });
      return;
    }

    let resolvedItems;
    try {
      validateCartItems(items);
      resolvedItems = await resolveCheckoutItems(items);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid cart payload';
      logger.warn('create_checkout_validation_failed', { ...requestMeta, errorMessage });
      res.status(400).json({ error: errorMessage });
      return;
    }

    const productNames = resolvedItems.map((item) => item.name).join(', ');
    const ebookIds = resolvedItems.map((item) => item.id).join(',');
    const stripeLocale =
      locale === 'en' || locale === 'en-US' ? 'en' : locale === 'pt' || locale === 'pt-BR' ? 'pt-BR' : 'auto';

    // Create Stripe checkout session (prices from catalog only)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      locale: stripeLocale,
      currency: 'brl',
      customer_email: typeof customerEmail === 'string' ? customerEmail : undefined,
      line_items: resolvedItems.map((item) => {
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

        return {
          price_data: {
            currency: 'brl',
            product_data: {
              name: item.name,
              description: item.description || 'Digital eBook',
              images: imageUrl ? [imageUrl] : [],
              metadata: {
                ebookId: item.id,
                type: 'ebook',
              },
            },
            unit_amount: item.price,
          },
          quantity: item.quantity,
          adjustable_quantity: {
            enabled: false,
          },
        };
      }),
      payment_intent_data: {
        metadata: {
          product_names: productNames,
          type: 'ebook_purchase',
          ebook_ids: ebookIds,
        },
      },
      metadata: {
        type: 'ebook_purchase',
        ebook_ids: ebookIds,
        locale: typeof locale === 'string' ? locale : '',
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    logger.info('create_checkout_session_created', {
      ...requestMeta,
      itemCount: resolvedItems.length,
      hasCustomerEmail: typeof customerEmail === 'string' && customerEmail.length > 0,
    });
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    captureServerError(error, { route: 'create-checkout-session' });
    logger.error('create_checkout_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({
      error: 'An unexpected error occurred',
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

    // Validate required fields (min R$5, max R$50.000)
    if (!amount || typeof amount !== 'number' || amount < 500 || amount > 5_000_000) {
      return res.status(400).json({
        error: 'O valor da doação deve ser entre R$ 5,00 e R$ 50.000,00'
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
    const noteText = typeof note === 'string' ? note.slice(0, 500) : '';

    const sessionConfig = {
      payment_method_types: ['card'],
      locale: 'auto',
      currency: 'brl',
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: isRecurring ? 'Doação Recorrente - Jornada de Insights' : 'Doação Única - Jornada de Insights',
            description: noteText || 'Doação para apoiar o ministério Jornada de Insights',
            metadata: {
              type: 'donation',
              note: noteText,
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
        note: noteText,
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

    const email = (user.email || '').toLowerCase();
    const ordersBySession = new Map();

    // Dual-path: prefer persisted purchases when table exists, still merge Stripe.
    try {
      const supabaseAdmin = createSupabaseAdmin();
      const { data: purchaseRows, error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .select('session_id, customer_email, customer_name, ebook_id, ebook_title, amount_cents, created_at')
        .ilike('customer_email', email);

      if (!purchaseError && Array.isArray(purchaseRows)) {
        for (const row of purchaseRows) {
          const sessionId = row.session_id;
          if (!ordersBySession.has(sessionId)) {
            ordersBySession.set(sessionId, {
              id: sessionId,
              date: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
              name: row.customer_name || '',
              email: row.customer_email || email,
              total: 0,
              items: [],
            });
          }
          const order = ordersBySession.get(sessionId);
          const itemPrice = parseFloat(((row.amount_cents || 0) / 100).toFixed(2));
          order.items.push({
            name: row.ebook_title || 'eBook',
            price: itemPrice,
            ebookId: row.ebook_id || null,
          });
          order.total = parseFloat(
            (order.items.reduce((sum, item) => sum + item.price, 0)).toFixed(2)
          );
        }
      }
    } catch (purchaseReadError) {
      logger.warn('my_orders_purchases_unavailable', {
        ...requestMeta,
        errorMessage:
          purchaseReadError instanceof Error ? purchaseReadError.message : 'unknown_error',
      });
    }

    const allSessionsList = await stripe.checkout.sessions.list({ limit: 100 });
    const paidSessions = allSessionsList.data.filter(
      (session) =>
        session.payment_status === 'paid' &&
        (session.customer_details?.email || session.customer_email || '').toLowerCase() === email
    );

    await Promise.all(
      paidSessions.map(async (session) => {
        if (ordersBySession.has(session.id)) {
          return;
        }
        const metaIds = (session.metadata?.ebook_ids || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        const lineItemsList = await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
        });
        const items = lineItemsList.data.map((lineItem, index) => {
          const price = parseFloat(
            ((lineItem.amount_total ?? lineItem.price?.unit_amount ?? 0) / 100).toFixed(2)
          );
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
              metaIds[index] ||
              null,
          };
        });

        ordersBySession.set(session.id, {
          id: session.id,
          date: (session.created ?? 0) * 1000,
          name: session.customer_details?.name || '',
          email: session.customer_details?.email || session.customer_email || '',
          total: parseFloat(((session.amount_total ?? 0) / 100).toFixed(2)),
          items,
        });
      })
    );

    const ordersList = Array.from(ordersBySession.values()).sort((a, b) => b.date - a.date);
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
