# Production Readiness Tickets (Serverless: Vercel + Supabase)

This backlog is written for execution by Cursor agents.

Architecture target:
- Frontend: Vite React app in `src/`
- Backend: Vercel serverless functions in `api/` only
- Data/Auth/Storage: Supabase only
- Deployment: Vercel only

---

## Epic 0 - Serverless Architecture Cleanup

### TKT-001 - Remove non-serverless backend path (`server/`) from active architecture
**Priority:** P0  
**Type:** Refactor  
**Owner role:** Architect + Backend  
**Depends on:** none

**Scope**
- Confirm all production endpoints used by frontend exist in `api/`.
- Mark `server/` as deprecated and remove runtime coupling from frontend.
- Ensure no frontend code points to `http://localhost:3000` fallback for production behavior.

**Tasks**
- Audit frontend fetch calls and map to `api/*`.
- Remove/replace references to `server/` in docs or code paths.
- Keep `server/` folder only if needed for historical reference; otherwise remove in a follow-up PR.

**Acceptance criteria**
- Production app works using only `api/*.js`.
- No functional endpoint requires `server/index.js`.

**Agent brief**
- "Refactor app to use only Vercel serverless APIs under `api/`, removing `server/` runtime dependency."

---

### TKT-002 - Standardize API routing and contract map
**Priority:** P0  
**Type:** Tech debt  
**Owner role:** Backend  
**Depends on:** TKT-001

**Scope**
- Produce a single source of truth mapping: frontend call -> API route -> response shape.
- Resolve route name inconsistencies.

**Tasks**
- Document routes currently used: checkout, donation, users, stats, completed-orders, analytics track/summary, email.
- Add `docs/api-contracts.md`.
- Normalize any endpoint naming mismatch.

**Acceptance criteria**
- Every frontend API call maps to an existing serverless function.
- Contract doc exists and matches implementation.

---

## Epic 1 - Security + Access Control

### TKT-003 - Add admin auth middleware utility for serverless functions
**Priority:** P0  
**Type:** Security  
**Owner role:** Backend/Security  
**Depends on:** TKT-001

**Scope**
- Create shared utility to verify Supabase bearer token and admin authorization.
- Remove duplicated hardcoded auth checks.

**Tasks**
- Add `api/_lib/auth.js` with:
  - token extraction
  - `supabase.auth.getUser(token)` verification
  - admin check via allowlist env var (temporary) or role metadata
- Apply to protected endpoints.

**Acceptance criteria**
- Protected endpoints return:
  - `401` for missing/invalid token
  - `403` for non-admin
  - `200` only for admin

---

### TKT-004 - Protect sensitive endpoints (`users`, `stats`, `completed-orders`, analytics summary)
**Priority:** P0  
**Type:** Security  
**Owner role:** Backend  
**Depends on:** TKT-003

**Scope**
- Enforce admin auth on:
  - `api/users.js`
  - `api/stats.js`
  - `api/completed-orders.js`
  - `api/site-analytics-summary.js`

**Tasks**
- Integrate auth middleware.
- Remove permissive behavior.
- Add consistent error responses.

**Acceptance criteria**
- Non-admin cannot access these endpoints.
- Dashboard works for admin users only.

---

### TKT-005 - Add missing user delete endpoint used by dashboard
**Priority:** P0  
**Type:** Bug fix  
**Owner role:** Backend  
**Depends on:** TKT-003

**Scope**
- Implement route used by dashboard: `DELETE /api/users/:uid`.

**Tasks**
- Add `api/users/[uid].js` or route-compatible equivalent per current Vercel setup.
- Admin-only access.
- Use Supabase admin API to delete user.
- Return stable JSON response.

**Acceptance criteria**
- Dashboard delete action succeeds for admins.
- Non-admin and invalid token are rejected.

---

### TKT-006 - Restrict CORS and centralize allowed origins
**Priority:** P1  
**Type:** Security  
**Owner role:** Backend/DevOps  
**Depends on:** TKT-001

**Scope**
- Centralize CORS config logic shared by all API functions.
- Use env-driven allowed origins for prod/staging/local.

**Tasks**
- Add `api/_lib/cors.js`.
- Apply to all endpoints.
- Remove duplicated per-file CORS blocks.

**Acceptance criteria**
- All functions return consistent CORS headers.
- Local + production origins both function as expected.

---

## Epic 2 - Revenue-Critical Checkout Reliability

### TKT-007 - Move fulfillment to Stripe webhook (source of truth)
**Priority:** P0  
**Type:** Reliability  
**Owner role:** Backend  
**Depends on:** TKT-001

**Scope**
- Implement `api/stripe-webhook.js` for payment success events.
- Purchase confirmation email and order fulfillment should be webhook-driven, not client-page-driven.

**Tasks**
- Verify Stripe signature.
- Handle `checkout.session.completed` (+ relevant events).
- Idempotent persistence of processed events in Supabase table.
- Trigger email send from webhook path.

**Acceptance criteria**
- Refreshing success page does not duplicate fulfillment actions.
- Completed payment always triggers one fulfillment pipeline.

