import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env file from:', envPath);
dotenv.config({ path: envPath });

// Debug environment variables
console.log('Environment variables loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Not set');
console.log('PORT:', process.env.PORT || 3000);

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  console.error('Current working directory:', process.cwd());
  console.error('Environment file path:', envPath);
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;

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

/** Protect privileged Express routes (legacy server). Fail closed. */
const requireExpressAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return res.status(401).json({ error: 'Missing auth token' });
    }
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(idToken);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }
    if (!getAllowedAdmins().includes((user.email || '').toLowerCase())) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.adminUser = user;
    return next();
  } catch (error) {
    console.error('Express admin auth failed:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://jornadadeinsights.com', 'https://jornada-de-insights-nu.vercel.app']
    : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Validate cart shape — prices resolved from ebooks_metadata
const validateCartItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart must be a non-empty array');
  }

  return items.every((item) => {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error('Each item must have a valid id');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Each item must have a valid quantity');
    }
    return true;
  });
};

const resolveCheckoutItems = async (items) => {
  const ids = items.map((item) => item.id);
  const { data, error } = await supabase
    .from('ebooks_metadata')
    .select('id, title, description, price')
    .in('id', ids);
  if (error) throw error;
  const byId = new Map((data || []).map((row) => [row.id, row]));
  return items.map((item) => {
    const row = byId.get(item.id);
    if (!row) throw new Error(`Unknown ebook: ${item.id}`);
    const unitAmount = Math.round(Number(row.price) * 100);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      throw new Error(`Invalid catalog price for ebook: ${item.id}`);
    }
    return {
      id: row.id,
      name: row.title || item.name || 'eBook',
      description: item.description || row.description || 'Digital eBook',
      price: unitAmount,
      quantity: item.quantity,
      image: item.image,
    };
  });
};

// Create checkout session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customerEmail, locale } = req.body;

    validateCartItems(items);
    const resolvedItems = await resolveCheckoutItems(items);
    const ebookIds = resolvedItems.map((item) => item.id).join(',');
    const stripeLocale =
      locale === 'en' || locale === 'en-US' ? 'en' : locale === 'pt' || locale === 'pt-BR' ? 'pt-BR' : 'auto';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      locale: stripeLocale,
      currency: 'brl',
      customer_email: typeof customerEmail === 'string' ? customerEmail : undefined,
      line_items: resolvedItems.map((item) => {
        let imageUrl = item.image;
        if (imageUrl) {
          try {
            const url = new URL(imageUrl);
            url.search = '';
            url.hash = '';
            url.protocol = 'https:';
            imageUrl = url.toString();
          } catch (error) {
            console.error('Error processing image URL:', error);
            imageUrl = undefined;
          }
        }

        return {
          price_data: {
            currency: 'brl',
            product_data: {
              name: item.name,
              description: item.description || 'Digital eBook',
              images: imageUrl ? [imageUrl] : [],
              metadata: {
                ebookId: item.id,
                type: 'ebook',
              },
            },
            unit_amount: item.price,
          },
          quantity: item.quantity,
          adjustable_quantity: {
            enabled: false,
          },
        };
      }),
      payment_intent_data: {
        metadata: {
          product_names: resolvedItems.map((item) => item.name).join(', '),
          type: 'ebook_purchase',
          ebook_ids: ebookIds,
        },
      },
      metadata: {
        type: 'ebook_purchase',
        ebook_ids: ebookIds,
        locale: typeof locale === 'string' ? locale : '',
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    });
  }
});

