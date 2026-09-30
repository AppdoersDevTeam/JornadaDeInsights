import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { captureServerError } from '../lib/monitoring.js';
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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
  const unmatched = resolved.filter((product) => !product.ebookId).map((product) => product.title);
  if (unmatched.length) {
    console.error('persistPurchases unmatched line items:', session.id, unmatched);
  }
  const error = await persistPurchaseRows(supabaseAdmin, buildPurchaseRows(session, resolved));
  if (error) {
    console.error('persistPurchases failed:', session.id, error.message || error);
  }
};

const sendPurchaseEmail = async ({ products, customerEmail, customerName, locale }) => {
  const purchasedEbooks = products.map((product) => ({ title: product.title }));

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is not configured');
  }

  const isEn = typeof locale === 'string' && locale.toLowerCase().startsWith('en');
  const subject = isEn
    ? 'Purchase Confirmation - Journey of Insights'
    : 'Confirmação de Compra - Jornada de Insights';
  const heading = isEn
    ? `Thank you for your purchase, ${escapeHtml(customerName)}!`
    : `Obrigado pela sua compra, ${escapeHtml(customerName)}!`;
  const body = isEn
    ? 'We are happy to confirm your recent purchase. You can access your eBooks in your dashboard.'
    : 'Estamos felizes em confirmar sua compra recente. Você já pode acessar seus eBooks no seu painel.';
  const listTitle = isEn ? 'Your purchased eBooks:' : 'Seus eBooks adquiridos:';
  const cta = isEn ? 'Access My eBooks' : 'Acessar Meus eBooks';

  const { error } = await resend.emails.send({
    from: 'Suporte Jornada de Insights <suporte@jornadadeinsights.com>',
    to: customerEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">${heading}</h1>
        <p style="color: #666; line-height: 1.6;">${body}</p>
        <div style="margin: 20px 0;">
          <h2 style="color: #333; margin-bottom: 10px;">${listTitle}</h2>
          <ul style="list-style: none; padding: 0;">
            ${purchasedEbooks
              .map(
                (ebook) => `
                  <li style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    ${escapeHtml(ebook.title)}
                  </li>
                `
              )
              .join('')}
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}/user-dashboard?tab=ebooks"
             style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            ${cta}
          </a>
        </div>
      </div>
    `,
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
