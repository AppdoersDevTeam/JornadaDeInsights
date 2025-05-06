import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://jornadadeinsights.com');
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

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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

    // Fetch charges for each period
    const [dailyCharges, weeklyCharges, monthlyCharges] = await Promise.all([
      stripe.charges.list({ created: { gte: dayStart }, limit: 100 }),
      stripe.charges.list({ created: { gte: weekStart }, limit: 100 }),
      stripe.charges.list({ created: { gte: monthStart }, limit: 100 }),
    ]);

    // Count only succeeded charges
    const todayCount = dailyCharges.data.filter(ch => ch.status === 'succeeded').length;
    const weekCount = weeklyCharges.data.filter(ch => ch.status === 'succeeded').length;
    const monthCount = monthlyCharges.data.filter(ch => ch.status === 'succeeded').length;

    // Fetch total completed orders ever
    const allChargesEver = await stripe.charges.list({ limit: 100 });
    const completedOrdersEver = allChargesEver.data.filter(ch => ch.status === 'succeeded').length;

    // Fetch Firebase Auth users for total and new signups in last week
    const allUsers = await admin.auth().listUsers(1000);
    const totalUsers = allUsers.users.length;
    const newThisWeek = allUsers.users.filter(user => {
      const createdSec = Math.floor(new Date(user.metadata.creationTime).getTime() / 1000);
      return createdSec >= weekStart;
    }).length;

    // Return analytics including user stats
    res.json({
      today: todayCount,
      week: weekCount,
      month: monthCount,
      completedOrders: completedOrdersEver,
      users: { total: totalUsers, newThisWeek },
      thresholds: { dayStart, weekStart, monthStart }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 