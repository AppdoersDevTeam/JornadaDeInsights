import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';
import { captureServerError } from '../lib/monitoring.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_EVENTS = new Set([
  'checkout_started',
  'purchase_completed',
  'donation_started',
  'lead_captured',
  'add_to_cart',
  'view_item',
]);

const normalizeId = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 128);
  if (!trimmed) return null;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : null;
};

const parseLimit = (value, fallback) => {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, 1), 200);
};

const handleTrack = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'POST,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'POST') {
    logger.warn('lifecycle_event_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error('lifecycle_event_missing_supabase_config', requestMeta);
    res.status(500).json({ error: 'Missing Supabase configuration' });
    return;
  }

  try {
    const { eventName, visitorId, sessionId, pagePath, metadata } = req.body || {};
    if (typeof eventName !== 'string' || !ALLOWED_EVENTS.has(eventName)) {
      res.status(400).json({ error: 'Invalid lifecycle event' });
      return;
    }

    const safePath =
      typeof pagePath === 'string' && pagePath.startsWith('/')
        ? pagePath.slice(0, 512)
        : null;

    const safeMetadata =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? JSON.parse(JSON.stringify(metadata))
        : {};

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from('lifecycle_events').insert({
      event_name: eventName,
      visitor_id: normalizeId(visitorId),
      session_id: normalizeId(sessionId),
      page_path: safePath,
      metadata: safeMetadata,
    });

    if (error) throw error;

    if (eventName === 'checkout_started') {
      const userEmail =
        typeof safeMetadata.userEmail === 'string' ? safeMetadata.userEmail.trim().toLowerCase() : null;
      if (userEmail) {
        const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        await supabase.from('lifecycle_followup_jobs').insert({
          status: 'pending',
          job_type: 'abandoned_cart_reminder',
          user_email: userEmail,
          session_id: normalizeId(sessionId),
          visitor_id: normalizeId(visitorId),
          payload: safeMetadata,
          scheduled_for: scheduledFor,
        });
      }
    }

    if (eventName === 'purchase_completed') {
      const normalizedSessionId = normalizeId(sessionId);
      if (normalizedSessionId) {
        await supabase
          .from('lifecycle_followup_jobs')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', normalizedSessionId)
          .eq('status', 'pending');
      }
    }

    res.status(201).json({ ok: true });
  } catch (error) {
    captureServerError(error, { route: 'lifecycle-event-track' });
    logger.error('lifecycle_event_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to track lifecycle event' });
  }
};

const handleFollowupJobs = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    logger.warn('lifecycle_followup_jobs_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const { supabaseAdmin } = auth;

    const limit = parseLimit(req.query.limit, 50);
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const status = ['pending', 'processing', 'sent', 'failed', 'cancelled'].includes(statusRaw)
      ? statusRaw
      : 'pending';

    const { data, error } = await supabaseAdmin
      .from('lifecycle_followup_jobs')
      .select(
        'id,status,job_type,user_email,session_id,visitor_id,scheduled_for,sent_at,created_at,updated_at'
      )
      .eq('status', status)
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) throw error;

    res.status(200).json({ status, jobs: data || [] });
  } catch (error) {
    logger.error('lifecycle_followup_jobs_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const handleFunnelSummary = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

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

    const [{ data: analyticsSummary, error: visitsError }, { data: lifecycleRows, error: lifecycleError }] =
      await Promise.all([
        admin.supabaseAdmin.rpc('get_site_analytics_summary', { window_days: days }),
        admin.supabaseAdmin
          .from('lifecycle_events')
          .select('event_name')
          .gte('created_at', sinceIso),
      ]);

    if (visitsError) throw visitsError;
    if (lifecycleError) throw lifecycleError;

    const totals = {
      visits: Number(analyticsSummary?.totalPageViews) || 0,
      leads: 0,
      checkoutStarted: 0,
      purchaseCompleted: 0,
    };

    for (const row of lifecycleRows || []) {
      if (row.event_name === 'lead_captured') totals.leads += 1;
      if (row.event_name === 'checkout_started') totals.checkoutStarted += 1;
      if (row.event_name === 'purchase_completed') totals.purchaseCompleted += 1;
    }

    const pct = (value, base) => (base > 0 ? Number(((value / base) * 100).toFixed(2)) : null);

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
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  const action = req.query?.action;

  switch (action) {
    case 'track':
      return handleTrack(req, res, requestMeta);
    case 'followup-jobs':
      return handleFollowupJobs(req, res, requestMeta);
    case 'funnel-summary':
      return handleFunnelSummary(req, res, requestMeta);
    default:
      res.status(404).json({ error: 'Unknown lifecycle action' });
  }
}
