# Environment Variable Matrix

All variables required to run Jornada de Insights in production.

## Status key

- ✅ Confirmed set in Vercel
- ❌ **MISSING — app will break without this**
- ⚠️ Set but flagged "Needs Attention" — value needs updating
- 💡 Optional with safe fallback

---

## Serverless API functions (`api/*.js`) — server-side only, no VITE_ prefix

| Variable | Status | Used by | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | ⚠️ Needs Attention | All checkout, donation, stats, orders, webhook | Value exists in Vercel but is flagged. Rotate and verify live key |
| `STRIPE_WEBHOOK_SECRET` | ❌ **MISSING** | `api/stripe-webhook.js` | Create webhook in Stripe Dashboard → Webhooks, copy Signing secret. Point to `https://jornadadeinsights.com/api/stripe-webhook`. Subscribe to `checkout.session.completed` |
| `SUPABASE_URL` | ❌ **MISSING** | All admin API functions, analytics, webhook | Code reads `SUPABASE_URL` first and only falls back to `VITE_SUPABASE_URL`. Add server-safe value explicitly |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Needs Attention | Admin auth, user management, analytics, webhook | Present but flagged. Rotate and re-save this secret |
| `FRONTEND_URL` | ✅ Set | Stripe success/cancel redirect, purchase email links | Should be `https://jornadadeinsights.com` (no trailing slash) |
| `RESEND_API_KEY` | ⚠️ Needs Attention | Purchase email, donation email | Regenerate in Resend dashboard → API Keys |
| `ALLOWED_ADMIN_EMAILS` | 💡 Optional | Admin auth middleware fallback | Comma-separated. Falls back to `devteam@appdoers.co.nz,ptasbr2020@gmail.com`. Set to override |
| `ALLOWED_ORIGINS` | 💡 Optional | CORS in analytics endpoints | Falls back to `https://jornadadeinsights.com`. Set to override |
| `SENTRY_DSN` | 💡 Optional | API runtime monitoring (`api/_lib/monitoring.js`) | Add DSN to capture serverless exceptions in production |
| `CRON_SECRET` | ❌ **MISSING** | `api/lifecycle-followup-runner.js` | Shared secret required by scheduled job caller. Send as `x-cron-secret` header |

---

## Frontend browser bundle (`src/**`) — must be prefixed `VITE_`

| Variable | Status | Used by | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ⚠️ Verify in Vercel UI | `src/lib/supabase.ts` | Required by frontend Supabase client |
| `VITE_SUPABASE_ANON_KEY` | ⚠️ Verify in Vercel UI | `src/lib/supabase.ts` | Required by frontend Supabase client |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ Set | Cart checkout, donation checkout, user dashboard checkout | Keep in all environments |
| `VITE_YOUTUBE_API_KEY` | ✅ Set | Home page videos, Podcast page | — |
| `VITE_YOUTUBE_CHANNEL_ID` | ✅ Set | Home page videos, Podcast page | — |
| `VITE_SERVER_URL` | 💡 Optional | API base URL in frontend | Leave empty in production — the fallback `window.location.origin` is correct since API and frontend share the same Vercel domain. Only needed for a separate server origin |
| `VITE_SENTRY_DSN` | 💡 Optional | Frontend runtime monitoring (`src/lib/monitoring.ts`) | Add DSN to capture browser errors in production |

---

## Priority order to add

These are highest priority before production sign-off:

1. Add `STRIPE_WEBHOOK_SECRET` — idempotent email fulfillment won't work without it
2. Add `SUPABASE_URL` — avoids server fallback onto a `VITE_` variable and stabilizes API auth/analytics
3. Fix `STRIPE_SECRET_KEY` (Needs Attention) — checkout can fail with invalid/expired key
4. Fix `SUPABASE_SERVICE_ROLE_KEY` (Needs Attention) — admin endpoints can fail
5. Fix `RESEND_API_KEY` (Needs Attention) — purchase confirmation emails can fail
6. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are still present in Vercel

---

## Can be removed from Vercel

These are no longer required by the current codebase (Supabase auth is active, Firebase auth is not used):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `NEXT_PUBLIC_API_URL`

Repo cleanup applied:
- Legacy `src/lib/firebase.ts` has been removed.

---

## Where to find each value

### Stripe
- Dashboard: https://dashboard.stripe.com/test/apikeys (use live keys for production)
- Webhook: https://dashboard.stripe.com/test/webhooks → Add endpoint → URL: `https://jornadadeinsights.com/api/stripe-webhook` → Events: `checkout.session.completed`

### Supabase
- Dashboard: https://supabase.com/dashboard → your project → Settings → API
- `SUPABASE_URL` / `VITE_SUPABASE_URL` → Project URL
- `VITE_SUPABASE_ANON_KEY` → `anon public` key
- `SUPABASE_SERVICE_ROLE_KEY` → `service_role` key (secret — server only)

### Resend
- Dashboard: https://resend.com/api-keys → Create new key or regenerate existing

### YouTube
- Google Cloud Console: https://console.cloud.google.com → APIs → YouTube Data API v3 → Credentials

---

## Notes

- `VITE_` variables are embedded at **build time** by Vite. Changes to them require a new Vercel deployment.
- Non-`VITE_` variables are read at **request time** by serverless functions. Changes take effect on the next function invocation (no redeploy needed in most cases).
- Never add `SUPABASE_SERVICE_ROLE_KEY` with a `VITE_` prefix — it would be exposed to the browser and would bypass all Row Level Security.
- `NEXT_PUBLIC_API_URL` can be removed after cleanup; this is a Next.js-style variable and the app is Vite-based.
