const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createCheckoutSession } = require('./src/api/create-checkout-session');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const result = await createCheckoutSession(req);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 