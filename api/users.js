import { requireAdmin } from './_lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,DELETE,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (!['GET', 'DELETE'].includes(req.method)) {
    logger.warn('users_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) {
      return;
    }
    const { supabaseAdmin } = auth;

    if (req.method === 'DELETE') {
      const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
      if (!uid) {
        res.status(400).json({ error: 'Missing uid query parameter' });
        return;
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (error) {
        throw error;
      }

      res.status(200).json({ success: true, uid });
      return;
    }

    const {
      data: { users: supabaseUsers = [] },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const users = supabaseUsers.map((u) => {
      return {
        uid: u.id,
        displayName: u.user_metadata?.full_name || null,
        email: u.email,
        photoURL: u.user_metadata?.avatar_url || null,
      }
    });
    res.json({ users });
  } catch (error) {
    logger.error('users_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
} 