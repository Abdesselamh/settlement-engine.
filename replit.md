# InstantSettlement.ai — Enterprise Settlement Platform

## Project Overview

An institutional-grade, AI-driven T+0 settlement engine for Tier-1 Banks, Hedge Funds, and Central Banks. Built with React + Express + PostgreSQL, featuring a full Stripe payment integration, 2FA authentication, and enterprise admin capabilities.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (port 5000, same as backend via Vite middleware)
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Payments**: Stripe (via Replit Connector + stripe-replit-sync)
- **Charts**: Recharts
- **UI**: Shadcn/UI + Tailwind CSS + Framer Motion

## Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Home.tsx | Hero, trust bar, bento grid |
| `/dashboard` | Dashboard.tsx | Live settlement feed, charts, CSV/PDF export |
| `/pricing` | Pricing.tsx | 3 tiers with Stripe checkout buttons |
| `/request-demo` | RequestDemo.tsx | Lead capture form |
| `/admin` | AdminDashboard.tsx | User mgmt, analytics, invoices, audit logs |
| `/audit-log` | AuditLog.tsx | Searchable security audit log |
| `/login` | Login.tsx | 2FA email authentication (6-digit OTP) |
| `/checkout/success` | CheckoutSuccess.tsx | Post-payment receipt page |

## Database Schema (PostgreSQL)

- `transactions` — Settlement records (TX ID, amount, currency, parties, status, latency)
- `leads` — Demo request leads
- `users` — Platform users (email, role, 2FA state, Stripe IDs)
- `audit_logs` — Security audit trail
- `invoices` — Payment records linked to Stripe
- `stripe.*` — Managed automatically by stripe-replit-sync

## API Endpoints

### Core
- `GET /api/transactions` — list all transactions
- `POST /api/transactions` — create transaction
- `PATCH /api/transactions/:id/status` — update status
- `GET /api/metrics` — platform KPIs

### Auth (2FA)
- `POST /api/auth/2fa/send` — send OTP to email
- `POST /api/auth/2fa/verify` — verify OTP, return user

### Admin
- `GET /api/admin/users` — all users
- `PATCH /api/admin/users/:id` — update user
- `GET /api/admin/audit-logs` — audit log (limit 200)
- `GET /api/admin/invoices` — all invoices
- `GET /api/admin/stats` — platform stats

### Stripe
- `GET /api/stripe/publishable-key` — frontend Stripe key
- `GET /api/stripe/products` — synced products from stripe schema
- `POST /api/stripe/checkout` — create Stripe Checkout session
- `GET /api/stripe/session/:id` — retrieve session + create invoice
- `POST /api/stripe/webhook` — Stripe webhook (registered before express.json())

### Leads
- `POST /api/leads` — create demo request lead

### Export
- `GET /api/export/transactions/csv` — download CSV
- `GET /api/export/transactions/pdf` — view PDF/HTML report

### Invoices
- `GET /api/invoices/:id/pdf` — per-invoice PDF receipt

## Stripe Products (Sandbox)
- **Essential**: $5,000/mo — prod_U47obbvuY6GTQR / price_1T5zYvI4Lk9T5bFlQd0YHR2s
- **Professional**: $25,000/mo — prod_U47ovsr7vYcHhs / price_1T5zYwI4Lk9T5bFlA6E8MOah

## Integrations
- **Stripe Connector**: conn_stripe_01KJKE7MKVH2XM6WEZY3HSK7XQ (sandbox + production)
- **GitHub Connector**: conn_github_01KJK7FC3PEQD5XSTWMCMQARPX (repo: Abdesselamh/settlement-engine)

## Key Design Decisions
- Stripe webhook registered BEFORE express.json() (required for raw Buffer)
- Stripe schema managed exclusively by stripe-replit-sync (never write to stripe.*)
- 2FA OTP expiry: 10 minutes; demo code shown in UI for testing
- PDF exports served as HTML (print-ready) to avoid server-side PDF dependencies
- GitHub sync uses Octokit API (blobs + trees) — skips files >5MB and .local/

## Development Commands
```bash
npm run dev          # Start dev server (port 5000)
npm run build        # Production build
npm run db:push      # Push schema to database
npx tsx script/seed-stripe-products.ts  # Create Stripe products (run once)
npx tsx script/sync-github-api.ts       # Push to GitHub
```
