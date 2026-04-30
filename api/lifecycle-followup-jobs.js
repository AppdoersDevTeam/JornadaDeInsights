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
}

