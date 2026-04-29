import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const getAuthenticatedUser = async (req, res) => {
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

  if (error || !user?.email) {
    res.status(401).json({ error: 'Invalid auth token' });
    return null;
  }

  return user;
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    logger.warn('my_orders_method_not_allowed', requestMeta);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) {
      return;
    }

    const allSessionsList = await stripe.checkout.sessions.list({ limit: 100 });
    const paidSessions = allSessionsList.data.filter(
      (session) =>
        session.payment_status === 'paid' &&
        (session.customer_details?.email || '').toLowerCase() === user.email?.toLowerCase()
    );

    const ordersList = await Promise.all(
      paidSessions.map(async (session) => {
        const lineItemsList = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
        const items = lineItemsList.data.map((lineItem) => {
          const price = parseFloat(((lineItem.amount_total ?? lineItem.price?.unit_amount ?? 0) / 100).toFixed(2));
          return {
            name:
              lineItem.price_data?.product_data?.name ||
              lineItem.price?.product_data?.name ||
              lineItem.description ||
              'Unknown Item',
            price,
            ebookId:
              lineItem.price_data?.product_data?.metadata?.ebookId ||
              lineItem.price?.product_data?.metadata?.ebookId ||
              null,
          };
        });

        return {
          id: session.id,
          date: (session.created ?? 0) * 1000,
          name: session.customer_details?.name || '',
          email: session.customer_details?.email || '',
          total: parseFloat(((session.amount_total ?? 0) / 100).toFixed(2)),
          items,
        };
      })
    );

    res.status(200).json({ orders: ordersList });
  } catch (error) {
    logger.error('my_orders_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}
