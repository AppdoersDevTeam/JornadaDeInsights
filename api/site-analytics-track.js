import { createClient } from '@supabase/supabase-js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';
import { captureServerError } from './_lib/monitoring.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TRACK_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 120,
};

const rateLimitStore = globalThis.__siteAnalyticsRateLimitStore || new Map();
globalThis.__siteAnalyticsRateLimitStore = rateLimitStore;
const dedupeStore = globalThis.__siteAnalyticsDedupeStore || new Map();
globalThis.__siteAnalyticsDedupeStore = dedupeStore;

const isValidString = (value) => typeof value === 'string' && value.trim().length > 0;
const BOT_USER_AGENT_PATTERN =
  /bot|spider|crawler|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|discordbot|twitterbot|bingpreview/i;

const normalizePath = (pagePath) => {
  if (!isValidString(pagePath)) return '/';
  const pathOnly = pagePath.split('?')[0].split('#')[0].trim();
  if (!pathOnly.startsWith('/')) return '/';
  return pathOnly.slice(0, 512);
};

const normalizePageUrl = (url, fallbackPath) => {
  if (!isValidString(url)) return fallbackPath;
  const trimmed = url.trim().slice(0, 1024);
  return trimmed;
};

const normalizeReferrer = (referrer) => {
  if (!isValidString(referrer)) return null;
  try {
    const parsed = new URL(referrer);
    return `${parsed.origin}${parsed.pathname}`.slice(0, 1024);
  } catch {
    return null;
  }
};

const normalizeId = (id) => {
  if (!isValidString(id)) return null;
  const normalized = id.trim().slice(0, 128);
  if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) return null;
  return normalized;
};

const isRateLimited = (identifier) => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  if (!record || now - record.windowStart > TRACK_RATE_LIMIT.windowMs) {
    rateLimitStore.set(identifier, { windowStart: now, count: 1 });
    return false;
  }
  if (record.count >= TRACK_RATE_LIMIT.maxRequests) {
    return true;
  }
  record.count += 1;
  rateLimitStore.set(identifier, record);
  return false;
};

const isDuplicateEvent = (fingerprint) => {
  const now = Date.now();
  const duplicateWindowMs = 10_000;
  const existing = dedupeStore.get(fingerprint);
  if (existing && now - existing < duplicateWindowMs) {
    return true;
  }
  dedupeStore.set(fingerprint, now);
  return false;
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'POST,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    logger.warn('site_analytics_track_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error('site_analytics_track_missing_supabase_config', requestMeta);
    res.status(500).json({ error: 'Missing Supabase configuration for analytics tracking' });
    return;
  }

  const userAgent = String(req.headers['user-agent'] || '');
  if (BOT_USER_AGENT_PATTERN.test(userAgent)) {
    logger.info('site_analytics_track_bot_filtered', requestMeta);
    res.status(204).end();
    return;
  }

  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown';

  if (isRateLimited(clientIp)) {
    logger.warn('site_analytics_track_rate_limited', { ...requestMeta, clientIp });
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    logger.warn('site_analytics_track_invalid_body_shape', requestMeta);
    res.status(400).json({ error: 'Invalid analytics payload' });
    return;
  }

  const { pagePath, pageUrl, referrer, visitorId, sessionId, tzOffsetMinutes } = req.body || {};
  const normalizedPath = normalizePath(pagePath);
  const normalizedVisitorId = normalizeId(visitorId);
  const normalizedSessionId = normalizeId(sessionId);
  const normalizedTzOffset =
    typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)
      ? Math.trunc(tzOffsetMinutes)
      : null;

  if (
    !normalizedVisitorId ||
    !normalizedSessionId ||
    (normalizedTzOffset !== null && (normalizedTzOffset < -840 || normalizedTzOffset > 840))
  ) {
    logger.warn('site_analytics_track_invalid_payload', requestMeta);
    res.status(400).json({ error: 'Invalid analytics payload' });
    return;
  }

  // Avoid polluting site analytics with admin dashboard activity.
  if (normalizedPath.startsWith('/dashboard') || normalizedPath.startsWith('/user-dashboard')) {
    res.status(204).end();
    return;
  }

  const dedupeFingerprint = `${normalizedSessionId}:${normalizedVisitorId}:${normalizedPath}`;
  if (isDuplicateEvent(dedupeFingerprint)) {
    logger.info('site_analytics_track_duplicate_filtered', requestMeta);
    res.status(204).end();
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const country = req.headers['x-vercel-ip-country'] || 'Unknown';
    const region = req.headers['x-vercel-ip-country-region'] || null;
    const city = req.headers['x-vercel-ip-city'] || null;

    const { error } = await supabase.from('site_page_views').insert({
      page_path: normalizedPath,
      page_url: normalizePageUrl(pageUrl, normalizedPath),
      referrer: normalizeReferrer(referrer),
      visitor_id: normalizedVisitorId,
      session_id: normalizedSessionId,
      country,
      region,
      city,
      user_agent: userAgent.slice(0, 1024) || null,
      tz_offset_minutes: normalizedTzOffset,
    });

    if (error) {
      throw error;
    }

    logger.info('site_analytics_track_recorded', {
      ...requestMeta,
      pagePath: normalizedPath,
      hasReferrer: Boolean(referrer),
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    captureServerError(error, { route: 'site-analytics-track' });
    logger.error('site_analytics_track_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to record analytics event' });
  }
}
