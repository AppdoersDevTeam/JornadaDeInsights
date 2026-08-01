import { requireUser } from '../lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';

// --- action=subscribe ---

const handleSubscribe = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'POST,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const { user, supabaseAdmin } = auth;

    const { endpoint, keys, userAgent } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'Invalid push subscription' });
      return;
    }

    const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        user_email: (user.email || '').toLowerCase(),
        endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
        user_agent: userAgent || null,
      },
      { onConflict: 'endpoint' }
    );
    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('push_subscribe_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- action=unsubscribe ---

const handleUnsubscribe = async (req, res, requestMeta) => {
  applyCors(req, res, { methods: 'POST,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const { user, supabaseAdmin } = auth;

    const { endpoint } = req.body || {};
    if (!endpoint) {
      res.status(400).json({ error: 'endpoint is required' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);
    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('push_unsubscribe_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  const action = req.query?.action;

  switch (action) {
    case 'subscribe':
      return handleSubscribe(req, res, requestMeta);
    case 'unsubscribe':
      return handleUnsubscribe(req, res, requestMeta);
    default:
      res.status(404).json({ error: 'Unknown push action' });
  }
}
