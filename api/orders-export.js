import Stripe from 'stripe';
import { requireAdmin } from './_lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

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

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

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
}

