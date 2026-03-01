# InstantSettlement.ai — Replit Agent Guide

## Overview

InstantSettlement.ai is an enterprise-grade, AI-driven financial settlement platform targeting Tier-1 Banks, Hedge Funds, and Central Banks. It simulates and demonstrates T+0 (same-day) settlement capabilities with sub-millisecond latency.

The platform consists of three main areas:
- **Marketing/Home Page** — Hero, bento grid, social proof, and an interactive Settlement Revenue Calculator
- **Live Dashboard** (`/dashboard`) — Real-time simulated transaction feed, latency charts, KPI cards, and CSV/PDF export
- **Pricing Page** (`/pricing`) — Three institutional tiers (Essential, Professional, Enterprise) with live Stripe checkout and an interactive volume calculator

Additional pages: Admin Dashboard, Audit Log, Login (with 2FA), Request Demo, and Checkout Success.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter (lightweight client-side routing, no React Router)
- **State & Data Fetching**: TanStack Query v5 — handles server state, caching, polling, and mutations
- **UI Components**: Shadcn/UI (New York style) built on Radix UI primitives
- **Styling**: Tailwind CSS with a heavily customized dark "Institutional Dark" theme (`#050816` background, electric blue primary)
- **Animations**: Framer Motion for smooth, high-end transitions
- **Charts**: Recharts for settlement latency and throughput visualizations
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`

**Key design decisions:**
- Dark theme is the only theme; CSS variables are used throughout for theming flexibility
- The dashboard uses a polling interval of 1000ms (`refetchInterval: 1000`) to create a "live" feel
- A frontend simulation loop in `Dashboard.tsx` creates and progresses transactions through states (Pending → Validated → Settled) by calling the backend API

**Client directory structure:**
```
client/
  src/
    pages/       — One file per route (Home, Dashboard, Pricing, etc.)
    components/  — Navbar, Footer, SettlementCalculator, and all Shadcn/ui components
    hooks/       — use-settlement.ts (all API interactions), use-mobile, use-toast
    lib/         — queryClient.ts, utils.ts
```

### Backend Architecture

- **Runtime**: Node.js with Express
- **Entry point**: `server/index.ts`
- **Pattern**: Thin Express routes delegating to a `storage` layer (DatabaseStorage class)
- **Shared types**: `shared/schema.ts` and `shared/routes.ts` are shared between client and server via TypeScript path aliases (`@shared/*`)
- **Build**: `esbuild` bundles the server to `dist/index.cjs`; Vite builds the client to `dist/public`

**Route registration pattern:**
- Stripe webhooks are registered **before** `express.json()` to receive raw Buffer payloads (required by Stripe signature verification)
- All other API routes registered after JSON middleware

**Key server files:**
- `server/routes.ts` — API route definitions, seeds database on first run
- `server/storage.ts` — `DatabaseStorage` class implementing `IStorage` interface (all DB operations)
- `server/stripeClient.ts` — Fetches Stripe API keys dynamically from Replit Connectors
- `server/github.ts` — Fetches GitHub token from Replit Connectors for code sync
- `server/webhookHandlers.ts` — Processes Stripe webhooks
- `server/email.ts` — Stubbed email service for 2FA codes and invoices (logs to console in MVP)

### Data Storage

- **Database**: PostgreSQL via Neon (serverless Postgres), connected via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with `drizzle-orm/node-postgres`
- **Schema location**: `shared/schema.ts` (shared with frontend for type safety)
- **Migrations**: Drizzle Kit, output to `./migrations`

**Database tables:**
| Table | Purpose |
|-------|---------|
| `transactions` | Settlement transactions (txId, amount, currency, sender, receiver, status, latencyMs) |
| `leads` | Demo request form submissions |
| `users` | Platform users with subscription and 2FA data |
| `audit_logs` | Action audit trail (login, export, subscription events) |
| `invoices` | Stripe invoice records |

### Authentication

- **Method**: Email-based 2FA (passwordless)
- **Flow**: User enters email → backend generates 6-digit code → user enters code → session established
- **Email delivery**: Stubbed in MVP (code logged to console), production would use SMTP/SendGrid
- **Session data**: Stored in `localStorage` on the client (`user` key)
- **Roles**: `user` and `admin` — admin users are redirected to `/admin` on login

### API Structure

Routes are defined in `shared/routes.ts` using a typed API object with Zod schemas for inputs and responses. This enables type-safe fetching on the client via `use-settlement.ts`.

Main API endpoints:
- `GET/POST /api/transactions` — List and create transactions
- `PATCH /api/transactions/:id/status` — Update transaction status
- `GET /api/metrics` — KPI metrics (throughput, latency, count)
- `POST /api/leads` — Submit demo request
- `POST /api/auth/2fa/send` / `POST /api/auth/2fa/verify` — 2FA login
- `GET /api/admin/users` / `/api/admin/stats` / `/api/admin/audit-logs` / `/api/admin/invoices` — Admin data
- `POST /api/stripe/create-checkout-session` — Initiate Stripe checkout
- `GET /api/stripe/session/:id` — Retrieve session for success page
- `POST /api/stripe/webhook` — Stripe webhook handler

---

## External Dependencies

### Stripe (via Replit Connector)
- **Purpose**: Subscription billing for Essential ($5k/mo) and Professional ($25k/mo) tiers
- **Integration**: `server/stripeClient.ts` fetches live API keys dynamically from Replit's connector service using `REPLIT_CONNECTORS_HOSTNAME` and `REPL_IDENTITY` environment variables
- **Key features**: Checkout sessions, webhook handling (subscription lifecycle), Stripe products synced via `script/seed-stripe-products.ts`
- **Webhook**: Must be registered before `express.json()` middleware to receive raw Buffer

### GitHub (via Replit Connector)
- **Purpose**: Sync project code to a GitHub repository (`script/sync-github-api.ts`)
- **Integration**: `server/github.ts` fetches OAuth token via Replit Connectors
- **Used by**: A utility script, not part of the main application flow

### Neon (PostgreSQL)
- **Purpose**: Serverless PostgreSQL database
- **Connection**: `DATABASE_URL` environment variable required at startup
- **Usage**: All persistent data (transactions, users, audit logs, invoices, leads)

### Google Fonts
- **Fonts loaded**: DM Sans, Fira Code, Geist Mono, Architects Daughter (HTML), Inter, JetBrains Mono (CSS)
- **Usage**: Typography throughout the dark institutional UI theme

### Replit-Specific Plugins (Dev only)
- `@replit/vite-plugin-runtime-error-modal` — Error overlay in development
- `@replit/vite-plugin-cartographer` — Replit code navigation
- `@replit/vite-plugin-dev-banner` — Dev environment banner

### Key npm Dependencies
| Package | Purpose |
|---------|---------|
| `framer-motion` | Animations |
| `recharts` | Financial charts |
| `drizzle-orm` + `drizzle-zod` | ORM and schema-to-Zod bridging |
| `stripe` | Stripe API client |
| `@octokit/rest` | GitHub API client |
| `connect-pg-simple` | PostgreSQL session store |
| `zod` | Runtime validation (shared client/server) |
| `date-fns` | Date formatting |
| `xlsx` | CSV/PDF export (referenced in build allowlist) |
| `nanoid` | Unique ID generation |
| `wouter` | Lightweight React router |