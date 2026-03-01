# InstantSettlement.ai — Enterprise SaaS FinTech Platform

## Project Overview

An institutional-grade Enterprise SaaS FinTech platform targeting a $50,000+ enterprise valuation, built for Tier-1 Banks, Hedge Funds, and Central Banks. Features production-grade security (AES-256-GCM), AI Fraud Engine with automatic Frozen status, Developer REST API with Webhooks, Institutional Reporting Hub, and Multi-currency support.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (port 5000, same as backend via Vite middleware)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Encryption**: AES-256-GCM (Node.js crypto module)
- **Rate Limiting**: express-rate-limit
- **Payments**: Stripe (via Replit Connector + stripe-replit-sync)
- **Email**: Resend (via Replit Connector)
- **Charts**: Recharts
- **UI**: Shadcn/UI + Tailwind CSS + Framer Motion

## Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home.tsx | Hero, trust bar, bento grid, Trust & Security section |
| `/dashboard` | Dashboard.tsx | Real-time settlement feed with AI risk badges |
| `/pricing` | Pricing.tsx | Stripe checkout plans (Essential, Professional) |
| `/request-demo` | RequestDemo.tsx | Lead capture form |
| `/login` | Login.tsx | Email 2FA with brute-force protection (5-attempt lockout) |
| `/compliance` | Compliance.tsx | KYC Compliance Center (AES-256 encrypted submissions) |
| `/developer` | DeveloperHub.tsx | API Keys, Webhooks, API Reference, FX Rates |
| `/admin` | AdminDashboard.tsx | 8 tabs: Users, KYC, Risk, Alerts, Audit, Invoices, Fraud Queue, Reports |
| `/audit-log` | AuditLog.tsx | Public compliance audit log |
| `/checkout/success` | CheckoutSuccess.tsx | Post-payment confirmation + invoice email |

## Security Infrastructure

### AES-256-GCM Encryption (server/crypto.ts)
- KYC sensitive fields encrypted before DB storage: `fullName`, `dateOfBirth`, `documentNumber`
- Key: SESSION_SECRET → SHA-256 → 32-byte AES key
- Format: `iv:authTag:ciphertext` stored in DB

### Rate Limiting (server/routes.ts)
- General API: 100 req / 15 min
- Auth endpoints: 10 req / 15 min (brute-force protection)
- POST /api/v1/transactions: 30 req / min
- Account lockout: 5 failed 2FA → 15-minute lock (users.login_attempts, users.locked_until)

## AI Fraud Engine (server/riskEngine.ts)

5-dimension scoring: Amount (0-40pts), Jurisdiction (0-25pts), Counterparty (0-20pts), Latency (0-10pts), Velocity (0-5pts)

**Freeze threshold**: High risk AND amount ≥ $1,000,000 → status = 'Frozen' + frozenReason set

## Developer API (server/routes.ts)

- `GET /api/v1/transactions` — requires Bearer token, returns 50 most recent
- `POST /api/v1/transactions` — requires Bearer token, auto-risk assessed
- `GET /api/v1/rates` — requires Bearer token, returns FX rates
- `GET /api/developer/keys?email=...` — list keys (prefix only, no hash)
- `POST /api/developer/keys` — create key, returns rawKey ONCE
- `DELETE /api/developer/keys/:id` — revoke
- `GET /api/developer/webhooks` — list webhooks
- `POST /api/developer/webhooks` — create (HTTPS only), returns signingSecret ONCE
- `DELETE /api/developer/webhooks/:id` — delete

## Webhook Service (server/webhookService.ts)

- Fires on settlement.completed, transaction.frozen
- HMAC-SHA256 signed: `sha256=<hex>` in X-InstantSettlement-Signature header
- 10-second timeout per delivery
- Logs delivery outcomes to webhook_deliveries table

## Reporting Endpoints (server/routes.ts)

- `GET /api/admin/reports/audit-log/csv` — audit log as CSV
- `GET /api/admin/reports/audit-log/pdf` — compliance HTML report
- `GET /api/admin/reports/frozen/csv` — frozen transactions CSV
- `GET /api/export/transactions/csv` — all transactions CSV
- `GET /api/export/transactions/pdf` — settlement report HTML
- `GET /api/invoices/:id/pdf` — individual invoice HTML

## Database Tables (shared/schema.ts)

| Table | Description |
|-------|-------------|
| transactions | Settlement TXs (status: Pending/Validated/Settled/Frozen, frozenReason) |
| users | Users with 2FA, brute-force fields (loginAttempts, lockedUntil) |
| audit_logs | All system events |
| invoices | Stripe billing records |
| kyc_submissions | AES-256 encrypted KYC data |
| notifications | In-app alerts |
| api_keys | Developer API keys (keyHash SHA-256 only, keyPrefix for display) |
| webhooks | Webhook endpoints (secret stored, URL must be HTTPS) |
| webhook_deliveries | Delivery logs |
| exchange_rates | Multi-currency FX rates (USD/EUR/GBP/JPY/CHF) |

## Key API Endpoints

- `GET /api/transactions` — list all transactions
- `POST /api/transactions` — create TX (auto-risk scored, auto-frozen if High+$1M)
- `PATCH /api/transactions/:id/status` — update status
- `GET /api/admin/frozen` — frozen transactions queue
- `POST /api/admin/frozen/:id/release` — approve or reject frozen TX
- `GET /api/fx/rates` — all exchange rates
- `GET /api/fx/convert?amount=&from=&to=` — currency conversion
- `POST /api/auth/2fa/send` — send 2FA code (rate limited)
- `POST /api/auth/2fa/verify` — verify code with brute-force protection

## GitHub Integration

- Repo: `Abdesselamh/settlement-engine`
- Connector: conn_github_01KJK7FC3PEQD5XSTWMCMQARPX
- Sync script: `npx tsx script/sync-github-api.ts`

## Integrations

- Stripe: conn_stripe_01KJKE7MKVH2XM6WEZY3HSK7XQ
- Resend: conn_resend_01KJMJZGMXEH00HX3YTE9RZM1F
- GitHub: conn_github_01KJK7FC3PEQD5XSTWMCMQARPX

## Running

- `npm run dev` — starts Express + Vite on port 5000
- `npm run db:push` — sync Drizzle schema to PostgreSQL
- `npx tsx script/sync-github-api.ts` — push to GitHub