// Create donation checkout session endpoint
app.post('/api/create-donation-session', async (req, res) => {
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
    res.status(204).end();
    return;
  }

  try {
    const { amount, note, isRecurring } = req.body;

    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount < 500) {
      return res.status(400).json({ 
        error: 'O valor mínimo da doação é R$ 5,00 (500 centavos)' 
      });
    }

    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    if (!process.env.FRONTEND_URL) {
      console.error('Missing FRONTEND_URL environment variable');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create Stripe checkout session for donation
    const sessionConfig = {
      payment_method_types: ['card'],
      locale: 'pt-BR',
      currency: 'brl',
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: isRecurring ? 'Doação Recorrente - Jornada de Insights' : 'Doação Única - Jornada de Insights',
            description: note || 'Doação para apoiar o ministério Jornada de Insights',
            metadata: {
              type: 'donation',
              note: note || '',
            }
          },
          unit_amount: amount, // Amount in cents
          ...(isRecurring && {
            recurring: {
              interval: 'month'
            }
          })
        },
        quantity: 1,
      }],
      mode: isRecurring ? 'subscription' : 'payment',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&type=donation`,
      cancel_url: `${process.env.FRONTEND_URL}/donation`,
      allow_promotion_codes: false,
      billing_address_collection: 'required',
      metadata: {
        type: 'donation',
        isRecurring: isRecurring ? 'true' : 'false',
        note: note || '',
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating donation checkout session:', error);
    res.status(500).json({ 
      error: error.message || 'Falha ao criar sessão de pagamento' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get analytics data
app.get('/stats', requireExpressAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get balance transactions for different time periods
    const [todayTransactions, weekTransactions, monthTransactions] = await Promise.all([
      stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startOfDay.getTime() / 1000)
        },
        limit: 100
      }),
      stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startOfWeek.getTime() / 1000)
        },
        limit: 100
      }),
      stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startOfMonth.getTime() / 1000)
        },
        limit: 100
      })
    ]);

    // Calculate totals for each period
    const calculateTotal = (transactions) => {
      return transactions.data.reduce((total, txn) => {
        if (txn.type === 'charge' && txn.status === 'available') {
          return total + txn.amount;
        }
        return total;
      }, 0) / 100; // Convert from cents to dollars
    };

    const today = calculateTotal(todayTransactions.data);
    const week = calculateTotal(weekTransactions.data);
    const month = calculateTotal(monthTransactions.data);

    // Get unique customers
    const charges = await stripe.charges.list({
      limit: 100,
      created: {
        gte: Math.floor(startOfMonth.getTime() / 1000)
      }
    });

    const uniqueCustomers = new Set(charges.data.map(charge => charge.customer));
    const newCustomersThisWeek = new Set(
      charges.data
        .filter(charge => new Date(charge.created * 1000) >= startOfWeek)
        .map(charge => charge.customer)
    );

    // Generate sales trends data
    const salesTrends = {
      daily: [],
      weekly: [],
      monthly: []
    };

    // Daily data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const dayTransactions = await stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startOfDate.getTime() / 1000),
          lt: Math.floor(endOfDate.getTime() / 1000)
        },
        limit: 100
      });

      const sales = dayTransactions.data
        .filter(txn => txn.type === 'charge' && txn.status === 'available')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      const refunds = dayTransactions.data
        .filter(txn => txn.type === 'refund')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      const disputes = dayTransactions.data
        .filter(txn => txn.type === 'dispute')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      const disputesWon = dayTransactions.data
        .filter(txn => txn.type === 'dispute' && txn.status === 'won')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      salesTrends.daily.push({
        date: date.toISOString().split('T')[0],
        sales,
        refunds,
        disputes,
        disputesWon,
        otherAdjustments: 0,
        totalGrossActivity: sales - refunds - disputes + disputesWon,
        customersCount: new Set(dayTransactions.data.map(txn => txn.source?.customer)).size,
        salesCount: dayTransactions.data.filter(txn => txn.type === 'charge').length,
        refundCount: dayTransactions.data.filter(txn => txn.type === 'refund').length,
        disputeCount: dayTransactions.data.filter(txn => txn.type === 'dispute').length,
        disputesWonCount: dayTransactions.data.filter(txn => txn.type === 'dispute' && txn.status === 'won').length
      });
    }

    // Weekly data for the last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - (i * 7));
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);

      const weekTransactions = await stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lt: Math.floor(endDate.getTime() / 1000)
        },
        limit: 100
      });

      const sales = weekTransactions.data
        .filter(txn => txn.type === 'charge' && txn.status === 'available')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      const refunds = weekTransactions.data
        .filter(txn => txn.type === 'refund')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      const disputes = weekTransactions.data
        .filter(txn => txn.type === 'dispute')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      const disputesWon = weekTransactions.data
        .filter(txn => txn.type === 'dispute' && txn.status === 'won')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      salesTrends.weekly.push({
        date: `Week ${4-i}`,
        sales,
        refunds,
        disputes,
        disputesWon,
        otherAdjustments: 0,
        totalGrossActivity: sales - refunds - disputes + disputesWon,
        customersCount: new Set(weekTransactions.data.map(txn => txn.source?.customer)).size,
        salesCount: weekTransactions.data.filter(txn => txn.type === 'charge').length,
        refundCount: weekTransactions.data.filter(txn => txn.type === 'refund').length,
        disputeCount: weekTransactions.data.filter(txn => txn.type === 'dispute').length,
        disputesWonCount: weekTransactions.data.filter(txn => txn.type === 'dispute' && txn.status === 'won').length
      });
    }

    // Monthly data for the last 3 months
    for (let i = 2; i >= 0; i--) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() - i);
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const nextMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);

      const monthTransactions = await stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lt: Math.floor(nextMonth.getTime() / 1000)
        },
        limit: 100
      });

      const sales = monthTransactions.data
        .filter(txn => txn.type === 'charge' && txn.status === 'available')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      const refunds = monthTransactions.data
        .filter(txn => txn.type === 'refund')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      const disputes = monthTransactions.data
        .filter(txn => txn.type === 'dispute')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      const disputesWon = monthTransactions.data
        .filter(txn => txn.type === 'dispute' && txn.status === 'won')
        .reduce((sum, txn) => sum + txn.amount, 0) / 100;

      salesTrends.monthly.push({
        date: `${endDate.getMonth() + 1}`.padStart(2, '0'),
        sales,
        refunds,
        disputes,
        disputesWon,
        otherAdjustments: 0,
        totalGrossActivity: sales - refunds - disputes + disputesWon,
        customersCount: new Set(monthTransactions.data.map(txn => txn.source?.customer)).size,
        salesCount: monthTransactions.data.filter(txn => txn.type === 'charge').length,
        refundCount: monthTransactions.data.filter(txn => txn.type === 'refund').length,
        disputeCount: monthTransactions.data.filter(txn => txn.type === 'dispute').length,
        disputesWonCount: monthTransactions.data.filter(txn => txn.type === 'dispute' && txn.status === 'won').length
      });
    }

    res.json({
      today,
      week,
      month,
      completedOrders: charges.data.length,
      users: {
        total: uniqueCustomers.size,
        newThisWeek: newCustomersThisWeek.size
      },
      salesTrends
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Endpoint to list all completed checkout orders
app.get('/completed-orders', requireExpressAdmin, async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://jornadadeinsights.com'
    : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    // List all checkout sessions and filter for paid sessions
    const allSessionsList = await stripe.checkout.sessions.list({ limit: 100 });
    const paidSessions = allSessionsList.data.filter(sess => sess.payment_status === 'paid');
    // For each paid session, fetch line items and map to ebook titles
    const ordersList = await Promise.all(
      paidSessions.map(async (sess) => {
        const lineItemsList = await stripe.checkout.sessions.listLineItems(sess.id, { limit: 100 });
        const items = lineItemsList.data.map(li => {
          const price = parseFloat(((li.amount_total ?? li.price?.unit_amount ?? 0) / 100).toFixed(2));
          return {
            name: li.price_data?.product_data?.name ||
                  li.price?.product_data?.name ||
                  li.description ||
                  'Unknown Item',
            price: price,
            ebookId: li.price_data?.product_data?.metadata?.ebookId ||
                     li.price?.product_data?.metadata?.ebookId ||
                     null
          };
        });
        return {
          id: sess.id,
          date: (sess.created ?? 0) * 1000,
          name: sess.customer_details?.name || '',
          email: sess.customer_details?.email || '',
          total: parseFloat(((sess.amount_total ?? 0) / 100).toFixed(2)),
          items,
        };
      })
    );
    res.json({ orders: ordersList });
  } catch (error) {
    console.error('Error listing completed orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to list all authenticated users
app.get('/users', requireExpressAdmin, async (req, res) => {
  try {
    const {
      data: { users: supabaseUsers = [] },
      error,
    } = await supabase.auth.admin.listUsers({
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
      };
    });
    res.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to proxy user profile photos (handles Google rate limits)
app.get('/user-photo/:uid', requireExpressAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(req.params.uid);
    if (error) {
      throw error;
    }

    const photoURL = data.user?.user_metadata?.avatar_url;
    if (!photoURL) {
      return res.status(404).send('No photo');
    }
    return res.redirect(photoURL);
  } catch (err) {
    console.error('Error fetching user for photo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to send purchase confirmation email
app.post('/send-purchase-email', requireExpressAdmin, async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log('Received email request:', { sessionId });

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Invalid or unpaid session' });
    }

    const customerEmail = (session.customer_details?.email || session.customer_email || '').trim();
    const customerName = session.customer_details?.name || customerEmail;
    if (!customerEmail) {
      return res.status(400).json({ error: 'Session has no customer email' });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);

    const purchasedEbooks = lineItems.data.map((item) => ({
      title: item.description || item.price_data?.product_data?.name,
    }));

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    if (!process.env.FRONTEND_URL) {
      return res.status(500).json({ error: 'Frontend URL not configured' });
    }

    const escapeHtml = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const { data, error } = await resend.emails.send({
      from: 'Suporte Jornada de Insights <suporte@jornadadeinsights.com>',
      to: customerEmail,
      subject: 'Confirmação de Compra - Jornada de Insights',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Obrigado pela sua compra, ${escapeHtml(customerName)}!</h1>
          <ul>
            ${purchasedEbooks.map((ebook) => `<li>${escapeHtml(ebook.title)}</li>`).join('')}
          </ul>
          <a href="${process.env.FRONTEND_URL}/user-dashboard?tab=ebooks">Acessar Meus eBooks</a>
        </div>
      `,
    });

    if (error) {
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('Error in send-purchase-email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Top products endpoint
app.get('/api/top-products', requireExpressAdmin, async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://jornadadeinsights.com'
    : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    // Get current month's start date
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthUnix = Math.floor(startOfMonth.getTime() / 1000);

    // Fetch successful charges from this month
    const charges = await stripe.charges.list({
      created: { gte: startOfMonthUnix },
      limit: 100,
      status: 'succeeded',
      currency: 'usd'
    });

    // Group charges by product name and calculate totals
    const productMap = new Map();

    charges.data.forEach(charge => {
      const productName = charge.description || 'Unknown Product';
      const current = productMap.get(productName) || { sales: 0, revenue: 0 };
      
      // Convert amount from cents to dollars
      const amount = charge.amount / 100;
      
      productMap.set(productName, {
        sales: current.sales + 1,
        revenue: current.revenue + amount
      });
    });

    // Convert to array and sort by sales
    const products = Array.from(productMap.entries())
      .map(([name, data]) => ({
        name,
        sales: data.sales,
        revenue: data.revenue
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 3); // Get top 3 products

    res.json({ products });
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
