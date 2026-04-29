import { createClient } from '@supabase/supabase-js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';
import { captureServerError } from './_lib/monitoring.js';

const ALLOWED_ADMIN_EMAILS = [
  'devteam@appdoers.co.nz',
  'ptasbr2020@gmail.com',
];

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS', cacheControl: 'private, no-store' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    logger.warn('site_analytics_summary_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error('site_analytics_summary_missing_supabase_config', requestMeta);
    res.status(500).json({ error: 'Missing Supabase configuration for analytics summary' });
    return;
  }

  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!idToken) {
      logger.warn('site_analytics_summary_missing_token', requestMeta);
      res.status(401).json({ error: 'Missing auth token' });
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(idToken);

    if (authError || !user) {
      logger.warn('site_analytics_summary_invalid_token', requestMeta);
      res.status(401).json({ error: 'Invalid auth token' });
      return;
    }

    const userEmail = (user.email || '').toLowerCase();

    if (!ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
      logger.warn('site_analytics_summary_forbidden', requestMeta);
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const requestedDays = Number.parseInt(String(req.query.days || '30'), 10);
    const days = Number.isNaN(requestedDays) ? 30 : Math.min(Math.max(requestedDays, 1), 90);
    const { data, error } = await supabaseAdmin.rpc('get_site_analytics_summary', {
      window_days: days,
    });

    if (error) {
      throw error;
    }

    const summary = data || {};

    res.status(200).json({
      totalPageViews: Number(summary.totalPageViews) || 0,
      uniqueVisitors: Number(summary.uniqueVisitors) || 0,
      topPages: Array.isArray(summary.topPages) ? summary.topPages : [],
      topCountries: Array.isArray(summary.topCountries) ? summary.topCountries : [],
      dailyViews: Array.isArray(summary.dailyViews) ? summary.dailyViews : [],
      windowDays: Number(summary.windowDays) || days,
    });
  } catch (error) {
    captureServerError(error, { route: 'site-analytics-summary' });
    logger.error('site_analytics_summary_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to build analytics summary' });
  }
}
