import { createClient } from '@supabase/supabase-js';

const DEFAULT_ALLOWED_ADMIN_EMAILS = [
  'devteam@appdoers.co.nz',
  'ptasbr2020@gmail.com',
];

const getAllowedAdmins = () => {
  const envValue = process.env.ALLOWED_ADMIN_EMAILS || '';
  const parsed = envValue
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ADMIN_EMAILS;
};

export const requireAdmin = async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    res.status(500).json({ error: 'Missing Supabase auth configuration' });
    return null;
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    res.status(401).json({ error: 'Missing auth token' });
    return null;
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(idToken);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid auth token' });
    return null;
  }

  const allowedAdmins = getAllowedAdmins();
  if (!allowedAdmins.includes((user.email || '').toLowerCase())) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return { user, supabaseAdmin };
};
