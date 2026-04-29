# API Contracts (Frontend -> Vercel Serverless)

This document is the source of truth for runtime API usage in the Vite app.

## Architecture Contract

- Frontend calls Vercel functions under `api/`.
- Frontend base URL: `import.meta.env.VITE_SERVER_URL || window.location.origin`.
- No production route depends on the legacy Express app under `server/`.

## Route Map

- `src/pages/cart.tsx` and `src/components/UserDashboard.tsx`
  - `POST /api/create-checkout-session`
  - Body: `{ items: CartItem[], customerEmail?: string }`
  - Success: `{ sessionId: string }`
  - Errors: `{ error: string, details?: string }`

- `src/pages/donation.tsx`
  - `POST /api/create-donation-session`
  - Body: `{ amount: number, donorName?: string, donorEmail?: string }`
  - Success: `{ sessionId: string }`
  - Errors: `{ error: string, details?: string }`

- `src/pages/dashboard.tsx`
  - `GET /api/stats`
  - Headers: `Authorization: Bearer <supabase_access_token>`
  - Success: `{ today, week, month, completedOrders, users, salesTrends, balanceData, currency, timestamp }`
  - Errors: `{ error: string, details?: string }`

- `src/pages/dashboard.tsx`
  - `GET /api/top-products`
  - Success: `{ products: Array<{ name: string, sales: number, revenue: number }>, currency, timestamp }`
  - Fallback success on Stripe issues: `{ products: [] }`

- `src/pages/dashboard.tsx`
  - `GET /api/completed-orders`
  - Headers: `Authorization: Bearer <supabase_access_token>`
  - Success: `{ orders: CompletedOrder[] }`

- `src/pages/dashboard.tsx`
  - `GET /api/users`
  - Headers: `Authorization: Bearer <supabase_access_token>`
  - Success: `{ users: UserData[] }`

- `src/pages/dashboard.tsx`
  - `DELETE /api/users?uid=<user_id>`
  - Headers: `Authorization: Bearer <supabase_access_token>`
  - Success: `{ success: true, uid: string }`

- `src/components/UserDashboard.tsx`
  - `GET /api/my-orders`
  - Headers: `Authorization: Bearer <supabase_access_token>`
  - Success: `{ orders: CompletedOrder[] }`

- `src/App.tsx`
  - `POST /api/site-analytics-track` (or `sendBeacon`)
  - Body: `{ page, visitorId, country?, referrer?, userAgent? }`
  - Success: `201 { ok: true }` or `204` for filtered/ignored events

- `src/pages/dashboard.tsx`
  - `GET /api/site-analytics-summary?days=30`
  - Headers: `Authorization: Bearer <supabase_access_token>`
  - Success: `{ totalPageViews, uniqueVisitors, topPages, topCountries, dailyViews, windowDays }`

- `src/components/newsletter-form.tsx`
  - `POST /api/lead-capture`
  - Body: `{ email: string, consentMarketing: true, source?: string }`
  - Success: `201 { ok: true }`

- `src/lib/lifecycle.ts` (called from cart, donation, success, newsletter)
  - `POST /api/lifecycle-event-track`
  - Body: `{ eventName, visitorId?, sessionId?, pagePath?, metadata? }`
  - Success: `201 { ok: true }`

- `src/pages/dashboard.tsx`
  - `GET /api/lifecycle-funnel-summary?days=30`
  - Headers: `Authorization: Bearer <supabase_access_token>`
  - Success: `{ windowDays, totals: { visits, leads, checkoutStarted, purchaseCompleted }, conversionRates }`

- Cron/scheduled caller
  - `POST /api/lifecycle-followup-runner`
  - Headers: `x-cron-secret: <CRON_SECRET>`
  - Success: `{ ok: true, processed: number }`

- Ops/monitoring
  - `GET /api/health`
  - Success: `{ ok: true, timestamp, missingEnv: [] }`
  - Degraded: `503 { ok: false, timestamp, missingEnv: string[] }`

- Stripe webhook (server-to-server only)
  - `POST /api/stripe-webhook`
  - Success: `{ received: true }` or `{ received: true, duplicate: true }`

- Purchase email helper (internal/admin use)
  - `POST /api/send-purchase-email`
  - Success: `{ success: true }`

## Notes

- Admin-protected endpoints use bearer token verification and admin allowlist checks.
- Currency-sensitive analytics endpoints now return a `currency` field for UI consistency.
