import Stripe from 'stripe';
import { Resend } from 'resend';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://jornadadeinsights.com'
    : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    res.status(204).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, customerEmail, customerName } = req.body;
    console.log('Received email request:', { sessionId, customerEmail, customerName });

    // Validate required fields
    if (!sessionId || !customerEmail || !customerName) {
      console.error('Missing required fields:', { sessionId, customerEmail, customerName });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate environment variables
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    if (!process.env.FRONTEND_URL) {
      console.error('FRONTEND_URL is not configured');
      return res.status(500).json({ error: 'Frontend URL not configured' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Get the session details from Stripe
    console.log('Retrieving Stripe session:', sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Stripe session:', session);
    
    if (!session || session.payment_status !== 'paid') {
      console.error('Invalid or unpaid session:', session);
      return res.status(400).json({ error: 'Invalid or unpaid session' });
    }

    // Get line items for the session
    console.log('Retrieving line items for session:', sessionId);
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    console.log('Line items:', lineItems.data);
    
    // Get the purchased eBook titles
    const purchasedEbooks = lineItems.data.map(item => ({
      title: item.description || item.price_data?.product_data?.name,
      id: item.price_data?.product_data?.metadata?.ebookId
    }));

    // Send email using Resend
    console.log('Sending email to:', customerEmail);
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
      console.error('Resend API error:', error);
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: error.message,
        code: error.code,
        statusCode: error.statusCode
      });
    }

    console.log('Email sent successfully:', data);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error in send-purchase-email:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
} 