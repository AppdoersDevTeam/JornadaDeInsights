import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import https from 'https';
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

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load Firebase service account credentials
const serviceAccount = JSON.parse(
  readFileSync(
    new URL('../jornadadeinsights-firebase-adminsdk-fbsvc-c86c6a1222.json', import.meta.url),
    'utf8'
  )
);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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

// Validate cart items
const validateCartItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart must be a non-empty array');
  }

  return items.every(item => {
    if (!item.name || typeof item.name !== 'string') {
      throw new Error('Each item must have a valid name');
    }
    if (!Number.isInteger(item.price) || item.price <= 0) {
      throw new Error('Each item must have a valid price in cents');
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Each item must have a valid quantity');
    }
    return true;
  });
};

// Create checkout session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body;

    // Validate cart items
    validateCartItems(items);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      locale: 'pt-BR',
      currency: 'brl',
      line_items: items.map(item => {
        // Ensure image URL is properly formatted for Stripe
        let imageUrl = item.image;
        if (imageUrl) {
          try {
            // Parse the URL to handle it properly
            const url = new URL(imageUrl);
            
            // Remove any query parameters or fragments
            url.search = '';
            url.hash = '';
            
            // Ensure HTTPS
            url.protocol = 'https:';
            
            // Get the final URL
            imageUrl = url.toString();
          } catch (error) {
            console.error('Error processing image URL:', error);
            imageUrl = undefined;
          }
        }

        // Convert USD price to BRL (assuming 1 USD = 5 BRL for example)
        // In production, you should use a real-time exchange rate API
        const exchangeRate = 5; // This should be fetched from a real exchange rate API
        const priceInBRL = Math.round(item.price * exchangeRate);

        return {
          price_data: {
            currency: 'brl',
            product_data: {
              name: item.name,
              description: `${item.description || 'Digital eBook'} ($${(item.price/100).toFixed(2)} USD / R$${(priceInBRL/100).toFixed(2)} BRL)`,
              images: imageUrl ? [imageUrl] : [],
              metadata: { 
                ebookId: item.id,
                type: 'ebook'
              }
            },
            unit_amount: priceInBRL,
          },
          quantity: item.quantity,
          adjustable_quantity: {
            enabled: false
          }
        };
      }),
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'required'
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(error.message.includes('valid') ? 400 : 500).json({
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Stats endpoint to fetch purchase counts for today, this week, and this month
app.get('/stats', async (req, res) => {
  try {
    // Accept client-calculated thresholds for admin timezone via query, fall back to server local time
    let dayStart, weekStart, monthStart;
    if (req.query.dayStart && req.query.weekStart && req.query.monthStart) {
      dayStart = parseInt(req.query.dayStart, 10);
      weekStart = parseInt(req.query.weekStart, 10);
      monthStart = parseInt(req.query.monthStart, 10);
    } else {
      const now = new Date();
      // Start of today local midnight
      dayStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
      // Start of week threshold as last 7 days from today
      weekStart = dayStart - 7 * 24 * 60 * 60;
      // Start of month at local midnight
      monthStart = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    }

    // Fetch balance transactions for the periods
    const [dailyTransactions, weeklyTransactions, monthlyTransactions] = await Promise.all([
      stripe.balanceTransactions.list({ 
        created: { gte: dayStart },
        limit: 100,
        type: { in: ['charge', 'payment', 'payment_refund', 'refund', 'adjustment'] }
      }),
      stripe.balanceTransactions.list({ 
        created: { gte: weekStart },
        limit: 100,
        type: { in: ['charge', 'payment', 'payment_refund', 'refund', 'adjustment'] }
      }),
      stripe.balanceTransactions.list({ 
        created: { gte: monthStart },
        limit: 100,
        type: { in: ['charge', 'payment', 'payment_refund', 'refund', 'adjustment'] }
      }),
    ]);

    // Helper function to process transactions
    const processTransactions = (transactions) => {
      return transactions.data.reduce((acc, tx) => {
        const amount = tx.amount / 100; // Convert from cents to dollars
        const type = tx.type;
        const description = tx.description?.toLowerCase() || '';

        if (type === 'charge' || type === 'payment') {
          acc.sales += amount;
          acc.salesCount += 1;
        } else if (type === 'payment_refund' || type === 'refund') {
          acc.refunds += amount;
          acc.refundCount += 1;
        } else if (type === 'adjustment') {
          if (description.includes('chargeback withdrawal')) {
            acc.disputes += amount;
            acc.disputeCount += 1;
          } else if (description.includes('chargeback reversal')) {
            acc.disputesWon += amount;
            acc.disputesWonCount += 1;
          } else {
            acc.otherAdjustments += amount;
          }
        }
        acc.totalGrossActivity += amount;
        return acc;
      }, {
        sales: 0,
        refunds: 0,
        disputes: 0,
        disputesWon: 0,
        otherAdjustments: 0,
        totalGrossActivity: 0,
        salesCount: 0,
        refundCount: 0,
        disputeCount: 0,
        disputesWonCount: 0
      });
    };

    // Process transactions for each period
    const dailyStats = processTransactions(dailyTransactions);
    const weeklyStats = processTransactions(weeklyTransactions);
    const monthlyStats = processTransactions(monthlyTransactions);

    // Generate sales trends data
    const now = new Date();
    const dailyData = [];
    const weeklyData = [];
    const monthlyData = [];

    // Generate daily data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const startOfDay = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000);
      const endOfDay = startOfDay + 24 * 60 * 60;
      
      const dayTransactions = dailyTransactions.data.filter(tx => 
        tx.created >= startOfDay && 
        tx.created < endOfDay
      );
      
      const dayStats = processTransactions({ data: dayTransactions });
      
      dailyData.push({
        date: date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
        sales: dayStats.sales,
        refunds: dayStats.refunds,
        disputes: dayStats.disputes,
        disputesWon: dayStats.disputesWon,
        otherAdjustments: dayStats.otherAdjustments,
        totalGrossActivity: dayStats.totalGrossActivity,
        customersCount: dayStats.salesCount,
        salesCount: dayStats.salesCount,
        refundCount: dayStats.refundCount,
        disputeCount: dayStats.disputeCount,
        disputesWonCount: dayStats.disputesWonCount
      });
    }

    // Generate weekly data for the last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));
      const startOfWeek = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000);
      const endOfWeek = startOfWeek + 7 * 24 * 60 * 60;
      
      const weekTransactions = weeklyTransactions.data.filter(tx => 
        tx.created >= startOfWeek && 
        tx.created < endOfWeek
      );
      
      const weekStats = processTransactions({ data: weekTransactions });
      
      weeklyData.push({
        date: `Week ${4-i}`,
        sales: weekStats.sales,
        refunds: weekStats.refunds,
        disputes: weekStats.disputes,
        disputesWon: weekStats.disputesWon,
        otherAdjustments: weekStats.otherAdjustments,
        totalGrossActivity: weekStats.totalGrossActivity,
        customersCount: weekStats.salesCount,
        salesCount: weekStats.salesCount,
        refundCount: weekStats.refundCount,
        disputeCount: weekStats.disputeCount,
        disputesWonCount: weekStats.disputesWonCount
      });
    }

    // Generate monthly data for the last 3 months
    for (let i = 2; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const startOfMonth = Math.floor(new Date(date.getFullYear(), date.getMonth(), 1).getTime() / 1000);
      const endOfMonth = Math.floor(new Date(date.getFullYear(), date.getMonth() + 1, 0).getTime() / 1000);
      
      const monthTransactions = monthlyTransactions.data.filter(tx => 
        tx.created >= startOfMonth && 
        tx.created < endOfMonth
      );
      
      const monthStats = processTransactions({ data: monthTransactions });
      
      monthlyData.push({
        date: date.toLocaleDateString('en-US', { month: '2-digit' }),
        sales: monthStats.sales,
        refunds: monthStats.refunds,
        disputes: monthStats.disputes,
        disputesWon: monthStats.disputesWon,
        otherAdjustments: monthStats.otherAdjustments,
        totalGrossActivity: monthStats.totalGrossActivity,
        customersCount: monthStats.salesCount,
        salesCount: monthStats.salesCount,
        refundCount: monthStats.refundCount,
        disputeCount: monthStats.disputeCount,
        disputesWonCount: monthStats.disputesWonCount
      });
    }

    // Return analytics including user stats and sales trends
    res.json({
      today: dailyStats.salesCount,
      week: weeklyStats.salesCount,
      month: monthlyStats.salesCount,
      completedOrders: dailyStats.salesCount + weeklyStats.salesCount + monthlyStats.salesCount,
      users: { 
        total: dailyStats.salesCount + weeklyStats.salesCount + monthlyStats.salesCount, 
        newThisWeek: weeklyStats.salesCount 
      },
      thresholds: { dayStart, weekStart, monthStart },
      salesTrends: {
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to list all completed checkout orders
app.get('/completed-orders', async (req, res) => {
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
            price: price
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
app.get('/users', async (req, res) => {
  try {
    const list = await admin.auth().listUsers(1000);
    const users = list.users.map(u => {
      // Prefer top-level photoURL, then Google provider's photo
      const googleInfo = u.providerData.find(p => p.providerId === 'google.com');
      const photoURL = u.photoURL || googleInfo?.photoURL || null;
      return {
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        photoURL
      };
    });
    res.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to proxy user profile photos (handles Google rate limits)
app.get('/user-photo/:uid', async (req, res) => {
  try {
    const user = await admin.auth().getUser(req.params.uid);
    // Prefer top-level, then Google provider
    const googleInfo = user.providerData.find(p => p.providerId === 'google.com');
    const photoURL = user.photoURL || googleInfo?.photoURL;
    if (!photoURL) {
      return res.status(404).send('No photo');
    }
    // Stream image from Google
    https.get(photoURL, (imgRes) => {
      const contentType = imgRes.headers['content-type'] || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      imgRes.pipe(res);
    }).on('error', (err) => {
      console.error('Error proxying photo:', err);
      res.status(500).send('Image fetch error');
    });
  } catch (err) {
    console.error('Error fetching user for photo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to send purchase confirmation email
app.post('/send-purchase-email', async (req, res) => {
  try {
    const { sessionId, customerEmail, customerName } = req.body;
    console.log('Received email request:', { sessionId, customerEmail, customerName });

    // Validate required fields
    if (!sessionId || !customerEmail || !customerName) {
      console.error('Missing required fields:', { sessionId, customerEmail, customerName });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Stripe session:', session);
    
    if (!session || session.payment_status !== 'paid') {
      console.error('Invalid or unpaid session:', session);
      return res.status(400).json({ error: 'Invalid or unpaid session' });
    }

    // Get line items for the session
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    console.log('Line items:', lineItems.data);
    
    // Get the purchased eBook titles
    const purchasedEbooks = lineItems.data.map(item => ({
      title: item.description || item.price_data?.product_data?.name,
      id: item.price_data?.product_data?.metadata?.ebookId
    }));

    // Validate Resend configuration
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Validate frontend URL
    if (!process.env.FRONTEND_URL) {
      console.error('FRONTEND_URL is not configured');
      return res.status(500).json({ error: 'Frontend URL not configured' });
    }

    // Send email using Resend
    console.log('Sending email to:', customerEmail);
    const { data, error } = await resend.emails.send({
      from: 'Suporte Jornada de Insights <suporte@jornadadeinsights.com>',
      to: customerEmail,
      subject: 'Your eBook Purchase Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Thank You for Your Purchase, ${customerName}!</h1>
          <p style="color: #666; line-height: 1.6;">
            We're excited to confirm your recent purchase. You can now access your eBooks in your dashboard.
          </p>
          <div style="margin: 20px 0;">
            <h2 style="color: #333; margin-bottom: 10px;">Your Purchased eBooks:</h2>
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
              Access Your eBooks
            </a>
          </div>
          <p style="color: #666; line-height: 1.6;">
            If you have any questions or need assistance, please don't hesitate to contact us.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Best regards,<br>
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
    res.json({ success: true });
  } catch (error) {
    console.error('Error in send-purchase-email:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
});

// Top products endpoint
app.get('/api/top-products', async (req, res) => {
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