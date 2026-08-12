import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';
import { captureServerError } from '../lib/monitoring.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_ADMIN_EMAILS = [
  'devteam@appdoers.co.nz',
  'ptasbr2020@gmail.com',
];

let stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
} catch (error) {
  logger.error('analytics_stripe_init_failed', {
    errorMessage: error instanceof Error ? error.message : 'unknown_error',
  });
}

// --- action=track (site-analytics-track) ---

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

const isLocalhostRequest = (req, pageUrl) => {
  const candidates = [
    req.headers.origin,
    req.headers.referer,
    req.headers.host,
    pageUrl,
  ];
  return candidates.some((value) => isValidString(value) && /localhost|127\.0\.0\.1/i.test(value));
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

const handleTrack = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'POST,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

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

  if (isLocalhostRequest(req, pageUrl) || isLocalhostRequest(req, referrer)) {
    logger.info('site_analytics_track_localhost_filtered', requestMeta);
    res.status(204).end();
    return;
  }

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
};

// --- action=summary (site-analytics-summary) ---

const handleSummary = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS', cacheControl: 'private, no-store' });
  if (handleOptionsRequest(req, res)) return;

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
      topReferrers: Array.isArray(summary.topReferrers) ? summary.topReferrers : [],
      topDevices: Array.isArray(summary.topDevices) ? summary.topDevices : [],
      topOperatingSystems: Array.isArray(summary.topOperatingSystems)
        ? summary.topOperatingSystems
        : [],
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
};

// --- action=monthly (site-analytics-monthly) ---

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const UNIQUE_VISITOR_PAGE_SIZE = 1000;
const UNIQUE_VISITOR_MAX_ROWS = 100000;

const toMonthKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const monthRange = (month) => {
  const [year, monthIndex] = month.split('-').map((part) => Number.parseInt(part, 10));
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));
  return { start: start.toISOString(), end: end.toISOString() };
};

const listMonthsSince = (firstDate, now) => {
  const months = [];
  const cursor = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), 1));
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  while (cursor <= last) {
    months.push(toMonthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months.reverse();
};

const countUniqueVisitors = async (supabaseAdmin, start, end) => {
  const visitors = new Set();
  let from = 0;
  let truncated = false;

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('site_page_views')
      .select('visitor_id')
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: true })
      .range(from, from + UNIQUE_VISITOR_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (row.visitor_id) visitors.add(row.visitor_id);
    }

    if (data.length < UNIQUE_VISITOR_PAGE_SIZE) break;

    from += UNIQUE_VISITOR_PAGE_SIZE;
    if (from >= UNIQUE_VISITOR_MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  return { uniqueVisitors: visitors.size, truncated };
};

const handleMonthly = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS', cacheControl: 'private, no-store' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    logger.warn('site_analytics_monthly_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error('site_analytics_monthly_missing_supabase_config', requestMeta);
    res.status(500).json({ error: 'Missing Supabase configuration for analytics summary' });
    return;
  }

  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!idToken) {
      logger.warn('site_analytics_monthly_missing_token', requestMeta);
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
      logger.warn('site_analytics_monthly_invalid_token', requestMeta);
      res.status(401).json({ error: 'Invalid auth token' });
      return;
    }

    if (!ALLOWED_ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
      logger.warn('site_analytics_monthly_forbidden', requestMeta);
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const now = new Date();
    const requestedMonth = String(req.query.month || '');

    if (requestedMonth && !MONTH_PATTERN.test(requestedMonth)) {
      res.status(400).json({ error: 'Invalid month. Expected format YYYY-MM.' });
      return;
    }

    const month = requestedMonth || toMonthKey(now);

    const { start, end } = monthRange(month);

    const [totalRes, firstRowRes] = await Promise.all([
      supabaseAdmin
        .from('site_page_views')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', start)
        .lt('created_at', end),
      supabaseAdmin
        .from('site_page_views')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1),
    ]);

    if (totalRes.error) throw totalRes.error;
    if (firstRowRes.error) throw firstRowRes.error;

    const { uniqueVisitors, truncated } = await countUniqueVisitors(supabaseAdmin, start, end);

    const firstCreatedAt = firstRowRes.data?.[0]?.created_at;
    const availableMonths = firstCreatedAt
      ? listMonthsSince(new Date(firstCreatedAt), now)
      : [toMonthKey(now)];

    res.status(200).json({
      month,
      totalPageViews: totalRes.count || 0,
      uniqueVisitors,
      uniqueVisitorsTruncated: truncated,
      availableMonths,
    });
  } catch (error) {
    captureServerError(error, { route: 'site-analytics-monthly' });
    logger.error('site_analytics_monthly_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to build monthly analytics' });
  }
};

