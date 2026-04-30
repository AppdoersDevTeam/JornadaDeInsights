import { requireAdmin } from './_lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';

const parseLimit = (value, fallback) => {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, 1), 200);
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    logger.warn('stripe_webhook_events_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const { supabaseAdmin } = auth;

    const limit = parseLimit(req.query.limit, 50);

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
}

