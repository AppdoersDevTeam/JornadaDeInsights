import Stripe from 'stripe';
import { requireAdmin } from '../lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';
import { listPaidSessionsForEmail, listSessionProducts } from '../lib/stripe-purchases.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// --- action=alerts (admin-alerts) ---

const handleAlerts = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    logger.warn('admin_alerts_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const { supabaseAdmin } = auth;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      failedEmailsRes,
      pendingCartsRes,
      lastWebhookRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('purchase_email_events')
        .select('session_id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', since24h),
      supabaseAdmin
        .from('lifecycle_followup_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('created_at', since24h),
      supabaseAdmin
        .from('stripe_webhook_events')
        .select('processed_at')
        .order('processed_at', { ascending: false })
        .limit(1),
    ]);

    if (failedEmailsRes.error) throw failedEmailsRes.error;
    if (pendingCartsRes.error) throw pendingCartsRes.error;
    if (lastWebhookRes.error) throw lastWebhookRes.error;

    const lastWebhookAt = lastWebhookRes.data?.[0]?.processed_at || null;

    res.status(200).json({
      windowHours: 24,
      failedPurchaseEmails: failedEmailsRes.count || 0,
      pendingAbandonedCarts: pendingCartsRes.count || 0,
      lastWebhookAt,
    });
  } catch (error) {
    logger.error('admin_alerts_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=customer-lookup (admin-customer-lookup) ---

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

const handleCustomerLookup = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

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

    const sessions = await listPaidSessionsForEmail(stripe, email);

    const paidSessions = sessions
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, limit);

    const lookup = await Promise.all(
      paidSessions.map(async (sess) => {
        const products = await listSessionProducts(stripe, sess);

        const items = products.map((product) => ({
          name: product.title || 'Unknown Item',
          quantity: product.quantity,
          amount: Number(((product.amountCents || 0) / 100).toFixed(2)),
          currency: (sess.currency || 'brl').toUpperCase(),
          ebookId: safeString(product.ebookId, 128),
        }));

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
    const ebookTitles = Array.from(
      new Set(
        lookup
          .flatMap((s) => s.items.map((i) => i.name).filter(Boolean))
          .map((title) => String(title).trim())
          .filter(Boolean)
      )
    );

    const ebookById = new Map();
    const ebookByTitle = new Map();
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

    // Title fallback for older purchases where ebookId metadata was not included.
    if (ebookTitles.length > 0) {
      const { data: ebooks, error } = await auth.supabaseAdmin
        .from('ebooks_metadata')
        .select('id,title,filename')
        .in('title', ebookTitles);
      if (error) throw error;
      for (const ebook of ebooks || []) {
        if (ebook.title) {
          ebookByTitle.set(String(ebook.title).trim(), ebook);
        }
      }
    }

    const resolveEbook = (item) =>
      (item.ebookId ? ebookById.get(item.ebookId) : null) ||
      ebookByTitle.get(String(item.name || '').trim()) ||
      null;

    // Full PDFs live in the private ebook-pdfs bucket; admins get 1h signed links.
    const pdfPaths = Array.from(
      new Set(
        lookup
          .flatMap((s) => s.items.map((item) => resolveEbook(item)?.filename))
          .filter(Boolean)
          .map((filename) => `pdfs/${filename}`)
      )
    );
    const signedPdfUrls = new Map();
    if (pdfPaths.length > 0) {
      const { data: signed, error: signError } = await auth.supabaseAdmin.storage
        .from('ebook-pdfs')
        .createSignedUrls(pdfPaths, 3600);
      if (signError) throw signError;
      for (const entry of signed || []) {
        if (entry.path && entry.signedUrl) {
          signedPdfUrls.set(entry.path, entry.signedUrl);
        }
      }
    }

    const results = lookup.map((session) => {
      const enrichedItems = session.items.map((item) => {
        const ebook = resolveEbook(item);
        const filename = ebook?.filename || null;
        const title = ebook?.title || null;

        const pdfUrl = filename ? signedPdfUrls.get(`pdfs/${filename}`) || null : null;
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
};

// --- action=users (users) ---

const handleUsers = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,DELETE,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (!['GET', 'DELETE'].includes(req.method)) {
    logger.warn('users_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) {
      return;
    }
    const { supabaseAdmin } = auth;

    if (req.method === 'DELETE') {
      const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
      if (!uid) {
        res.status(400).json({ error: 'Missing uid query parameter' });
        return;
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (error) {
        throw error;
      }

      res.status(200).json({ success: true, uid });
      return;
    }

    const {
      data: { users: supabaseUsers = [] },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const users = supabaseUsers.map((u) => {
      return {
        uid: u.id,
        displayName: u.user_metadata?.full_name || null,
        email: u.email,
        photoURL: u.user_metadata?.avatar_url || null,
      };
    });
    res.json({ users });
  } catch (error) {
    logger.error('users_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=podcast-articles (podcast-articles) ---

const ARTICLE_EDITABLE_FIELDS = ['title_pt', 'body_pt', 'title_en', 'body_en', 'spotify_url', 'youtube_url'];

const handlePodcastArticles = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,PATCH,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (!['GET', 'PATCH'].includes(req.method)) {
    logger.warn('podcast_articles_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const { supabaseAdmin } = auth;

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('podcast_articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.status(200).json({ articles: data || [] });
      return;
    }

    // PATCH: update fields and/or flip status (draft <-> published)
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) {
      res.status(400).json({ error: 'Missing id query parameter' });
      return;
    }

    const body = req.body || {};
    const updates = {};

    for (const field of ARTICLE_EDITABLE_FIELDS) {
      if (typeof body[field] === 'string') {
        updates[field] = body[field].trim();
      }
    }

    if (body.status === 'published' || body.status === 'draft') {
      updates.status = body.status;
      if (body.status === 'published') {
        updates.published_at = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('podcast_articles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.status(200).json({ article: data });
  } catch (error) {
    logger.error('podcast_articles_admin_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=webhook-events (stripe-webhook-events) ---

const parseEventLimit = (value, fallback) => {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, 1), 200);
};

const handleWebhookEvents = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    logger.warn('stripe_webhook_events_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const { supabaseAdmin } = auth;

    const limit = parseEventLimit(req.query.limit, 50);

    const [webhookRes, emailRes] = await Promise.all([
      supabaseAdmin
        .from('stripe_webhook_events')
        .select('event_id,event_type,session_id,processed_at')
        .order('processed_at', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('purchase_email_events')
        .select('session_id,customer_email,status,sent_at,last_error,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (webhookRes.error) throw webhookRes.error;
    if (emailRes.error) throw emailRes.error;

    res.status(200).json({
      webhookEvents: webhookRes.data || [],
      purchaseEmailEvents: emailRes.data || [],
    });
  } catch (error) {
    logger.error('stripe_webhook_events_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  const action = req.query?.action;

  switch (action) {
    case 'alerts':
      return handleAlerts(req, res, requestMeta);
    case 'webhook-events':
      return handleWebhookEvents(req, res, requestMeta);
    case 'customer-lookup':
      return handleCustomerLookup(req, res, requestMeta);
    case 'users':
      return handleUsers(req, res, requestMeta);
    case 'podcast-articles':
      return handlePodcastArticles(req, res, requestMeta);
    default:
      res.status(404).json({ error: 'Unknown admin action' });
  }
}
