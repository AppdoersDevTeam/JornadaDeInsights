import Stripe from 'stripe';
import { requireAdmin } from './_lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const normalizeEmail = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.length > 254) return null;
  return trimmed;
};

const parseLimit = (value, fallback) => {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, 1), 50);
};

const safeString = (value, max = 500) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const listSessionsFallback = async ({ email, limit }) => {
  const sessions = [];
  let startingAfter = undefined;

  while (sessions.length < limit) {
    const page = await stripe.checkout.sessions.list({
      limit: Math.min(100, limit),
      starting_after: startingAfter,
    });
    if (!page.data?.length) break;

    for (const sess of page.data) {
      const sessEmail = (sess.customer_details?.email || sess.customer_email || '').trim().toLowerCase();
      if (sessEmail === email) {
        sessions.push(sess);
        if (sessions.length >= limit) break;
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  return sessions;
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    logger.warn('admin_customer_lookup_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const email = normalizeEmail(req.query.email);
    if (!email) {
      res.status(400).json({ error: 'Missing or invalid email query parameter' });
      return;
    }
    const limit = parseLimit(req.query.limit, 10);

    let sessions = [];
    try {
      // Search is not enabled for all accounts; fallback to list+filter if it fails.
      const result = await stripe.checkout.sessions.search({
        query: `customer_email:'${email}'`,
        limit,
      });
      sessions = result.data || [];
    } catch (error) {
      logger.warn('admin_customer_lookup_stripe_search_unavailable', requestMeta);
      sessions = await listSessionsFallback({ email, limit });
    }

    const paidSessions = sessions
      .filter((s) => s.payment_status === 'paid')
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, limit);

    const lookup = await Promise.all(
      paidSessions.map(async (sess) => {
        const lineItemsList = await stripe.checkout.sessions.listLineItems(sess.id, { limit: 100 });

        const items = lineItemsList.data.map((li) => {
          const unitAmount = li.price?.unit_amount ?? li.amount_total ?? 0;
          const ebookId =
            li.price_data?.product_data?.metadata?.ebookId ||
            li.price?.product_data?.metadata?.ebookId ||
            null;

          return {
            name:
              li.price_data?.product_data?.name ||
              li.price?.product_data?.name ||
              li.description ||
              'Unknown Item',
            quantity: li.quantity || 1,
            amount: Number(((unitAmount || 0) / 100).toFixed(2)),
            currency: (li.currency || li.price?.currency || 'brl').toUpperCase(),
            ebookId: safeString(ebookId, 128),
          };
        });

        return {
          sessionId: sess.id,
          createdAt: new Date((sess.created || 0) * 1000).toISOString(),
          email: (sess.customer_details?.email || sess.customer_email || email || '').trim(),
          name: sess.customer_details?.name || null,
          currency: (sess.currency || 'brl').toUpperCase(),
          total: Number(((sess.amount_total || 0) / 100).toFixed(2)),
          items,
        };
      })
    );

    const ebookIds = Array.from(
      new Set(
        lookup.flatMap((s) => s.items.map((i) => i.ebookId).filter(Boolean))
      )
    );

    const ebookById = new Map();
    if (ebookIds.length > 0) {
      const { data: ebooks, error } = await auth.supabaseAdmin
        .from('ebooks_metadata')
        .select('id,title,filename')
        .in('id', ebookIds);
      if (error) throw error;
      for (const ebook of ebooks || []) {
        ebookById.set(ebook.id, ebook);
      }
    }

    const results = lookup.map((session) => {
      const enrichedItems = session.items.map((item) => {
        const ebook = item.ebookId ? ebookById.get(item.ebookId) : null;
        const filename = ebook?.filename || null;
        const title = ebook?.title || null;

        const pdfUrl = filename
          ? auth.supabaseAdmin.storage.from('store-assets').getPublicUrl(`pdfs/${filename}`).data.publicUrl
          : null;
        const coverUrl = filename
          ? auth.supabaseAdmin.storage.from('store-assets').getPublicUrl(`covers/${filename}`).data.publicUrl
          : null;

        return {
          ...item,
          ebookTitle: title,
          filename,
          pdfUrl,
          coverUrl,
        };
      });

      return { ...session, items: enrichedItems };
    });

    res.status(200).json({ email, sessions: results });
  } catch (error) {
    logger.error('admin_customer_lookup_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

