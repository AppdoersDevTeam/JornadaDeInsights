# Production Go / No-Go Checklist

This is the final launch checklist for `jornadadeinsights.com` after the implementation pass.

## Current Status

- Build: run `npm run build` before each release (expect chunk size notice for main bundle).
- Lint: `npm run lint` — target `0 errors` (warnings may include third-party hook deps).
- CI workflow: present (`.github/workflows/ci.yml`)
- Architecture: frontend (`src/`) + serverless (`api/`) + Supabase
- `/api/health`: returns `200` when service role, Stripe, Resend, and Supabase URL (via `SUPABASE_URL` or `VITE_SUPABASE_URL`) are set; `warnings` lists missing `STRIPE_WEBHOOK_SECRET` / `FRONTEND_URL` without failing the check.

## Hard No-Go Blockers (must be resolved before production launch)

1. **Missing Stripe webhook secret**
   - Env: `STRIPE_WEBHOOK_SECRET`
   - Impact: webhook fulfillment pipeline (`api/stripe-webhook.js`) fails; purchase lifecycle is incomplete.

2. **Missing explicit server Supabase URL**
   - Env: `SUPABASE_URL`
   - Impact: serverless routes rely on fallback behavior; auth/analytics/webhook risk in production.

3. **Pending secret rotation/verification**
   - `STRIPE_SECRET_KEY` (flagged)
   - `SUPABASE_SERVICE_ROLE_KEY` (flagged)
   - `RESEND_API_KEY` (flagged)
   - Impact: checkout, admin APIs, and email fulfillment can fail.

4. **New Supabase migrations must be applied**
   - `20260429000400_optimize_site_analytics_summary.sql`
   - `20260429000500_add_leads_and_lifecycle_events.sql`
   - Impact: analytics summary RPC and lead/lifecycle tracking endpoints will fail.

## Soft Go Items (recommended, not hard blockers)

- Configure monitoring DSNs:
  - `SENTRY_DSN` (API)
  - `VITE_SENTRY_DSN` (frontend)
- Remove dead Vercel env vars from old Firebase/Next patterns.
- Consider frontend chunk optimization (build warning shows large bundles).

## Verify After Env + Migrations (release validation)

1. **Checkout flow**
   - Add product to cart
   - Start checkout
   - Complete payment
   - Confirm success page loads and eBook appears in user dashboard

2. **Webhook + email fulfillment**
   - Confirm `checkout.session.completed` reaches `/api/stripe-webhook`
   - Confirm exactly one row per event in `stripe_webhook_events`
   - Confirm exactly one row per purchase in `purchase_email_events`
   - Confirm purchase email is delivered

3. **Donation flow**
   - Start single and recurring donation checkout
   - Confirm Stripe session generation works

4. **Admin flow**
   - Admin can load `stats`, `users`, `completed-orders`, `site-analytics-summary`
   - Non-admin receives `403` on protected endpoints

5. **Analytics + growth events**
   - Page tracking writes to `site_page_views`
   - Newsletter form creates/updates `lead_captures`
   - Funnel events appear in `lifecycle_events` (`checkout_started`, `purchase_completed`, `donation_started`, `lead_captured`)

## Launch Decision Rule

- **NO-GO** if any hard blocker above is unresolved.
- **GO** when all hard blockers are resolved and the post-config verification flows pass.
