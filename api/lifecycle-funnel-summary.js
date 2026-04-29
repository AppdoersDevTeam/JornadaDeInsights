import { requireAdmin } from './_lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';
import { captureServerError } from './_lib/monitoring.js';

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const daysRaw = Number.parseInt(String(req.query.days || '30'), 10);
    const days = Number.isFinite(daysRaw) ? Math.min(90, Math.max(7, daysRaw)) : 30;
    const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: visitsCount, error: visitsError }, { data: lifecycleRows, error: lifecycleError }] = await Promise.all([
      admin.supabaseAdmin
        .from('site_page_views')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceIso),
      admin.supabaseAdmin
        .from('lifecycle_events')
        .select('event_name')
        .gte('created_at', sinceIso),
    ]);

    if (visitsError) throw visitsError;
    if (lifecycleError) throw lifecycleError;

    const totals = {
      visits: visitsCount || 0,
      leads: 0,
      checkoutStarted: 0,
      purchaseCompleted: 0,
    };

    for (const row of lifecycleRows || []) {
      if (row.event_name === 'lead_captured') totals.leads += 1;
      if (row.event_name === 'checkout_started') totals.checkoutStarted += 1;
      if (row.event_name === 'purchase_completed') totals.purchaseCompleted += 1;
    }

    const pct = (value, base) => (base > 0 ? Number(((value / base) * 100).toFixed(2)) : 0);

    res.status(200).json({
      windowDays: days,
      totals,
      conversionRates: {
        visitToLead: pct(totals.leads, totals.visits),
        leadToCheckout: pct(totals.checkoutStarted, totals.leads),
        checkoutToPurchase: pct(totals.purchaseCompleted, totals.checkoutStarted),
        visitToPurchase: pct(totals.purchaseCompleted, totals.visits),
      },
    });
  } catch (error) {
    captureServerError(error, { route: 'lifecycle-funnel-summary' });
    logger.error('lifecycle_funnel_summary_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to load lifecycle funnel summary' });
  }
}
