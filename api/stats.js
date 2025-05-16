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
  console.log('Stats API request:', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers
  });

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

    // Generate sales trends data
    const salesTrends = {
      daily: [],
      weekly: [],
      monthly: []
    };

    // Generate balance data
    const balanceData = [];

    // Get balance transactions for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const balanceTransactions = await stripe.balanceTransactions.list({
      created: {
        gte: Math.floor(thirtyDaysAgo.getTime() / 1000)
      },
      limit: 100
    });

    // Group transactions by day
    const transactionsByDay = {};
    balanceTransactions.data.forEach(txn => {
      const date = new Date(txn.created * 1000);
      const day = date.toISOString().split('T')[0];
      
      if (!transactionsByDay[day]) {
        transactionsByDay[day] = {
          day,
          current_balance: 0,
          payouts: 0,
          net_transactions: 0,
          payments: 0,
          refunds: 0,
          transfers: 0,
          chargeback_withdrawals: 0,
          chargeback_reversals: 0,
          other_adjustments: 0,
          other_transactions: 0
        };
      }

      const amount = txn.amount / 100;
      const net = txn.net / 100;

      // Categorize transaction types
      if (txn.type === 'payout') {
        transactionsByDay[day].payouts += net;
      } else if (txn.type === 'transfer') {
        transactionsByDay[day].transfers += net;
      } else if (['charge', 'payment'].includes(txn.type)) {
        transactionsByDay[day].payments += net;
      } else if (['payment_refund', 'refund', 'payment_failure_refund'].includes(txn.type)) {
        transactionsByDay[day].refunds += net;
      } else if (txn.type === 'adjustment') {
        if (txn.description?.toLowerCase().includes('chargeback withdrawal')) {
          transactionsByDay[day].chargeback_withdrawals += net;
        } else if (txn.description?.toLowerCase().includes('chargeback reversal')) {
          transactionsByDay[day].chargeback_reversals += net;
        } else {
          transactionsByDay[day].other_adjustments += net;
        }
      } else {
        transactionsByDay[day].other_transactions += net;
      }

      // Calculate net transactions (excluding payouts)
      if (txn.type !== 'payout') {
        transactionsByDay[day].net_transactions += net;
      }
    });

    // Calculate running balance and sort by date
    let runningBalance = 0;
    Object.values(transactionsByDay)
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .forEach(dayData => {
        runningBalance += dayData.net_transactions;
        dayData.current_balance = runningBalance;
        balanceData.push(dayData);
      });

    // Daily data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      // Get all balance transactions for the day
      const dayTransactions = await stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startOfDate.getTime() / 1000),
          lt: Math.floor(endOfDate.getTime() / 1000)
        },
        limit: 100
      });

      // Calculate sales from balance transactions
      const sales = dayTransactions.data
        .filter(txn => ['payment', 'charge'].includes(txn.type))
        .reduce((sum, txn) => sum + (txn.amount / 100), 0);

      // Format date as dd/mm
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

      salesTrends.daily.push({
        date: formattedDate,
        sales: Number(sales.toFixed(2))
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
        .filter(txn => ['payment', 'charge'].includes(txn.type))
        .reduce((sum, txn) => sum + (txn.amount / 100), 0);

      salesTrends.weekly.push({
        date: `Week ${4-i}`,
        sales: Number(sales.toFixed(2))
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
        .filter(txn => ['payment', 'charge'].includes(txn.type))
        .reduce((sum, txn) => sum + (txn.amount / 100), 0);

      salesTrends.monthly.push({
        date: `${endDate.getMonth() + 1}`.padStart(2, '0'),
        sales: Number(sales.toFixed(2))
      });
    }

    // Return analytics including user stats, sales trends, and balance data
    res.json({
      today: todayCount,
      week: weekCount,
      month: monthCount,
      completedOrders: completedOrdersEver,
      users: { total: totalUsers, newThisWeek },
      salesTrends,
      balanceData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    console.error('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set'
    });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
} 