import { requireAdmin } from './_lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

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
}

