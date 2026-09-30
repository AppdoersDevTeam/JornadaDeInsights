import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, requireUser } from '../lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';
import { captureServerError } from '../lib/monitoring.js';
import {
  buildPurchaseRows,
  emailOwnsProduct,
  listPaidSessionsForEmail,
  listProductSaleSessions,
  listSessionProducts,
  persistPurchaseRows,
  reconcilePurchaseRows,
  resolveEbookIdsByTitle,
} from '../lib/stripe-purchases.js';

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

// Validate cart shape only — prices are resolved server-side from the catalog.
// Items: { type: 'ebook' | 'course', id, quantity }. A missing type means ebook (older clients).
const itemType = (item) => (item.type === 'course' ? 'course' : 'ebook');

const validateCartItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart must be a non-empty array');
  }
  if (items.length > 50) {
    throw new Error('Cart has too many items');
  }

  return items.every((item) => {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error('Each item must have a valid id');
    }
    if (item.type !== undefined && item.type !== 'ebook' && item.type !== 'course') {
      throw new Error('Each item must have a valid type');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Each item must have a valid quantity');
    }
    return true;
  });
};

const toUnitAmount = (price, label) => {
  const unitAmount = Math.round(Number(price) * 100);
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
    throw new Error(`Invalid catalog price for ${label}`);
  }
  return unitAmount;
};