// --- action=top-products (top-products) ---

const handleTopProducts = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    logger.warn('top_products_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!stripe) {
    logger.error('top_products_stripe_unavailable', requestMeta);
    res.status(500).json({
      error: 'Payment service unavailable',
      products: [],
    });
    return;
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthUnix = Math.floor(startOfMonth.getTime() / 1000);

    let charges;
    try {
      charges = await stripe.charges.list({
        created: { gte: startOfMonthUnix },
        limit: 100,
        status: 'succeeded',
      });
    } catch (stripeError) {
      logger.error('top_products_stripe_api_failed', {
        ...requestMeta,
        errorMessage: stripeError instanceof Error ? stripeError.message : 'unknown_error',
      });
      res.json({ products: [] });
      return;
    }

    if (!charges?.data || !Array.isArray(charges.data)) {
      logger.warn('top_products_invalid_stripe_payload', requestMeta);
      res.json({ products: [] });
      return;
    }

    const primaryCurrency = charges.data.find((charge) => charge.currency)?.currency || 'brl';
    const normalizedCharges = charges.data.filter((charge) => charge.currency === primaryCurrency);

    const productMap = new Map();

    normalizedCharges.forEach((charge) => {
      if (!charge) return;
      const productNames = charge.metadata?.product_names || charge.description || 'Unknown Product';
      const chargeAmount = (charge.amount || 0) / 100;
      productNames.split(',').forEach((name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const current = productMap.get(trimmed) || { sales: 0, revenue: 0 };
        productMap.set(trimmed, {
          sales: current.sales + 1,
          revenue: Number((current.revenue + chargeAmount).toFixed(2)),
        });
      });
    });

    const products = Array.from(productMap.entries())
      .map(([name, data]) => ({
        name: name || 'Unknown Product',
        sales: data.sales || 0,
        revenue: data.revenue || 0,
      }))
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 3);

    res.json({
      products,
      currency: primaryCurrency.toUpperCase(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('top_products_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.json({
      products: [],
      currency: 'BRL',
      timestamp: new Date().toISOString(),
    });
  }
};

// --- action=stats (stats) ---

