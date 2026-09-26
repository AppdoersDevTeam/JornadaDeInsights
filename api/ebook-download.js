import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { requireUser } from '../lib/admin-auth.js';
import { applyCors, handleOptionsRequest } from '../lib/cors.js';
import { logger, getRequestMeta } from '../lib/logger.js';
import { captureServerError } from '../lib/monitoring.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const userOwnsEbook = async (supabaseAdmin, userEmail, ebookId) => {
  const email = (userEmail || '').toLowerCase();
  if (!email || !ebookId) return false;

  const { data, error } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .ilike('customer_email', email)
    .eq('ebook_id', ebookId)
    .limit(1);

  // Missing table / RLS errors → fall through to Stripe
  if (!error && data?.length) {
    return true;
  }

  if (!stripe) return false;

  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  const paidForUser = sessions.data.filter(
    (session) =>
      session.payment_status === 'paid' &&
      (session.customer_details?.email || session.customer_email || '').toLowerCase() === email
  );

  for (const session of paidForUser) {
    const metaIds = (session.metadata?.ebook_ids || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (metaIds.includes(ebookId)) {
      return true;
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    for (const lineItem of lineItems.data) {
      const lineEbookId =
        lineItem.price_data?.product_data?.metadata?.ebookId ||
        lineItem.price?.product_data?.metadata?.ebookId ||
        null;
      if (lineEbookId === ebookId) {
        return true;
      }
    }
  }

  return false;
};

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);
  applyCors(req, res, { methods: 'GET,OPTIONS' });
  if (handleOptionsRequest(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;

    const ebookId = typeof req.query?.ebookId === 'string' ? req.query.ebookId : '';
    if (!ebookId) {
      res.status(400).json({ error: 'ebookId is required' });
      return;
    }

    const supabaseAdmin = createSupabaseAdmin();
    const { data: ebook, error: ebookError } = await supabaseAdmin
      .from('ebooks_metadata')
      .select('id, filename, title')
      .eq('id', ebookId)
      .single();

    if (ebookError || !ebook?.filename) {
      res.status(404).json({ error: 'Ebook not found' });
      return;
    }

    const owns = await userOwnsEbook(supabaseAdmin, auth.user.email, ebookId);
    if (!owns && !auth.isAdmin) {
      res.status(403).json({ error: 'Purchase required' });
      return;
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from('store-assets')
      .createSignedUrl(`pdfs/${ebook.filename}`, 120);

    if (signedError || !signed?.signedUrl) {
      const { data: publicData } = supabaseAdmin.storage
        .from('store-assets')
        .getPublicUrl(`pdfs/${ebook.filename}`);
      logger.warn('ebook_download_signed_fallback_public', {
        ...requestMeta,
        ebookId,
        signedError: signedError?.message,
      });
      res.status(200).json({
        url: publicData.publicUrl,
        mode: 'public_fallback',
        expiresIn: null,
      });
      return;
    }

    res.status(200).json({
      url: signed.signedUrl,
      mode: 'signed',
      expiresIn: 120,
    });
  } catch (error) {
    captureServerError(error, { route: 'ebook-download' });
    logger.error('ebook_download_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'Failed to create download URL' });
  }
}
