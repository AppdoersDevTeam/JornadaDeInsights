import { createClient } from '@supabase/supabase-js';

const ALLOWED_ADMIN_EMAILS = [
  'devteam@appdoers.co.nz',
  'ptasbr2020@gmail.com',
];

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

const getAllowedOrigin = (origin) => {
  const allowed = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ALLOWED_ORIGINS;
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0];
};

const toISODate = (date) => date.toISOString().split('T')[0];

const buildDailyViews = (rows, days) => {
  const end = new Date();
  const points = [];
  const counts = new Map();

  rows.forEach((row) => {
    const day = toISODate(new Date(row.created_at));
    counts.set(day, (counts.get(day) || 0) + 1);
  });

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const day = toISODate(date);
    points.push({
      date: day,
      views: counts.get(day) || 0,
    });
  }

  return points;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req.headers.origin));
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    res.status(500).json({ error: 'Missing Supabase configuration for analytics summary' });
    return;
  }

  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!idToken) {
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
      res.status(401).json({ error: 'Invalid auth token' });
      return;
    }

    const userEmail = (user.email || '').toLowerCase();

    if (!ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const requestedDays = Number.parseInt(String(req.query.days || '30'), 10);
    const days = Number.isNaN(requestedDays) ? 30 : Math.min(Math.max(requestedDays, 1), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('site_page_views')
      .select('created_at, page_path, country, visitor_id')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(50000);

    if (error) {
      throw error;
    }

    const rows = data || [];
    const totalPageViews = rows.length;
    const uniqueVisitors = new Set(rows.map((row) => row.visitor_id)).size;

    const pageMap = new Map();
    const countryMap = new Map();

    rows.forEach((row) => {
      const page = row.page_path || '/';
      const country = row.country || 'Unknown';
      pageMap.set(page, (pageMap.get(page) || 0) + 1);
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });

    const topPages = [...pageMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([page, views]) => ({ page, views }));

    const topCountries = [...countryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, views]) => ({ country, views }));

    res.status(200).json({
      totalPageViews,
      uniqueVisitors,
      topPages,
      topCountries,
      dailyViews: buildDailyViews(rows, days),
      windowDays: days,
    });
  } catch (error) {
    console.error('site-analytics-summary error:', error);
    res.status(500).json({ error: 'Failed to build analytics summary' });
  }
}
