import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const DEFAULT_ALLOWED_ORIGINS = [
  'https://jornadadeinsights.com',
  'https://www.jornadadeinsights.com',
  'http://localhost:5173',
];

const TRACK_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 120,
};

const rateLimitStore = globalThis.__siteAnalyticsRateLimitStore || new Map();
globalThis.__siteAnalyticsRateLimitStore = rateLimitStore;

const getAllowedOrigin = (origin) => {
  const allowed = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ALLOWED_ORIGINS;
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0];
};

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
  return id.trim().slice(0, 128);
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req.headers.origin));
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    res.status(500).json({ error: 'Missing Supabase configuration for analytics tracking' });
    return;
  }

  const userAgent = String(req.headers['user-agent'] || '');
  if (BOT_USER_AGENT_PATTERN.test(userAgent)) {
    res.status(204).end();
    return;
  }

  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown';

  if (isRateLimited(clientIp)) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  const { pagePath, pageUrl, referrer, visitorId, sessionId, tzOffsetMinutes } = req.body || {};
  const normalizedPath = normalizePath(pagePath);
  const normalizedVisitorId = normalizeId(visitorId);
  const normalizedSessionId = normalizeId(sessionId);

  if (!normalizedVisitorId || !normalizedSessionId) {
    res.status(400).json({ error: 'Invalid analytics payload' });
    return;
  }

  // Avoid polluting site analytics with admin dashboard activity.
  if (normalizedPath.startsWith('/dashboard') || normalizedPath.startsWith('/user-dashboard')) {
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
      tz_offset_minutes:
        typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)
          ? Math.trunc(tzOffsetMinutes)
          : null,
    });

    if (error) {
      throw error;
    }

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('site-analytics-track error:', error);
    res.status(500).json({ error: 'Failed to record analytics event' });
  }
}
