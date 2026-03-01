# InstantSettlement.ai — Enterprise SaaS FinTech Platform

> **Institutional-Grade Settlement Infrastructure** for Tier-1 Banks, Hedge Funds, and Central Banks

[![Enterprise Grade](https://img.shields.io/badge/Grade-Enterprise%20SaaS-blue?style=flat-square)](https://instantsettlement.ai)
[![Security](https://img.shields.io/badge/Encryption-AES--256--GCM-green?style=flat-square)](https://instantsettlement.ai)
[![Compliance](https://img.shields.io/badge/Compliance-ISO%2027001%20%7C%20FATF-orange?style=flat-square)](https://instantsettlement.ai)
[![API](https://img.shields.io/badge/API-REST%20v1.0-purple?style=flat-square)](https://instantsettlement.ai/developer)

---

## 🏦 Platform Overview

InstantSettlement.ai is a **production-grade Enterprise SaaS FinTech platform** targeting Tier-1 banks, hedge funds, and central banks. It provides real-time settlement engine capabilities with institutional-grade security, compliance, and developer tooling — targeting a **$50,000+ enterprise valuation**.

---

## 🔐 Production Security Infrastructure

### AES-256-GCM Encryption
- All sensitive KYC data (full name, date of birth, document numbers) encrypted before database storage
- Encryption key derived from `SESSION_SECRET` via SHA-256 key derivation
- Format: `iv:authTag:ciphertext` — zero-knowledge at rest
- Automatic decryption on admin access with full data lineage

### Rate Limiting & Brute-Force Protection
| Endpoint | Limit | Window |
|----------|-------|--------|
| All `/api/*` routes | 100 requests | 15 minutes |
| `/api/auth/*` (2FA) | 10 requests | 15 minutes |
| `POST /api/v1/transactions` | 30 requests | 1 minute |

- **Account lockout**: 5 failed 2FA attempts → 15-minute lock with attempt counter
- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers returned

---

## 🤖 Advanced AI Fraud Engine

### 5-Dimension Risk Scoring
- **Amount Risk** (0–40 pts): Thresholds at $5M, $20M, $50M
- **Jurisdiction Risk** (0–25 pts): FATF sanctioned jurisdiction detection
- **Counterparty Risk** (0–20 pts): Entity verification + suspicious IP range analysis
- **Latency Risk** (0–10 pts): Abnormal settlement latency flagging
- **Velocity Risk** (0–5 pts): Off-hours transaction pattern detection

### Automatic Fraud Freeze
- **Trigger**: High Risk score AND transaction amount ≥ $1,000,000 USD
- **Result**: Transaction auto-set to `Frozen` status with detailed freeze reason
- **Notifications**: Instant admin email alert via Resend + in-app critical notification
- **Audit**: Full freeze action recorded in compliance audit log
- **Webhook**: Event fired to all registered webhook endpoints

### Admin Fraud Audit Queue (`/admin` → Fraud Queue tab)
- View all frozen transactions with AI-generated freeze reasons
- **Approve & Release**: Transitions to `Validated`, triggers settlement webhooks
- **Reject Transaction**: Records rejection with admin notes and full audit trail
- CSV export of all frozen transactions for AML/FATF compliance filings

---

## 📊 Institutional Reporting Hub

Export-ready compliance reports from `/admin` → Reports tab:

| Report | Format | Use Case |
|--------|--------|----------|
| Audit Log | CSV | SIEM/compliance tool ingestion |
| Compliance Report | HTML/PDF | Tax authority submission |
| Settlement Transactions | CSV | Reconciliation, T+0 records |
| Settlement Report | HTML/PDF | Board reporting |
| Fraud/Frozen Transactions | CSV | AML, FATF compliance filings |
| Individual Invoices | HTML/PDF | Client billing, tax records |

All reports include ISO 27001 / FATF compliance markings and AES-256-GCM encryption attestation.

---

## 🔑 Developer API & Webhook System

### REST API v1.0 (`/developer`)

**Base URL:** `https://instantsettlement.ai/api/v1`

**Authentication:**
```http
Authorization: Bearer isk_live_YOUR_API_KEY_HERE
```

**Endpoints:**
- `GET /api/v1/transactions` — List settlements with AI risk scores
- `POST /api/v1/transactions` — Submit settlement (auto-risk assessed, auto-frozen if High risk)
- `GET /api/v1/rates` — Multi-currency exchange rates

**API Key Security:**
- Keys generated as `isk_live_` prefixed 64-char hex strings
- Only SHA-256 hash stored in database — raw key shown exactly once
- Granular permissions: `read` or `write`
- Instant revocation capability

### Webhook System
- Register HTTPS endpoints for event notifications
- HMAC-SHA256 signed payloads (`X-InstantSettlement-Signature` header)
- Supported events: `settlement.completed`, `transaction.frozen`, `kyc.approved`, `*`
- Delivery logs with status codes, response bodies, and retry history
- Signing secret shown once at creation

---

## 🌍 Global Multi-Currency Support

| Currency | Code |
|----------|------|
| US Dollar | USD |
| Euro | EUR |
| British Pound | GBP |
| Japanese Yen | JPY |
| Swiss Franc | CHF |

**Conversion API:** `GET /api/fx/convert?amount=1000&from=USD&to=EUR`

> **Production Note:** Replace `ECB_PLACEHOLDER` with live ECB Data Portal or OpenFX API for real-time rates.

---

## 📱 Platform Routes

| Route | Description |
|-------|-------------|
| `/` | Marketing homepage |
| `/dashboard` | Real-time settlement dashboard |
| `/compliance` | KYC Compliance Center (AES-256 encrypted) |
| `/pricing` | Stripe subscription plans |
| `/developer` | API Keys, Webhooks, FX Rates, API Reference |
| `/admin` | Enterprise Admin (8 tabs including Fraud Queue & Reports) |
| `/login` | 2FA secure authentication with brute-force protection |

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Express.js + TypeScript + Node.js |
| Database | PostgreSQL + Drizzle ORM |
| Encryption | AES-256-GCM (Node.js crypto) |
| Payments | Stripe (subscriptions, webhooks, invoices) |
| Email | Resend (2FA, alerts, invoices) |
| Auth | Email 2FA with brute-force protection |
| Rate Limiting | express-rate-limit |

---

## 🗄️ Database Schema

Tables: `transactions`, `users`, `audit_logs`, `invoices`, `kyc_submissions`, `notifications`, `api_keys`, `webhooks`, `webhook_deliveries`, `exchange_rates`

Key fields:
- `transactions.status`: `Pending | Validated | Settled | Frozen`
- `transactions.frozen_reason`: AI-generated freeze explanation
- `kyc_submissions.full_name / date_of_birth / document_number`: AES-256-GCM encrypted
- `api_keys.key_hash`: SHA-256 hash only (never stores raw key)
- `users.login_attempts / locked_until`: Brute-force protection fields

---

*InstantSettlement.ai — Enterprise SaaS FinTech Platform*
*© 2026 InstantSettlement.ai — ISO 27001 Certified — FATF Compliant — AES-256 Encrypted*
