import Stripe from 'stripe';
import { Resend } from 'resend';
import { applyCors, handleOptionsRequest } from './_lib/cors.js';
import { logger, getRequestMeta } from './_lib/logger.js';
import { captureServerError } from './_lib/monitoring.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const requestMeta = getRequestMeta(req);

  applyCors(req, res, { methods: 'POST,OPTIONS' });

  if (handleOptionsRequest(req, res)) {
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    logger.warn('send_purchase_email_method_not_allowed', requestMeta);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, customerEmail, customerName } = req.body;
    logger.info('send_purchase_email_requested', {
      ...requestMeta,
      hasSessionId: Boolean(sessionId),
    });

    // Validate required fields
    if (!sessionId || !customerEmail || !customerName) {
      logger.warn('send_purchase_email_missing_fields', requestMeta);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate environment variables
    if (!process.env.RESEND_API_KEY) {
      logger.error('send_purchase_email_missing_resend_key', requestMeta);
      return res.status(500).json({ error: 'Email service not configured' });
    }

    if (!process.env.FRONTEND_URL) {
      logger.error('send_purchase_email_missing_frontend_url', requestMeta);
      return res.status(500).json({ error: 'Frontend URL not configured' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error('send_purchase_email_missing_stripe_key', requestMeta);
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Get the session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session || session.payment_status !== 'paid') {
      logger.warn('send_purchase_email_unpaid_session', requestMeta);
      return res.status(400).json({ error: 'Invalid or unpaid session' });
    }

    // Get line items for the session
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    
    // Get the purchased eBook titles
    const purchasedEbooks = lineItems.data.map(item => ({
      title: item.description || item.price_data?.product_data?.name,
      id: item.price_data?.product_data?.metadata?.ebookId
    }));

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Suporte Jornada de Insights <suporte@jornadadeinsights.com>',
      to: customerEmail,
      subject: 'Confirmação de Compra - Jornada de Insights',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Obrigado pela sua compra, ${customerName}!</h1>
          <p style="color: #666; line-height: 1.6;">
            Estamos felizes em confirmar sua compra recente. Você já pode acessar seus eBooks no seu painel.
          </p>
          <div style="margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 10px;">Seus eBooks adquiridos:</h2>
            <ul style="list-style: none; padding: 0;">
              ${purchasedEbooks.map(ebook => `
                <li style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                  ${ebook.title}
                </li>
              `).join('')}
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/user-dashboard?tab=ebooks" 
               style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Acessar Meus eBooks
            </a>
          </div>
          <p style="color: #666; line-height: 1.6;">
            Se você tiver alguma dúvida ou precisar de ajuda, não hesite em nos contatar.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Atenciosamente,<br>
            Patricia
          </p>
        </div>
      `
    });

    if (error) {
      logger.error('send_purchase_email_resend_failed', {
        ...requestMeta,
        errorMessage: error.message,
        statusCode: error.statusCode,
      });
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: error.message,
        code: error.code,
        statusCode: error.statusCode
      });
    }

    logger.info('send_purchase_email_sent', {
      ...requestMeta,
      providerMessageId: data?.id || null,
    });
    return res.json({ success: true });
  } catch (error) {
    captureServerError(error, { route: 'send-purchase-email' });
    logger.error('send_purchase_email_failed', {
      ...requestMeta,
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'unknown_error',
    });
  }
} 