const handleStats = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    logger.warn('stats_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) {
      return;
    }
    const { supabaseAdmin } = auth;

    let dayStart, weekStart, monthStart;
    if (req.query.dayStart && req.query.weekStart && req.query.monthStart) {
      dayStart = parseInt(req.query.dayStart, 10);
      weekStart = parseInt(req.query.weekStart, 10);
      monthStart = parseInt(req.query.monthStart, 10);
    } else {
      const now = new Date();
      dayStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
      weekStart = dayStart - 7 * 24 * 60 * 60;
      monthStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    }

    const [dailyCharges, weeklyCharges, monthlyCharges] = await Promise.all([
      stripe.charges.list({ created: { gte: dayStart }, limit: 100 }),
      stripe.charges.list({ created: { gte: weekStart }, limit: 100 }),
      stripe.charges.list({ created: { gte: monthStart }, limit: 100 }),
    ]);

    const primaryCurrency =
      monthlyCharges.data.find((charge) => charge.status === 'succeeded' && charge.currency)?.currency || 'brl';

    const todayCount = dailyCharges.data.filter((ch) => ch.status === 'succeeded').length;
    const weekCount = weeklyCharges.data.filter((ch) => ch.status === 'succeeded').length;
    const monthCount = monthlyCharges.data.filter((ch) => ch.status === 'succeeded').length;

    const allChargesEver = await stripe.charges.list({ limit: 100 });
    const completedOrdersEver = allChargesEver.data.filter((ch) => ch.status === 'succeeded').length;

    const {
      data: { users: allUsers = [] },
      error: usersError,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      throw usersError;
    }

    const totalUsers = allUsers.length;
    const newThisWeek = allUsers.filter((user) => {
      const createdSec = Math.floor(new Date(user.created_at).getTime() / 1000);
      return createdSec >= weekStart;
    }).length;

    const salesTrends = {
      daily: [],
      weekly: [],
      monthly: [],
    };

    const balanceData = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const balanceTransactions = await stripe.balanceTransactions.list({
      created: {
        gte: Math.floor(thirtyDaysAgo.getTime() / 1000),
      },
      limit: 100,
    });

    const transactionsByDay = {};
    balanceTransactions.data
      .filter((txn) => txn.currency === primaryCurrency)
      .forEach((txn) => {
        const date = new Date(txn.created * 1000);
        const day = date.toISOString().split('T')[0];

        if (!transactionsByDay[day]) {
          transactionsByDay[day] = {
            day,
            current_balance: 0,
            payouts: 0,
            net_transactions: 0,
            payments: 0,
            refunds: 0,
            transfers: 0,
            chargeback_withdrawals: 0,
            chargeback_reversals: 0,
            other_adjustments: 0,
            other_transactions: 0,
          };
        }

        const amount = txn.amount / 100;
        const net = txn.net / 100;

        if (txn.type === 'payout') {
          transactionsByDay[day].payouts += net;
        } else if (txn.type === 'transfer') {
          transactionsByDay[day].transfers += net;
        } else if (['charge', 'payment'].includes(txn.type)) {
          transactionsByDay[day].payments += net;
        } else if (['payment_refund', 'refund', 'payment_failure_refund'].includes(txn.type)) {
          transactionsByDay[day].refunds += net;
        } else if (txn.type === 'adjustment') {
          if (txn.description?.toLowerCase().includes('chargeback withdrawal')) {
            transactionsByDay[day].chargeback_withdrawals += net;
          } else if (txn.description?.toLowerCase().includes('chargeback reversal')) {
            transactionsByDay[day].chargeback_reversals += net;
          } else {
            transactionsByDay[day].other_adjustments += net;
          }
        } else {
          transactionsByDay[day].other_transactions += net;
        }

        if (txn.type !== 'payout') {
          transactionsByDay[day].net_transactions += net;
        }
      });

    let runningBalance = 0;
    Object.values(transactionsByDay)
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .forEach((dayData) => {
        runningBalance += dayData.net_transactions;
        dayData.current_balance = runningBalance;
        balanceData.push(dayData);
      });

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const dayTransactions = await stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startOfDate.getTime() / 1000),
          lt: Math.floor(endOfDate.getTime() / 1000),
        },
        limit: 100,
      });

      const sales = dayTransactions.data
        .filter((txn) => txn.currency === primaryCurrency)
        .filter((txn) => ['payment', 'charge'].includes(txn.type))
        .reduce((sum, txn) => sum + txn.amount / 100, 0);

      const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

      salesTrends.daily.push({
        date: formattedDate,
        sales: Number(sales.toFixed(2)),
      });
    }

    for (let i = 3; i >= 0; i--) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - i * 7);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);

      const weekTransactions = await stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lt: Math.floor(endDate.getTime() / 1000),
        },
        limit: 100,
      });

      const sales = weekTransactions.data
        .filter((txn) => txn.currency === primaryCurrency)
        .filter((txn) => ['payment', 'charge'].includes(txn.type))
        .reduce((sum, txn) => sum + txn.amount / 100, 0);

      salesTrends.weekly.push({
        date: `Week ${4 - i}`,
        sales: Number(sales.toFixed(2)),
      });
    }

    for (let i = 2; i >= 0; i--) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() - i);
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const nextMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);

      const monthTransactions = await stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lt: Math.floor(nextMonth.getTime() / 1000),
        },
        limit: 100,
      });

      const sales = monthTransactions.data
        .filter((txn) => txn.currency === primaryCurrency)
        .filter((txn) => ['payment', 'charge'].includes(txn.type))
        .reduce((sum, txn) => sum + txn.amount / 100, 0);

      salesTrends.monthly.push({
        date: `${endDate.getMonth() + 1}`.padStart(2, '0'),
        sales: Number(sales.toFixed(2)),
      });
    }

    res.json({
      today: todayCount,
      week: weekCount,
      month: monthCount,
      completedOrders: completedOrdersEver,
      users: { total: totalUsers, newThisWeek },
      salesTrends,
      balanceData,
      currency: primaryCurrency.toUpperCase(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('stats_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    });
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'unknown_error',
    });
  }
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  const action = req.query?.action;

  switch (action) {
    case 'track':
      return handleTrack(req, res, requestMeta);
    case 'summary':
      return handleSummary(req, res, requestMeta);
    case 'monthly':
      return handleMonthly(req, res, requestMeta);
    case 'top-products':
      return handleTopProducts(req, res, requestMeta);
    case 'stats':
      return handleStats(req, res, requestMeta);
    default:
      res.status(404).json({ error: 'Unknown analytics action' });
  }
}