---

### TKT-008 - Add idempotency and retry safety for email sending
**Priority:** P0  
**Type:** Reliability  
**Owner role:** Backend  
**Depends on:** TKT-007

**Scope**
- Prevent duplicate purchase emails.
- Handle retry without double send.

**Tasks**
- Add `email_events` or `purchase_events` table in Supabase.
- Use unique key on Stripe session/event id.
- Update `api/send-purchase-email.js` or webhook flow to check previous send state.

**Acceptance criteria**
- Duplicate requests for same session do not send extra emails.

---

### TKT-009 - Normalize money/currency logic in analytics and top-products
**Priority:** P1  
**Type:** Bug fix  
**Owner role:** Backend  
**Depends on:** TKT-004

**Scope**
- Remove inconsistent currency assumptions (USD vs BRL).
- Ensure dashboard reports align with Stripe account currency/charges.

**Tasks**
- Review `api/stats.js` and `api/top-products.js`.
- Normalize calculations and labels.
- Document assumptions in code comments.

**Acceptance criteria**
- Dashboard metrics are consistent with Stripe dashboard values.

---

## Epic 3 - Frontend Flow Fixes

### TKT-010 - Fix duplicate `CartProvider` nesting and cart state behavior
**Priority:** P0  
**Type:** Bug fix  
**Owner role:** Frontend  
**Depends on:** none

**Scope**
- Remove duplicate provider wrapping between `src/main.tsx` and `src/App.tsx`.

**Tasks**
- Keep one `CartProvider` at the proper app root.
- Validate cart add/remove/checkout across routes.

**Acceptance criteria**
- Cart state remains consistent across navigation and auth redirects.

---

### TKT-011 - Implement forgot/reset password flow
**Priority:** P0  
**Type:** Feature gap  
**Owner role:** Frontend  
**Depends on:** none

**Scope**
- `SignIn` links to `/forgot-password`, but route/page is missing.

**Tasks**
- Add forgot-password page + route.
- Add reset password confirmation/update flow with Supabase auth.
- Show success/error toasts and localized copy.

**Acceptance criteria**
- User can request reset email and update password successfully.

---

### TKT-012 - Fix sign-out behavior in user dashboard
**Priority:** P0  
**Type:** Bug fix  
**Owner role:** Frontend  
**Depends on:** none

**Scope**
- `handleSignOut` currently navigates without signing out.

**Tasks**
- Call `supabase.auth.signOut()` before redirect.
- Handle failures gracefully.

**Acceptance criteria**
- Session/token is cleared and protected pages require login again.

---

### TKT-013 - Standardize env usage for Vite (`import.meta.env` only)
**Priority:** P0  
**Type:** Bug fix  
**Owner role:** Frontend  
**Depends on:** TKT-001

**Scope**
- Remove `process.env.NEXT_PUBLIC_*` patterns from frontend app code.

**Tasks**
- Replace with `import.meta.env.VITE_*`.
- Ensure API base URL strategy is explicit and documented.

**Acceptance criteria**
- No frontend runtime depends on `process.env` for client variables.

---

## Epic 4 - Code Quality Gate

### TKT-014 - Lint debt burn-down to zero errors
**Priority:** P0  
**Type:** Quality  
**Owner role:** Frontend  
**Depends on:** none

**Scope**
- Resolve current ESLint failures (`npm run lint`).

**Tasks**
- Split fixes into small PRs by area:
  - `src/components/*`
  - `src/pages/*`
  - `src/lib/*`
- Remove unused imports/vars.
- Replace unsafe `any` with typed interfaces.
- Address hook dependency warnings where safe.

**Acceptance criteria**
- `npm run lint` passes with 0 errors.

---

### TKT-015 - Add CI workflow for lint + build
**Priority:** P0  
**Type:** DevOps  
**Owner role:** DevOps  
**Depends on:** TKT-014

**Scope**
- Add GitHub Actions workflow.

**Tasks**
- Create `.github/workflows/ci.yml`:
  - install
  - lint
  - build
- Fail PR on lint/build failure.

**Acceptance criteria**
- CI runs on PRs and blocks broken merges.

---

## Epic 5 - SEO + Discoverability

### TKT-016 - Add core SEO assets (`public/robots.txt`, sitemap, favicon/manifest hygiene)
**Priority:** P1  
**Type:** SEO  
**Owner role:** Frontend  
**Depends on:** none

**Scope**
- Add missing SEO static assets in `public/`.

**Tasks**
- Add `public/robots.txt`.
- Add generated or static `public/sitemap.xml` (or script-based generation).
- Ensure favicon path points to public asset, not `/src/...`.

**Acceptance criteria**
- Robots and sitemap are accessible in deployed app.

---

### TKT-017 - Per-route metadata system (title/description/canonical/OG)
**Priority:** P1  
**Type:** SEO  
**Owner role:** Frontend  
**Depends on:** TKT-016

**Scope**
- Current metadata is mostly static in `index.html`.

