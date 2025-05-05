# Stripe Checkout Server

A clean, production-ready Express.js server for handling Stripe Checkout integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Update the `.env` file with your actual values:
- `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_test_` for test mode)
- `FRONTEND_URL`: Your frontend application URL
- `PORT`: Server port (default: 3000)

## Development

Run the server in development mode:
```bash
npm run dev
```

## Production

Run the server in production mode:
```bash
npm start
```

## API Endpoints

### POST /create-checkout-session
Creates a Stripe Checkout session.

Request body:
```json
{
  "items": [
    {
      "name": "Product Name",
      "price": 1000, // in cents
      "quantity": 1
    }
  ]
}
```

Response:
```json
{
  "sessionId": "cs_test_..."
}
```

### GET /health
Health check endpoint.

Response:
```json
{
  "status": "ok"
}
```

## Error Handling

The server returns appropriate status codes:
- 400: Bad Request (invalid input)
- 500: Server Error

## Security

- CORS is configured to only accept requests from the specified frontend URL
- All sensitive data is stored in environment variables
- Input validation is performed on all requests 