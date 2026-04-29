# Agent & development playbook — Jornada de Insights

This document defines how AI agents (and humans) should collaborate on this repository: roles, boundaries, handoffs, and a repeatable delivery loop. Read it at the start of a task; use it to decide **who does what** before writing code.

## Project snapshot

| Area | Stack / location |
|------|------------------|
| App shell | Vite, React 18, TypeScript, React Router |
| UI | Tailwind CSS, Radix UI, Framer Motion, shadcn-style `src/components/ui` |
| i18n | i18next / react-i18next |
| Auth | Supabase Auth (`src/context/auth-context.tsx`, `src/lib/supabase.ts`) |
| Data | Supabase client (`src/lib/supabase.ts`) |
| Payments | Stripe (`@stripe/stripe-js`, server usage in `server/`) |
| Server | Express app under `server/` (see `server/README.md`) |
| Analytics | Vercel Analytics |

Agents should **not** assume Next.js App Router patterns for the main app: the primary UI is Vite + React. Dependencies list Next.js for possible tooling or future use—confirm in code before applying Next-only advice.

---

## Operating model: one loop, clear phases

Every non-trivial change should move through these phases. One conversation can cover several phases, but **do not skip planning** when tradeoffs or multiple files are involved.

1. **Intake** — Restate the goal, success criteria, and out-of-scope items.
2. **Discover** — Locate existing patterns; prefer extending them over new abstractions.
3. **Design (light)** — Data flow, affected surfaces (UI, API, env), and rollback story.
4. **Implement** — Minimal diff; match file layout and naming in the repo.
5. **Verify** — `npm run lint`, run the app for the touched flows, sanity-check auth/payment paths if relevant.
6. **Handoff** — Short summary of what changed, what to test manually, and any env or deploy notes.

---

## Agent roster (full dev team)

Treat each role as a **hat** with a mandate and explicit **non-goals**. If a single agent session wears multiple hats, finish one mandate before switching.

### 1. Product / planner

- **Mandate:** Problem statement, acceptance criteria, edge cases, and “done means X”.
- **Outputs:** Bullet scope, risks, and a task breakdown when work spans more than two files or domains (e.g. Stripe + UI).
- **Non-goals:** Implementation details unless needed to bound scope.
- **When to lead:** New features, ambiguous bugs, refactors touching UX or contracts.
- **Cursor:** Prefer **Plan mode** for multi-path decisions; exit with a written plan the implementer can follow.

### 2. Architect (repository)

- **Mandate:** Where code lives, boundaries between `src/`, `server/`, and external services; avoid duplicate sources of truth.
- **Outputs:** Short note on which layers change (component, context, lib, API route, server handler).
- **Non-goals:** Pixel-level UI polish (delegate to frontend).
- **When to lead:** Cross-cutting changes, new integrations, security-sensitive flows.

### 3. Frontend engineer

- **Mandate:** React components, routing, state, Tailwind/Radix usage, accessibility, and i18n keys.
- **Outputs:** TSX/CSS changes that follow existing component patterns under `src/components` and `src/pages`.
- **Non-goals:** Changing Supabase schema or Stripe secrets without coordination; server-only logic belongs in `server/` or dedicated API helpers.
- **When to lead:** Layout, dashboards, forms, client-side behavior.

### 4. Backend / API engineer

- **Mandate:** `server/` Express routes, webhooks, server-side Stripe/Supabase/Resend usage, CORS, input validation.
- **Outputs:** Testable handlers, clear error shapes, env vars documented in handoff.
- **Non-goals:** Replacing client auth flows in the browser without frontend alignment.
- **When to lead:** New endpoints, payment verification, email triggers, admin operations.

### 5. Data & integrations

- **Mandate:** Supabase queries, auth touchpoints, consistency between client and server assumptions.
- **Outputs:** Typed helpers, migrations or Supabase notes if schema changes (coordinate with human owner of DB).
- **Non-goals:** Cosmetic UI.
- **When to lead:** Bugs involving “wrong/missing data”, RLS or policy questions (flag for human review if policies are unclear).

### 6. QA / verification

- **Mandate:** Reproduce steps, edge cases, regression checklist for affected routes (shop, donation, dashboard, auth).
- **Outputs:** Pass/fail vs acceptance criteria; console/network notes if something fails.
- **Non-goals:** Product prioritization.
- **When to lead:** After implementation; required before calling a feature “done”.
- **Tools:** Run `npm run lint`; exercise critical paths in browser; use automated browser tools when available for smoke checks.

### 7. DevOps / release

- **Mandate:** Vercel (or host) config, env vars, build commands, deployment order (e.g. server vs static app).
- **Outputs:** List of env keys to set/rotate, any `vercel.json` or build script changes.
- **Non-goals:** Feature logic unless release is blocked by config.
- **When to lead:** First-time deploy, preview vs production, incident recovery.

### 8. Security & privacy

- **Mandate:** Secrets only in env, never in repo; least privilege for keys; PII handling; webhook signature verification.
- **Outputs:** Short security note for risky PRs (auth, payments, uploads).
- **Non-goals:** General feature development.
- **When to lead:** Any change touching credentials, cookies, tokens, or user data export.

---

## Handoff checklist

When passing work between roles or chat sessions, include:

- **Goal** (one sentence) and **acceptance criteria**
- **Affected areas** (`src/...`, `server/...`, env vars)
- **Contracts** (API shapes, event names, Stripe/Supabase behaviors)
- **How to verify** (commands + 2–3 manual steps)
- **Open risks** (e.g. “RLS not verified”, “needs production webhook URL”)

---

## Delegation hints (Cursor subagents)

Use specialized subagents when they reduce risk or time:

- **Explore:** Map the codebase, find all call sites, trace a bug across files (read-only).
- **Shell:** Git operations, installs, scripted checks.
- **Deployment / Vercel / performance:** Production behavior, CI/CD, Core Web Vitals—when the question is platform-level.
- **General purpose:** Multi-step implementation when discovery is already done.

Do **not** spawn parallel implementers on the **same files** without coordination; use one owner per mergeable unit of work.

---

## Definition of done

A change is ready to merge when:

- Scope matches agreed acceptance criteria.
- Lint passes (`npm run lint`).
- User-visible flows touched by the change have a **manual smoke path** documented in the PR or handoff.
- Secrets and env vars are documented; no credentials in source.
- i18n: new user-facing strings have keys (or intentional follow-up is filed).

---

## Escalation

Stop and ask the human owner when:

- Supabase RLS/policies or schema changes are required but not specified.
- Stripe products/prices or tax behavior need business decisions.
- Supabase project or Vercel project ownership is unclear.

---

*Last aligned with repo layout: Vite React app under `src/`, Express under `server/`. Update this file if the architecture materially changes.*
