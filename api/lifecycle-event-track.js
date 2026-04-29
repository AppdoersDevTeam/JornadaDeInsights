import { createClient } from '@supabase/supabase-js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';
import { captureServerError } from './_lib/monitoring.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_EVENTS = new Set([
  'checkout_started',
  'purchase_completed',
  'donation_started',
  'lead_captured',
]);

const normalizeId = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 128);
  if (!trimmed) return null;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : null;
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'POST,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

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
}
