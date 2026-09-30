import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { captureServerError } from '../lib/monitoring.js';
import { buildPurchaseEmail } from '../lib/purchase-email.js';
import {
  buildPurchaseRows,
  listSessionProducts,
  persistPurchaseRows,
  resolveEbookIdsByTitle,
  sessionEmail,
} from '../lib/stripe-purchases.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const resend = new Resend(process.env.RESEND_API_KEY);

const getRawBody = async (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration for webhook processing');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const isDuplicateError = (error) => error && error.code === '23505';

const persistPurchases = async (supabaseAdmin, session, products) => {
  if (!sessionEmail(session)) return;
  const resolved = await resolveEbookIdsByTitle(supabaseAdmin, products);
  const unmatched = resolved.filter((product) => !product.productId).map((product) => product.title);
  if (unmatched.length) {
    console.error('persistPurchases unmatched line items:', session.id, unmatched);
  }
  const error = await persistPurchaseRows(supabaseAdmin, buildPurchaseRows(session, resolved));
  if (error) {
    console.error('persistPurchases failed:', session.id, error.message || error);
  }
};

const sendPurchaseEmail = async ({ products, customerEmail, customerName, locale }) => {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is not configured');
  }

  const { subject, html } = buildPurchaseEmail({ products, customerName, locale, frontendUrl });
  const { error } = await resend.emails.send({
    from: 'Suporte Jornada de Insights <suporte@jornadadeinsights.com>',
    to: customerEmail,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || 'Failed to send purchase email');
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    }

    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const supabaseAdmin = createSupabaseAdmin();

    const eventRecord = {
      event_id: event.id,
      event_type: event.type,
      session_id: event.data?.object?.id || null,
    };

    const { error: eventInsertError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .insert(eventRecord);

    if (eventInsertError && isDuplicateError(eventInsertError)) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    if (eventInsertError) {
      throw eventInsertError;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const isDonation = session?.metadata?.type === 'donation';
      const isPaid = session?.payment_status === 'paid';

      if (!isDonation && isPaid) {
        const sessionId = session.id;
        const customerEmail = (session.customer_details?.email || session.customer_email || '').trim();
        const customerName = session.customer_details?.name || customerEmail;

        const products = await listSessionProducts(stripe, session);

        try {
          await persistPurchases(supabaseAdmin, session, products);
        } catch (persistError) {
          console.error('Webhook purchase persist failed (non-fatal):', persistError);
        }

        try {
          await supabaseAdmin.from('lifecycle_events').insert({
            event_name: 'purchase_completed',
            page_path: '/success',
            metadata: {
              session_id: sessionId,
              ebook_ids: session.metadata?.ebook_ids || '',
              course_ids: session.metadata?.course_ids || '',
            },
          });
        } catch {
          // lifecycle table optional
        }

        if (customerEmail) {
          const { error: reserveError } = await supabaseAdmin.from('purchase_email_events').insert({
            session_id: sessionId,
            customer_email: customerEmail,
            status: 'processing',
          });

          if (!reserveError) {
            try {
              await sendPurchaseEmail({
                products,
                customerEmail,
                customerName,
                locale: session.metadata?.locale || '',
              });

              await supabaseAdmin
                .from('purchase_email_events')
                .update({
                  status: 'sent',
                  sent_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  last_error: null,
                })
                .eq('session_id', sessionId);
            } catch (emailError) {
              await supabaseAdmin
                .from('purchase_email_events')
                .update({
                  status: 'failed',
                  updated_at: new Date().toISOString(),
                  last_error: emailError instanceof Error ? emailError.message : 'Unknown email error',
                })
                .eq('session_id', sessionId);
              throw emailError;
            }
          } else if (!isDuplicateError(reserveError)) {
            throw reserveError;
          }
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    captureServerError(error, { route: 'stripe-webhook' });
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Webhook failed' });
  }
}