/** Resolve authoritative BRL prices from catalog; ignore client-sent amounts. */
const resolveCheckoutItems = async (items) => {
  const supabaseAdmin = createSupabaseAdmin();
  const ebookIds = items.filter((item) => itemType(item) === 'ebook').map((item) => item.id);
  const courseIds = items.filter((item) => itemType(item) === 'course').map((item) => item.id);

  const [ebooksRes, coursesRes] = await Promise.all([
    ebookIds.length
      ? supabaseAdmin.from('ebooks_metadata').select('id, title, description, price').in('id', ebookIds)
      : Promise.resolve({ data: [], error: null }),
    courseIds.length
      ? supabaseAdmin
          .from('courses')
          .select('id, title, subtitle, price')
          .in('id', courseIds)
          .eq('is_published', true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (ebooksRes.error) throw ebooksRes.error;
  if (coursesRes.error) throw coursesRes.error;

  const ebooksById = new Map((ebooksRes.data || []).map((row) => [row.id, row]));
  const coursesById = new Map((coursesRes.data || []).map((row) => [row.id, row]));
  const seenCourses = new Set();

  return items.map((item) => {
    if (itemType(item) === 'course') {
      const row = coursesById.get(item.id);
      if (!row) {
        throw new Error(`Unknown course: ${item.id}`);
      }
      if (seenCourses.has(row.id)) {
        throw new Error(`Duplicate course in cart: ${item.id}`);
      }
      seenCourses.add(row.id);
      return {
        type: 'course',
        id: row.id,
        name: row.title || 'Course',
        description: row.subtitle || 'Online course',
        price: toUnitAmount(row.price, `course: ${item.id}`),
        quantity: 1,
        image: item.image,
      };
    }

    const row = ebooksById.get(item.id);
    if (!row) {
      throw new Error(`Unknown ebook: ${item.id}`);
    }
    return {
      type: 'ebook',
      id: row.id,
      name: row.title || item.name || 'eBook',
      description: item.description || row.description || 'Digital eBook',
      price: toUnitAmount(row.price, `ebook: ${item.id}`),
      quantity: item.quantity,
      image: item.image,
    };
  });
};

/** Optional bearer auth: the user, or null when the token is absent or invalid. */
const getOptionalUser = async (req) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabaseAdmin = createSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;
  return user;
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

    const courseItems = resolvedItems.filter((item) => item.type === 'course');
    let buyerEmail = typeof customerEmail === 'string' ? customerEmail : undefined;

    // Course access is tied to the account email, so course carts require sign-in
    // and are charged to that email.
    if (courseItems.length > 0) {
      const user = await getOptionalUser(req);
      if (!user) {
        res.status(401).json({ error: 'Sign in to buy a course', code: 'auth_required' });
        return;
      }
      buyerEmail = user.email;

      const supabaseAdmin = createSupabaseAdmin();
      for (const course of courseItems) {
        const owns = await emailOwnsProduct({
          stripe,
          supabaseAdmin,
          email: user.email,
          type: 'course',
          productId: course.id,
        });
        if (owns) {
          res
            .status(409)
            .json({ error: 'You already own this course', code: 'already_owned', courseId: course.id });
          return;
        }
      }
    }

    const productNames = resolvedItems.map((item) => item.name).join(', ').slice(0, 500);
    const ebookIds = resolvedItems
      .filter((item) => item.type === 'ebook')
      .map((item) => item.id)
      .join(',');
    const courseIds = courseItems.map((item) => item.id).join(',');
    const purchaseType = courseItems.length > 0 ? 'course_purchase' : 'ebook_purchase';
    const stripeLocale =
      locale === 'en' || locale === 'en-US' ? 'en' : locale === 'pt' || locale === 'pt-BR' ? 'pt-BR' : 'auto';

    // Create Stripe checkout session (prices from catalog only)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      locale: stripeLocale,
      currency: 'brl',
      customer_email: buyerEmail,
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
              metadata:
                item.type === 'course'
                  ? { type: 'course', courseId: item.id }
                  : { type: 'ebook', ebookId: item.id },
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
          type: purchaseType,
          ebook_ids: ebookIds.slice(0, 500),
          course_ids: courseIds.slice(0, 500),
        },
      },
      metadata: {
        type: purchaseType,
        ebook_ids: ebookIds.slice(0, 500),
        course_ids: courseIds.slice(0, 500),
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

    const saleSessions = await listProductSaleSessions(stripe);
    const productsBySession = new Map();

    const ordersList = await Promise.all(
      saleSessions.map(async (sess) => {
        const products = await resolveEbookIdsByTitle(
          auth.supabaseAdmin,
          await listSessionProducts(stripe, sess)
        );
        productsBySession.set(sess.id, products);
        const items = products.map((product) => ({
          name: product.title || 'Unknown Item',
          price: parseFloat((product.amountCents / 100).toFixed(2)),
          ebookId: product.ebookId,
        }));
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

    // Stripe is the source of truth: repair missing or misdated purchase rows so customer
    // libraries and "My orders" never drift from the sales the admin sees.
    const reconcile = await reconcilePurchaseRows(
      auth.supabaseAdmin,
      saleSessions,
      productsBySession
    );
    if (reconcile.error) {
      logger.error('completed_orders_reconcile_failed', {
        ...requestMeta,
        errorMessage: reconcile.error.message || 'unknown_error',
      });
    } else if (reconcile.inserted || reconcile.redated || reconcile.unmatchedSessions.length) {
      logger.warn('completed_orders_reconciled', {
        ...requestMeta,
        inserted: reconcile.inserted,
        redated: reconcile.redated,
        unmatchedSessions: reconcile.unmatchedSessions,
      });
    }

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
      const products = await listSessionProducts(stripe, sess);
      const itemTitles = products.map((product) => product.title || 'Item');
      const itemEbookIds = products.map((product) => product.ebookId).filter(Boolean);

      rows.push({
        session_id: sess.id,
        created_at: new Date((sess.created || 0) * 1000).toISOString(),
        email: (sess.customer_details?.email || sess.customer_email || '').trim(),
        name: sess.customer_details?.name || '',
        total_amount: Number(((sess.amount_total || 0) / 100).toFixed(2)),
        currency: (sess.currency || 'brl').toUpperCase(),
        item_count: products.length,
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
        .select(
          'session_id, customer_email, customer_name, ebook_id, ebook_title, product_type, product_id, amount_cents, created_at'
        )
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
          const type = row.product_type === 'course' ? 'course' : 'ebook';
          const productId = row.product_id || row.ebook_id || null;
          order.items.push({
            name: row.ebook_title || (type === 'course' ? 'Course' : 'eBook'),
            price: itemPrice,
            type,
            productId,
            ebookId: type === 'ebook' ? productId : null,
            courseId: type === 'course' ? productId : null,
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

    const paidSessions = await listPaidSessionsForEmail(stripe, user.email);
    const supabaseForHeal = createSupabaseAdmin();

    await Promise.all(
      paidSessions.map(async (session) => {
        if (ordersBySession.has(session.id)) {
          // Show when the sale happened, even if the stored row was written later.
          ordersBySession.get(session.id).date = (session.created ?? 0) * 1000;
          return;
        }
        const products = await resolveEbookIdsByTitle(
          supabaseForHeal,
          await listSessionProducts(stripe, session)
        );
        const healError = await persistPurchaseRows(
          supabaseForHeal,
          buildPurchaseRows(session, products)
        );
        if (healError) {
          logger.warn('my_orders_purchase_heal_failed', {
            ...requestMeta,
            errorMessage: healError.message,
          });
        }

        ordersBySession.set(session.id, {
          id: session.id,
          date: (session.created ?? 0) * 1000,
          name: session.customer_details?.name || '',
          email: session.customer_details?.email || session.customer_email || '',
          total: parseFloat(((session.amount_total ?? 0) / 100).toFixed(2)),
          items: products.map((product) => ({
            name: product.title || 'Unknown Item',
            price: parseFloat((product.amountCents / 100).toFixed(2)),
            type: product.type,
            productId: product.productId,
            ebookId: product.ebookId,
            courseId: product.courseId,
          })),
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

// --- action=ebook-download (ebook-download) ---

const userOwnsEbook = (supabaseAdmin, userEmail, ebookId) =>
  emailOwnsProduct({
    stripe,
    supabaseAdmin,
    email: userEmail,
    type: 'ebook',
    productId: ebookId,
    onHealError: (sessionId, error) =>
      logger.warn('ebook_ownership_heal_failed', { sessionId, errorMessage: error.message }),
  });

const handleEbookDownload = async (req, res, requestMeta) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;

    const ebookId = typeof req.query?.ebookId === 'string' ? req.query.ebookId : '';
    if (!ebookId) {
      res.status(400).json({ error: 'ebookId is required' });
      return;
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data: ebook, error: ebookError } = await supabaseAdmin
      .from('ebooks_metadata')
      .select('id, filename, title')
      .eq('id', ebookId)
      .single();

    if (ebookError || !ebook?.filename) {
      res.status(404).json({ error: 'Ebook not found' });
      return;
    }

    const owns = await userOwnsEbook(supabaseAdmin, auth.user.email, ebookId);
    if (!owns && !auth.isAdmin) {
      res.status(403).json({ error: 'Purchase required' });
      return;
    }

    const asAttachment = req.query?.download === '1';
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from('ebook-pdfs')
      .createSignedUrl(`pdfs/${ebook.filename}`, 120, asAttachment ? { download: ebook.filename } : undefined);

    if (signedError || !signed?.signedUrl) {
      logger.error('ebook_download_sign_failed', {
        ...requestMeta,
        ebookId,
        signedError: signedError?.message,
      });
      res.status(502).json({ error: 'Failed to create download URL' });
      return;
    }

    res.status(200).json({
      url: signed.signedUrl,
      mode: 'signed',
      expiresIn: 120,
    });
  } catch (error) {
    captureServerError(error, { route: 'ebook-download' });
    logger.error('ebook_download_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to create download URL' });
  }
};

// --- action=course-outline (public): lesson titles/durations only, never video IDs ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const handleCourseOutline = async (req, res, requestMeta) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const slug = typeof req.query?.slug === 'string' ? req.query.slug.trim().toLowerCase() : '';
    const courseId = typeof req.query?.courseId === 'string' ? req.query.courseId.trim() : '';
    if (!(slug && SLUG_RE.test(slug)) && !UUID_RE.test(courseId)) {
      res.status(400).json({ error: 'slug or courseId is required' });
      return;
    }

    const supabaseAdmin = createSupabaseAdmin();
    let courseQuery = supabaseAdmin.from('courses').select('id').eq('is_published', true);
    courseQuery = slug ? courseQuery.eq('slug', slug) : courseQuery.eq('id', courseId);
    const { data: course, error: courseError } = await courseQuery.maybeSingle();
    if (courseError) throw courseError;
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from('course_lessons')
      .select('id, position, title, duration_seconds')
      .eq('course_id', course.id)
      .order('position', { ascending: true });
    if (lessonsError) throw lessonsError;

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      courseId: course.id,
      lessons: (lessons || []).map((lesson) => ({
        id: lesson.id,
        position: lesson.position,
        title: lesson.title,
        durationSeconds: lesson.duration_seconds,
      })),
    });
  } catch (error) {
    logger.error('course_outline_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to load course outline' });
  }
};

// --- action=course-access (owner or admin): one lesson's video id + watermark ---

const handleCourseAccess = async (req, res, requestMeta) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;

    const courseId = typeof req.query?.courseId === 'string' ? req.query.courseId.trim() : '';
    const lessonId = typeof req.query?.lessonId === 'string' ? req.query.lessonId.trim() : '';
    if (!UUID_RE.test(courseId) || (lessonId && !UUID_RE.test(lessonId))) {
      res.status(400).json({ error: 'courseId (and optional lessonId) must be valid ids' });
      return;
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (!auth.isAdmin) {
      const owns = await emailOwnsProduct({
        stripe,
        supabaseAdmin,
        email: auth.user.email,
        type: 'course',
        productId: courseId,
        onHealError: (sessionId, error) =>
          logger.warn('course_ownership_heal_failed', { sessionId, errorMessage: error.message }),
      });
      if (!owns) {
        res.status(403).json({ error: 'Purchase required' });
        return;
      }
    }

    let lessonQuery = supabaseAdmin
      .from('course_lessons')
      .select('id, position, title, duration_seconds, youtube_video_id')
      .eq('course_id', courseId);
    lessonQuery = lessonId
      ? lessonQuery.eq('id', lessonId)
      : lessonQuery.order('position', { ascending: true }).limit(1);
    const { data: lessonRows, error: lessonError } = await lessonQuery;
    if (lessonError) throw lessonError;
    const lesson = lessonRows?.[0];
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    const { error: logError } = await supabaseAdmin.from('course_access_log').insert({
      course_id: courseId,
      lesson_id: lesson.id,
      user_id: auth.user.id,
      user_email: (auth.user.email || '').toLowerCase(),
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    });
    if (logError) {
      logger.warn('course_access_log_failed', { ...requestMeta, errorMessage: logError.message });
    }

    const { data: outline, error: outlineError } = await supabaseAdmin
      .from('course_lessons')
      .select('id, position, title, duration_seconds')
      .eq('course_id', courseId)
      .order('position', { ascending: true });
    if (outlineError) throw outlineError;

    res.status(200).json({
      lesson: {
        id: lesson.id,
        position: lesson.position,
        title: lesson.title,
        durationSeconds: lesson.duration_seconds,
      },
      lessons: (outline || []).map((row) => ({
        id: row.id,
        position: row.position,
        title: row.title,
        durationSeconds: row.duration_seconds,
      })),
      videoId: lesson.youtube_video_id,
      watermark: auth.user.email,
    });
  } catch (error) {
    captureServerError(error, { route: 'course-access' });
    logger.error('course_access_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to load lesson' });
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
    case 'ebook-download':
      return handleEbookDownload(req, res, requestMeta);
    case 'course-outline':
      return handleCourseOutline(req, res, requestMeta);
    case 'course-access':
      return handleCourseAccess(req, res, requestMeta);
    default:
      res.status(404).json({ error: 'Unknown orders action' });
  }
}