**Tasks**
- Add metadata helper/hook per route.
- Set canonical + Open Graph + Twitter tags for key pages:
  - home, about, podcast, shop, ebook detail, curiosidades, curiosidade detail

**Acceptance criteria**
- Major routes render unique metadata.

---

### TKT-018 - Structured data implementation (`Product`, `Article`, `Organization`)
**Priority:** P1  
**Type:** SEO  
**Owner role:** Frontend  
**Depends on:** TKT-017

**Scope**
- Implement JSON-LD for rich results.

**Tasks**
- `Product` schema on ebook detail pages.
- `Article` schema on curiosidade detail pages.
- `Organization` + `WebSite` on home/root.

**Acceptance criteria**
- Pages pass Rich Results Test for applicable schema.

---

## Epic 6 - Analytics and Data Integrity

### TKT-019 - Harden analytics tracking payload + abuse controls
**Priority:** P1  
**Type:** Security/Quality  
**Owner role:** Backend  
**Depends on:** none

**Scope**
- Build on current analytics table hardening with additional controls.

**Tasks**
- Validate payload length and shape strictly.
- Improve bot filtering.
- Add per-visitor/session dedupe strategy (optional threshold).

**Acceptance criteria**
- Analytics table quality improves (reduced bot/noise events).

---

### TKT-020 - Analytics dashboard quality and query performance
**Priority:** P2  
**Type:** Data  
**Owner role:** Backend + Frontend  
**Depends on:** TKT-019

**Scope**
- Ensure dashboard analytics can scale past small datasets.

**Tasks**
- Add efficient queries/indexes for summary endpoint.
- Add pagination or windowing if needed.
- Validate response times with realistic row counts.

**Acceptance criteria**
- `site-analytics-summary` remains performant at production data volume.

---

## Epic 7 - Observability and Operations

### TKT-021 - Introduce structured API logging and remove sensitive logs
**Priority:** P1  
**Type:** Security/Ops  
**Owner role:** Backend  
**Depends on:** none

**Scope**
- Replace ad-hoc `console.log` dumps containing user/request data.

**Tasks**
- Add log utility with level control by env.
- Remove logs of full headers/body containing PII/secrets.

**Acceptance criteria**
- Production logs are useful and privacy-safe.

---

### TKT-022 - Add runtime error monitoring and alerting
**Priority:** P1  
**Type:** Ops  
**Owner role:** DevOps  
**Depends on:** TKT-021

**Scope**
- Add monitoring provider (Sentry or equivalent) for frontend + serverless.

**Tasks**
- Install SDKs.
- Capture unhandled exceptions in app + API routes.
- Add release/environment tags.

**Acceptance criteria**
- New runtime exceptions show up in monitoring dashboard.

---

### TKT-023 - Production env matrix + secrets checklist
**Priority:** P0  
**Type:** DevOps/Security  
**Owner role:** DevOps  
**Depends on:** none

**Scope**
- Define and verify required env vars across local/preview/prod.

**Tasks**
- Add `docs/env-matrix.md` with variable, owner, scope, required environments.
- Validate all required vars are set in Vercel and Supabase.
- Remove dead env vars.

**Acceptance criteria**
- No endpoint relies on undocumented env vars.

---

## Epic 8 - Product/Conversion Improvements (Post-stability)

### TKT-024 - Improve product page trust and conversion blocks
**Priority:** P2  
**Type:** Product/UX  
**Owner role:** Frontend/Product  
**Depends on:** TKT-007, TKT-017

**Scope**
- Add trust and conversion elements based on current creator/ecommerce norms.

**Tasks**
- Add FAQ, guarantee/refund clarity, delivery info, secure checkout messaging.
- Improve CTA hierarchy on `shop` and ebook detail pages.

**Acceptance criteria**
- Improved click-through from product view to checkout start.

---

### TKT-025 - Add post-purchase and lead-capture lifecycle hooks
**Priority:** P2  
**Type:** Product/Growth  
**Owner role:** Backend + Frontend  
**Depends on:** TKT-008

**Scope**
- Basic retention lifecycle.

**Tasks**
- Add lead capture component with explicit consent.
- Add post-purchase follow-up sequence trigger points.
- Track funnel events for conversion analytics.

**Acceptance criteria**
- Email capture and post-purchase flow are live and measurable.

---

## Suggested Execution Order (Sprint Plan)

### Sprint 1 (P0 only)
- TKT-001, TKT-003, TKT-004, TKT-005, TKT-010, TKT-011, TKT-012, TKT-013, TKT-014, TKT-023

### Sprint 2
- TKT-002, TKT-006, TKT-007, TKT-008, TKT-015, TKT-016, TKT-017

### Sprint 3
- TKT-018, TKT-019, TKT-020, TKT-021, TKT-022

### Sprint 4 (Growth)
- TKT-009, TKT-024, TKT-025

---

## "Ready" definition for any ticket

A ticket is ready for a Cursor agent when it has:
- clear file targets
- explicit acceptance criteria
- dependency list
- test/verification steps

If missing, update the ticket first before implementation.

