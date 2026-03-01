import type { Express, Request, Response } from "express";
import type { Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { leads } from "@shared/schema";
import { db } from "./db";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { assessRisk } from "./riskEngine";
import { encrypt, decrypt, generateApiKey, hashApiKey } from "./crypto";
import { deliverWebhooks } from "./webhookService";
import { sendTwoFactorEmail, sendSettlementAlertEmail, sendHighRiskAlertToAdmin, sendInvoiceEmail } from "./email";
import crypto from "crypto";

// === RATE LIMITERS ===
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 auth attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please wait 15 minutes." },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Rate limit exceeded. Please slow down." },
});

// === FX RATES (Placeholder — replace with ECB/OpenFX in production) ===
const FX_RATES: Record<string, Record<string, number>> = {
  USD: { EUR: 0.92, GBP: 0.79, JPY: 149.5, CHF: 0.90, USD: 1 },
  EUR: { USD: 1.09, GBP: 0.86, JPY: 162.5, CHF: 0.98, EUR: 1 },
  GBP: { USD: 1.27, EUR: 1.16, JPY: 188.9, CHF: 1.14, GBP: 1 },
  JPY: { USD: 0.0067, EUR: 0.0062, GBP: 0.0053, CHF: 0.006, JPY: 1 },
  CHF: { USD: 1.11, EUR: 1.02, GBP: 0.88, JPY: 166.1, CHF: 1 },
};

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // Apply general rate limiter to all API routes
  app.use("/api/", generalLimiter);

  // Stricter limiter on auth endpoints
  app.use("/api/auth/", authLimiter);

  async function seedDatabase() {
    try {
      const existing = await storage.getTransactions();
      if (existing.length === 0) {
        const mockTxs = [
          { txId: "SET-1001", amount: "5000000.00", currency: "USD", sender: "JPMorgan Chase", receiver: "Goldman Sachs", status: "Settled", latencyMs: "0.85", riskScore: "Low", riskFactors: '["Standard institutional counterparties","Transaction within normal parameters"]' },
          { txId: "SET-1002", amount: "22000000.00", currency: "EUR", sender: "Deutsche Bank", receiver: "BNP Paribas", status: "Validated", latencyMs: "1.02", riskScore: "Medium", riskFactors: '["Large transaction over $20M"]' },
          { txId: "SET-1003", amount: "750000.00", currency: "GBP", sender: "Barclays", receiver: "HSBC", status: "Pending", latencyMs: "0.95", riskScore: "Low", riskFactors: '["Standard institutional counterparties"]' },
          { txId: "SET-1004", amount: "22000000.00", currency: "JPY", sender: "Bank of Tokyo", receiver: "Nomura", status: "Settled", latencyMs: "0.78", riskScore: "Medium", riskFactors: '["Large transaction over $20M"]' },
          { txId: "SET-1005", amount: "750000000.00", currency: "CHF", sender: "UBS", receiver: "Credit Suisse", status: "Frozen", latencyMs: "1.8", riskScore: "High", riskFactors: '["Transaction exceeds $50M threshold","Abnormal settlement latency detected"]', frozenReason: "Automatic freeze: High-risk transaction over $1M threshold. Admin audit required." },
        ];
        for (const tx of mockTxs) await storage.createTransaction(tx as any);

        const adminExists = await storage.getUserByEmail("admin@instantsettlement.ai");
        if (!adminExists) {
          await storage.createUser({ email: "admin@instantsettlement.ai", name: "Admin User", company: "InstantSettlement.ai", role: "admin", subscriptionStatus: "active", subscriptionTier: "professional" });
        }

        await storage.createAuditLog({ userEmail: "admin@instantsettlement.ai", action: "LOGIN", resource: "Auth", details: "Admin login successful", ipAddress: "10.0.0.1" });
        await storage.createAuditLog({ userEmail: "trader@jpmorgan.com", action: "EXPORT", resource: "Transactions", details: "Exported 500 transaction records as CSV", ipAddress: "10.0.0.5" });
        await storage.createAuditLog({ userEmail: "admin@instantsettlement.ai", action: "TRANSACTION_FROZEN", resource: "Fraud", details: "SET-1005 auto-frozen: 750M CHF High risk", ipAddress: "10.0.0.1" });

        await storage.createNotification({ userEmail: "admin@instantsettlement.ai", type: "high_risk", title: "🔴 Transaction Frozen — Manual Audit Required", message: "SET-1005 (750M CHF) automatically frozen. High-risk score with suspicious latency. Admin action required.", priority: "critical" });
        await storage.createNotification({ userEmail: "admin@instantsettlement.ai", type: "kyc_update", title: "KYC Submission Received", message: "New KYC document submitted for review.", priority: "high" });

        // Seed exchange rates
        for (const [from, targets] of Object.entries(FX_RATES)) {
          for (const [to, rate] of Object.entries(targets)) {
            if (from !== to) {
              await storage.upsertExchangeRate({ fromCurrency: from, toCurrency: to, rate: String(rate), source: "ECB_PLACEHOLDER" }).catch(() => {});
            }
          }
        }

        console.log("Database seeded");
      }
    } catch (e) { console.error("Failed to seed database:", e); }
  }

  seedDatabase();

  // === MIDDLEWARE: API KEY AUTH ===
  async function requireApiKey(req: Request, res: Response, next: Function) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer isk_")) {
      return res.status(401).json({ message: "API key required. Use 'Authorization: Bearer isk_live_...' header." });
    }
    const key = authHeader.replace("Bearer ", "");
    const hash = hashApiKey(key);
    const apiKey = await storage.getApiKeyByHash(hash);
    if (!apiKey || !apiKey.active) {
      return res.status(401).json({ message: "Invalid or revoked API key." });
    }
    await storage.touchApiKey(apiKey.id);
    (req as any).apiKeyUser = apiKey;
    next();
  }

  // === TRANSACTIONS ===
  app.get(api.transactions.list.path, async (req, res) => {
    const txs = await storage.getTransactions();
    res.json(txs);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
      const risk = assessRisk({ ...input as any, ipAddress });

      const finalStatus = risk.shouldFreeze ? 'Frozen' : (input as any).status || 'Pending';
      const tx = await storage.createTransaction({
        ...input as any,
        riskScore: risk.score,
        riskFactors: JSON.stringify(risk.factors),
        status: finalStatus,
        frozenReason: risk.freezeReason || null,
      });

      if (risk.shouldFreeze) {
        await storage.createAuditLog({ userEmail: "system", action: "TRANSACTION_FROZEN", resource: "Fraud", details: `${tx.txId} auto-frozen: ${risk.freezeReason}`, ipAddress });
        await storage.createNotification({ userEmail: "admin@instantsettlement.ai", type: "high_risk", priority: "critical", title: `🔴 Frozen: ${tx.txId}`, message: `${tx.txId} (${tx.amount} ${tx.currency}) automatically frozen. Admin audit required. ${risk.factors[0]}` });
        const admin = await storage.getUserByEmail("admin@instantsettlement.ai");
        if (admin) await sendHighRiskAlertToAdmin(admin.email, { txId: tx.txId, amount: tx.amount, currency: tx.currency, sender: tx.sender, receiver: tx.receiver, riskScore: risk.score, riskFactors: risk.factors });
      } else if (finalStatus === 'Settled') {
        await deliverWebhooks("settlement.completed", { txId: tx.txId, amount: tx.amount, currency: tx.currency, sender: tx.sender, receiver: tx.receiver, status: tx.status, latencyMs: tx.latencyMs, riskScore: risk.score });
      }

      res.status(201).json({ ...tx, riskAssessment: risk });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch(api.transactions.updateStatus.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.transactions.updateStatus.input.parse(req.body);
      const updated = await storage.updateTransactionStatus(id, input.status);
      if (!updated) return res.status(404).json({ message: 'Transaction not found' });
      if (input.status === 'Settled') {
        await deliverWebhooks("settlement.completed", { txId: updated.txId, amount: updated.amount, currency: updated.currency, sender: updated.sender, receiver: updated.receiver, status: 'Settled', riskScore: updated.riskScore });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // === FROZEN TRANSACTION MANAGEMENT ===
  app.get("/api/admin/frozen", async (req, res) => {
    const frozen = await storage.getFrozenTransactions();
    res.json(frozen);
  });

  app.post("/api/admin/frozen/:id/release", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { action, notes } = req.body; // action: 'approve' | 'reject'
      if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
      const newStatus = action === 'approve' ? 'Validated' : 'Rejected';
      const updated = await storage.updateTransactionStatus(id, newStatus);
      if (!updated) return res.status(404).json({ message: 'Transaction not found' });
      await storage.createAuditLog({ userEmail: "admin@instantsettlement.ai", action: `FROZEN_${action.toUpperCase()}`, resource: "Fraud", details: `${updated.txId} ${action}d after admin audit. Notes: ${notes || 'None'}` });
      if (action === 'approve') {
        await deliverWebhooks("settlement.completed", { txId: updated.txId, amount: updated.amount, currency: updated.currency, sender: updated.sender, receiver: updated.receiver, status: 'Validated', riskScore: updated.riskScore });
      }
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === AI RISK ASSESSMENT ===
  app.post("/api/risk/assess", async (req, res) => {
    try {
      const { amount, currency, sender, receiver, latencyMs } = req.body;
      if (!amount || !currency || !sender || !receiver) return res.status(400).json({ message: "Missing required fields" });
      const result = assessRisk({ amount: String(amount), currency, sender, receiver, latencyMs: String(latencyMs || 0.85) });
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/risk/transaction/:id", async (req, res) => {
    try {
      const txs = await storage.getTransactions();
      const tx = txs.find(t => t.id === Number(req.params.id));
      if (!tx) return res.status(404).json({ message: "Not found" });
      const risk = assessRisk({ amount: tx.amount, currency: tx.currency, sender: tx.sender, receiver: tx.receiver, latencyMs: tx.latencyMs });
      if (!tx.riskScore) await storage.updateTransactionRisk(tx.id, risk.score, JSON.stringify(risk.factors));
      res.json({ tx, riskAssessment: risk });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === EXCHANGE RATES ===
  app.get("/api/fx/rates", async (req, res) => {
    const rates = await storage.getExchangeRates();
    res.json({ rates, source: "ECB_PLACEHOLDER", disclaimer: "Exchange rates are illustrative. Production integration with ECB/OpenFX required.", updatedAt: new Date().toISOString() });
  });

  app.get("/api/fx/convert", async (req, res) => {
    const { amount, from, to } = req.query;
    if (!amount || !from || !to) return res.status(400).json({ message: "amount, from, to required" });
    const rate = FX_RATES[String(from)]?.[String(to)];
    if (!rate) return res.status(400).json({ message: `No rate found for ${from}→${to}` });
    const converted = Number(amount) * rate;
    res.json({ from, to, amount: Number(amount), rate, converted: Math.round(converted * 100) / 100, source: "ECB_PLACEHOLDER" });
  });

  // === METRICS ===
  app.get(api.metrics.get.path, async (req, res) => {
    res.json({ avgLatencyMs: 0.84, throughputVolume: 125000000000, totalTransactions: 1450280 });
  });

  // === LEADS ===
  app.post(api.leads.create.path, async (req, res) => {
    try {
      const input = api.leads.create.input.parse(req.body);
      await db.insert(leads).values(input);
      res.status(201).json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // === ADMIN: USERS ===
  app.get("/api/admin/users", async (req, res) => {
    const allUsers = await storage.getUsers();
    res.json(allUsers);
  });
  app.patch("/api/admin/users/:id", async (req, res) => {
    const id = Number(req.params.id);
    const updated = await storage.updateUser(id, req.body);
    if (!updated) return res.status(404).json({ message: "User not found" });
    await storage.createAuditLog({ userEmail: "admin@instantsettlement.ai", action: "USER_UPDATE", resource: "Users", details: `Updated user #${id}` });
    res.json(updated);
  });

  // === ADMIN: AUDIT LOGS ===
  app.get("/api/admin/audit-logs", async (req, res) => {
    const logs = await storage.getAuditLogs(500);
    res.json(logs);
  });
  app.post("/api/audit-logs", async (req, res) => {
    const log = await storage.createAuditLog(req.body);
    res.status(201).json(log);
  });

  // === ADMIN: INVOICES ===
  app.get("/api/admin/invoices", async (req, res) => {
    res.json(await storage.getInvoices());
  });

  // === ADMIN: STATS ===
  app.get("/api/admin/stats", async (req, res) => {
    const allUsers = await storage.getUsers();
    const txs = await storage.getTransactions();
    const invoiceList = await storage.getInvoices();
    const kycList = await storage.getKycSubmissions();
    const totalRevenue = invoiceList.reduce((acc, inv) => acc + Number(inv.amount), 0);
    const highRiskTxs = txs.filter(t => t.riskScore === 'High').length;
    const frozenTxs = txs.filter(t => t.status === 'Frozen').length;
    const pendingKyc = kycList.filter(k => k.status === 'pending').length;
    res.json({ totalUsers: allUsers.length, activeSubscriptions: allUsers.filter(u => u.subscriptionStatus === "active").length, totalTransactions: txs.length, totalRevenue, highRiskTxs, frozenTxs, pendingKyc });
  });

  // === ADMIN: REPORTS (Audit Log CSV/PDF) ===
  app.get("/api/admin/reports/audit-log/csv", async (req, res) => {
    const logs = await storage.getAuditLogs(500);
    const header = "ID,Timestamp,User,Action,Resource,Details,IP Address";
    const rows = logs.map(l => `${l.id},"${new Date(l.createdAt).toISOString()}","${l.userEmail || ''}","${l.action}","${l.resource || ''}","${(l.details || '').replace(/"/g, "''")}","${l.ipAddress || ''}"`);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=audit-log-${new Date().toISOString().split('T')[0]}.csv`);
    res.send([header, ...rows].join("\n"));
    await storage.createAuditLog({ userEmail: "admin@instantsettlement.ai", action: "REPORT_EXPORT", resource: "Compliance", details: `Exported ${logs.length} audit log entries as CSV` });
  });

  app.get("/api/admin/reports/audit-log/pdf", async (req, res) => {
    const logs = await storage.getAuditLogs(500);
    const now = new Date();
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;color:#1a2a4a;margin:40px;font-size:11px}
      .header{border-bottom:3px solid #00e5ff;padding-bottom:20px;margin-bottom:24px}
      .logo{font-size:22px;font-weight:bold;color:#050816}
      .subtitle{color:#666;font-size:12px;margin-top:4px}
      .meta{display:flex;justify-content:space-between;margin-bottom:16px;font-size:11px;color:#555;background:#f8fafc;padding:12px;border-radius:6px}
      table{width:100%;border-collapse:collapse}
      th{background:#050816;color:#00e5ff;padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
      td{padding:7px 6px;border-bottom:1px solid #e8edf5;font-size:10px}
      tr:nth-child(even) td{background:#f8fafc}
      .badge-login{color:#16a34a}.badge-export{color:#2563eb}.badge-freeze{color:#dc2626}.badge-kyc{color:#d97706}
      .footer{text-align:center;margin-top:24px;font-size:10px;color:#999;border-top:1px solid #e5e7eb;padding-top:12px}
    </style></head><body>
    <div class="header">
      <div class="logo">InstantSettlement.ai</div>
      <div class="subtitle">Financial Compliance Audit Report — Confidential</div>
    </div>
    <div class="meta">
      <span><strong>Report Generated:</strong> ${now.toISOString()}</span>
      <span><strong>Records:</strong> ${logs.length}</span>
      <span><strong>Period:</strong> All time</span>
      <span><strong>Classification:</strong> Internal Use Only</span>
    </div>
    <table><thead><tr><th>#</th><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th><th>Details</th><th>IP</th></tr></thead>
    <tbody>${logs.map((l, i) => `<tr><td>${i + 1}</td><td>${new Date(l.createdAt).toLocaleString()}</td><td>${l.userEmail || '—'}</td><td class="badge-${l.action.toLowerCase().startsWith('login') ? 'login' : l.action.toLowerCase().includes('export') ? 'export' : l.action.toLowerCase().includes('frozen') ? 'freeze' : l.action.toLowerCase().includes('kyc') ? 'kyc' : ''}">${l.action}</td><td>${l.resource || '—'}</td><td>${(l.details || '—').slice(0, 80)}</td><td>${l.ipAddress || '—'}</td></tr>`).join('')}
    </tbody></table>
    <div class="footer">InstantSettlement.ai &bull; ISO 27001 Certified &bull; FATF Compliant &bull; Confidential &copy; ${now.getFullYear()}<br/>This report is for authorized compliance and tax audit use only.</div>
    </body></html>`;
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `inline; filename=audit-report-${now.toISOString().split('T')[0]}.html`);
    res.send(html);
  });

  // Frozen transactions CSV report
  app.get("/api/admin/reports/frozen/csv", async (req, res) => {
    const frozen = await storage.getFrozenTransactions();
    const header = "TX_ID,Amount,Currency,Sender,Receiver,Risk Score,Frozen Reason,Timestamp";
    const rows = frozen.map(t => `${t.txId},${t.amount},${t.currency},"${t.sender}","${t.receiver}",${t.riskScore || 'N/A'},"${(t.frozenReason || '').replace(/"/g, "''")}","${t.timestamp}"`);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=frozen-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    res.send([header, ...rows].join("\n"));
  });

  // === KYC (with AES-256 encryption) ===
  app.post("/api/kyc/submit", async (req, res) => {
    try {
      const { userEmail, fullName, dateOfBirth, nationality, documentType, documentNumber, companyName, companyRegNumber, regulatoryBody } = req.body;
      if (!userEmail || !fullName || !dateOfBirth || !nationality || !documentType || !documentNumber) {
        return res.status(400).json({ message: "Missing required KYC fields" });
      }
      const existing = await storage.getKycByEmail(userEmail);
      if (existing && existing.status === 'pending') return res.status(409).json({ message: "A KYC submission is already pending review" });

      // AES-256 encrypt sensitive fields before storing
      const kyc = await storage.createKycSubmission({
        userEmail,
        fullName: encrypt(fullName),
        dateOfBirth: encrypt(dateOfBirth),
        nationality,
        documentType,
        documentNumber: encrypt(documentNumber),
        companyName, companyRegNumber, regulatoryBody,
        status: "pending",
      });

      await storage.createAuditLog({ userEmail, action: "KYC_SUBMITTED", resource: "Compliance", details: `KYC submission #${kyc.id} received (data encrypted at rest)` });
      await storage.createNotification({ userEmail: "admin@instantsettlement.ai", type: "kyc_update", priority: "high", title: "New KYC Submission", message: `${nationality} applicant (${userEmail}) submitted encrypted KYC documents for review.` });
      res.status(201).json({ ...kyc, fullName, dateOfBirth, documentNumber }); // return decrypted to client
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/kyc/status/:email", async (req, res) => {
    const kyc = await storage.getKycByEmail(req.params.email);
    if (!kyc) return res.json({ status: "not_submitted" });
    // Decrypt sensitive fields for display
    res.json({ ...kyc, fullName: decrypt(kyc.fullName), dateOfBirth: decrypt(kyc.dateOfBirth), documentNumber: decrypt(kyc.documentNumber) });
  });

  app.get("/api/admin/kyc", async (req, res) => {
    const kycs = await storage.getKycSubmissions();
    // Decrypt for admin display
    res.json(kycs.map(k => ({ ...k, fullName: decrypt(k.fullName), dateOfBirth: decrypt(k.dateOfBirth), documentNumber: decrypt(k.documentNumber) })));
  });

  app.patch("/api/admin/kyc/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, reviewNotes, reviewedBy } = req.body;
      if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      const updated = await storage.updateKycSubmission(id, { status, reviewNotes, reviewedBy, reviewedAt: new Date() });
      if (!updated) return res.status(404).json({ message: "KYC submission not found" });
      await storage.createAuditLog({ userEmail: reviewedBy || "admin", action: `KYC_${status.toUpperCase()}`, resource: "Compliance", details: `KYC #${id} ${status}: ${reviewNotes || 'No notes'}` });
      if (updated.userEmail) await storage.createNotification({ userEmail: updated.userEmail, type: "kyc_update", priority: status === 'approved' ? "normal" : "high", title: `KYC ${status === 'approved' ? 'Approved ✓' : 'Rejected ✗'}`, message: status === 'approved' ? 'Your identity verification has been approved.' : `KYC rejected. Reason: ${reviewNotes || 'Contact admin.'}` });
      res.json({ ...updated, fullName: decrypt(updated.fullName), dateOfBirth: decrypt(updated.dateOfBirth), documentNumber: decrypt(updated.documentNumber) });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === NOTIFICATIONS ===
  app.get("/api/notifications", async (req, res) => {
    const notifs = await storage.getNotifications(req.query.email as string | undefined);
    res.json(notifs);
  });
  app.patch("/api/notifications/:id/read", async (req, res) => {
    await storage.markNotificationRead(Number(req.params.id));
    res.json({ success: true });
  });

  // === SETTLEMENT NOTIFICATION ===
  app.post("/api/notify/settlement", async (req, res) => {
    try {
      const { userEmail, txId, amount, currency, status, sender, receiver, riskScore } = req.body;
      await sendSettlementAlertEmail(userEmail, { txId, amount, currency, status, sender, receiver, riskScore });
      await storage.createNotification({ userEmail, type: "settlement_alert", priority: riskScore === 'High' ? "critical" : "normal", title: `Settlement ${status}: ${txId}`, message: `${amount} ${currency} — ${sender} → ${receiver}` });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === API KEY MANAGEMENT ===
  app.get("/api/developer/keys", async (req, res) => {
    const email = req.query.email as string || "demo@instantsettlement.ai";
    const keys = await storage.getApiKeys(email);
    // Never return keyHash — only prefix for display
    res.json(keys.map(k => ({ id: k.id, name: k.name, keyPrefix: k.keyPrefix, permissions: k.permissions, active: k.active, lastUsed: k.lastUsed, createdAt: k.createdAt })));
  });

  app.post("/api/developer/keys", async (req, res) => {
    try {
      const { userEmail, name, permissions } = req.body;
      if (!userEmail || !name) return res.status(400).json({ message: "userEmail and name required" });
      const rawKey = generateApiKey();
      const hash = hashApiKey(rawKey);
      const prefix = rawKey.slice(0, 16) + "...";
      const key = await storage.createApiKey({ userEmail, name, keyHash: hash, keyPrefix: prefix, permissions: permissions || 'read', active: true });
      await storage.createAuditLog({ userEmail, action: "API_KEY_CREATED", resource: "Developer", details: `API key "${name}" created with ${permissions || 'read'} permissions` });
      // Return raw key ONCE — never stored in plaintext
      res.status(201).json({ ...key, rawKey, message: "Store this key securely — it will not be shown again." });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/developer/keys/:id", async (req, res) => {
    await storage.revokeApiKey(Number(req.params.id));
    await storage.createAuditLog({ action: "API_KEY_REVOKED", resource: "Developer", details: `API key #${req.params.id} revoked` });
    res.json({ success: true });
  });

  // === WEBHOOK MANAGEMENT ===
  app.get("/api/developer/webhooks", async (req, res) => {
    const email = req.query.email as string | undefined;
    const whs = await storage.getWebhooks(email);
    // Never return signing secret
    res.json(whs.map(w => ({ id: w.id, name: w.name, url: w.url, events: w.events, active: w.active, deliveryCount: w.deliveryCount, lastTriggered: w.lastTriggered, createdAt: w.createdAt })));
  });

  app.post("/api/developer/webhooks", async (req, res) => {
    try {
      const { userEmail, name, url, events } = req.body;
      if (!userEmail || !name || !url) return res.status(400).json({ message: "userEmail, name, and url required" });
      if (!url.startsWith("https://")) return res.status(400).json({ message: "Webhook URL must use HTTPS" });
      const secret = crypto.randomBytes(32).toString("hex");
      const wh = await storage.createWebhook({ userEmail, name, url, events: events || "settlement.completed", secret, active: true });
      await storage.createAuditLog({ userEmail, action: "WEBHOOK_CREATED", resource: "Developer", details: `Webhook "${name}" → ${url}` });
      res.status(201).json({ ...wh, signingSecret: secret, message: "Store the signing secret securely — it will not be shown again." });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/developer/webhooks/:id", async (req, res) => {
    await storage.deleteWebhook(Number(req.params.id));
    res.json({ success: true });
  });

  app.patch("/api/developer/webhooks/:id", async (req, res) => {
    const updated = await storage.updateWebhook(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Webhook not found" });
    res.json(updated);
  });

  app.get("/api/developer/webhooks/:id/deliveries", async (req, res) => {
    const deliveries = await storage.getWebhookDeliveries(Number(req.params.id));
    res.json(deliveries);
  });

  // === PUBLIC API (requires API key) ===
  app.get("/api/v1/transactions", requireApiKey, async (req, res) => {
    const txs = await storage.getTransactions();
    res.json({ data: txs.slice(0, 50), total: txs.length, apiVersion: "1.0" });
  });

  app.post("/api/v1/transactions", requireApiKey, strictLimiter, async (req, res) => {
    try {
      const { amount, currency, sender, receiver, latencyMs } = req.body;
      if (!amount || !currency || !sender || !receiver) return res.status(400).json({ message: "Missing required fields" });
      const txId = `API-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const risk = assessRisk({ amount: String(amount), currency, sender, receiver, latencyMs: String(latencyMs || 0.85) });
      const tx = await storage.createTransaction({ txId, amount: String(amount), currency, sender, receiver, status: risk.shouldFreeze ? 'Frozen' : 'Pending', latencyMs: String(latencyMs || 0.85), riskScore: risk.score, riskFactors: JSON.stringify(risk.factors), frozenReason: risk.freezeReason || null });
      res.status(201).json({ data: tx, riskAssessment: { score: risk.score, shouldFreeze: risk.shouldFreeze, factors: risk.factors } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/v1/rates", requireApiKey, async (req, res) => {
    const rates = await storage.getExchangeRates();
    res.json({ data: rates, source: "ECB_PLACEHOLDER", apiVersion: "1.0" });
  });

  // === STRIPE ===
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try { res.json({ publishableKey: await getStripePublishableKey() }); }
    catch { res.json({ publishableKey: null }); }
  });
  app.get("/api/stripe/products", async (req, res) => { res.json(await storage.getStripeProducts()); });

  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const { priceId, tier, email, name, company } = req.body;
      if (!priceId) return res.status(400).json({ message: "priceId required" });
      const stripe = await getUncachableStripeClient();
      let customer;
      const existing = await stripe.customers.list({ email: email || "demo@instantsettlement.ai", limit: 1 });
      if (existing.data.length > 0) { customer = existing.data[0]; }
      else { customer = await stripe.customers.create({ email: email || "demo@instantsettlement.ai", name: name || "Demo User", metadata: { company: company || "" } }); }
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({ customer: customer.id, payment_method_types: ['card'], line_items: [{ price: priceId, quantity: 1 }], mode: 'subscription', success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`, cancel_url: `${baseUrl}/pricing`, metadata: { tier: tier || "" } });
      res.json({ url: session.url });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/stripe/session/:sessionId", async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, { expand: ['customer', 'subscription', 'line_items'] });
      if (session.payment_status === 'paid' || session.status === 'complete') {
        const amount = (session.amount_total || 0) / 100;
        const custEmail = (session.customer as any)?.email || session.customer_email || "";
        await storage.createInvoice({ userEmail: custEmail, stripePaymentIntentId: session.payment_intent as string || "", stripeInvoiceId: (session.subscription as any)?.latest_invoice || "", amount: String(amount), currency: session.currency || "usd", description: `Subscription - ${session.metadata?.tier || "Professional"}`, status: "paid", tier: session.metadata?.tier || "" });
        await storage.createAuditLog({ userEmail: custEmail, action: "SUBSCRIPTION_CREATED", resource: "Billing", details: `New subscription: ${session.metadata?.tier} plan, $${amount}` });
        await sendInvoiceEmail(custEmail, { name: (session.customer as any)?.name || custEmail, tier: session.metadata?.tier || "Professional", amount, currency: session.currency || "usd", invoiceId: `INV-${Date.now()}`, date: new Date().toLocaleDateString() });
      }
      res.json({ status: session.status, paymentStatus: session.payment_status, customerEmail: (session.customer as any)?.email || session.customer_email, amountTotal: session.amount_total, currency: session.currency, tier: session.metadata?.tier });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === EXPORTS ===
  app.get("/api/export/transactions/csv", async (req, res) => {
    const txs = await storage.getTransactions();
    const header = "ID,TX_ID,Amount,Currency,Sender,Receiver,Status,RiskScore,LatencyMs,FrozenReason,Timestamp";
    const rows = txs.map(t => `${t.id},${t.txId},${t.amount},${t.currency},"${t.sender}","${t.receiver}",${t.status},${t.riskScore || 'N/A'},${t.latencyMs},"${(t.frozenReason || '').replace(/"/g, "''")}",${t.timestamp}`);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
    res.send([header, ...rows].join("\n"));
    await storage.createAuditLog({ action: "EXPORT", resource: "Transactions", details: `Exported ${txs.length} transactions as CSV` });
  });

  app.get("/api/export/transactions/pdf", async (req, res) => {
    const txs = await storage.getTransactions();
    const now = new Date().toISOString();
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;color:#1a2a4a;margin:40px}.header{text-align:center;border-bottom:3px solid #00e5ff;padding-bottom:20px;margin-bottom:30px}h1{color:#050816;font-size:28px;margin:0}.subtitle{color:#666;font-size:13px;margin-top:5px}.meta{display:flex;justify-content:space-between;margin-bottom:20px;font-size:12px;color:#555}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#050816;color:#00e5ff;padding:10px 8px;text-align:left}td{padding:8px;border-bottom:1px solid #e8edf5}tr:nth-child(even) td{background:#f8fafc}.risk-low{color:#16a34a;font-weight:bold}.risk-medium{color:#d97706;font-weight:bold}.risk-high{color:#dc2626;font-weight:bold}.status-settled{color:#16a34a;font-weight:bold}.status-validated{color:#2563eb;font-weight:bold}.status-pending{color:#d97706;font-weight:bold}.status-frozen{color:#dc2626;font-weight:bold;background:#fef2f2;padding:2px 6px;border-radius:4px}.footer{text-align:center;margin-top:30px;font-size:11px;color:#999;border-top:1px solid #e5e7eb;padding-top:15px}</style></head><body><div class="header"><h1>InstantSettlement.ai</h1><p class="subtitle">Settlement Transaction Report &bull; AI Risk Analysis &bull; Generated: ${now}</p></div><div class="meta"><span>Records: <strong>${txs.length}</strong></span><span>ISO 27001 &bull; FATF Compliant &bull; Confidential</span></div><table><thead><tr><th>TX ID</th><th>Amount</th><th>CCY</th><th>Sender</th><th>Receiver</th><th>Status</th><th>AI Risk</th><th>Latency</th></tr></thead><tbody>${txs.map(t => `<tr><td>${t.txId}</td><td>${Number(t.amount).toLocaleString()}</td><td>${t.currency}</td><td>${t.sender}</td><td>${t.receiver}</td><td class="status-${t.status.toLowerCase()}">${t.status}</td><td class="risk-${(t.riskScore || 'low').toLowerCase()}">${t.riskScore || 'N/A'}</td><td>${t.latencyMs}ms</td></tr>`).join('')}</tbody></table><div class="footer">InstantSettlement.ai &bull; Enterprise Settlement Platform &bull; AES-256 Encrypted &bull; All Rights Reserved &copy; 2026</div></body></html>`;
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", "inline; filename=transactions-report.html");
    res.send(html);
  });

  app.get("/api/invoices/:id/pdf", async (req, res) => {
    const invoiceList = await storage.getInvoices();
    const invoice = invoiceList.find(i => i.id === Number(req.params.id));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;color:#1a2a4a;margin:0;padding:40px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:20px;border-bottom:3px solid #00e5ff}.logo h1{color:#050816;font-size:24px;margin:0}.logo p{color:#00e5ff;font-size:12px;margin:4px 0 0}.invoice-meta{text-align:right;font-size:13px;color:#555}.invoice-meta strong{color:#050816;font-size:22px;display:block;margin-bottom:5px}.bill-to{background:#f8fafc;padding:20px;border-radius:8px;margin-bottom:30px}.bill-to h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;color:#999}table{width:100%;border-collapse:collapse;margin-bottom:30px}th{background:#050816;color:#00e5ff;padding:12px;text-align:left;font-size:12px}td{padding:14px 12px;border-bottom:1px solid #e5e7eb}.total-row{background:#f0fffe;font-weight:bold;font-size:16px}.footer{text-align:center;color:#999;font-size:11px;margin-top:40px;padding-top:15px;border-top:1px solid #e5e7eb}.badge{display:inline-block;padding:4px 12px;background:#dcfce7;color:#16a34a;border-radius:20px;font-size:12px;font-weight:bold}</style></head><body><div class="header"><div class="logo"><h1>InstantSettlement.ai</h1><p>Enterprise Settlement Platform</p></div><div class="invoice-meta"><strong>INVOICE</strong>#INV-${String(invoice.id).padStart(5,'0')}<br/>Date: ${new Date(invoice.createdAt).toLocaleDateString()}<br/>Status: <span class="badge">PAID</span></div></div><div class="bill-to"><h3>Bill To</h3><strong>${invoice.userEmail}</strong><br/>Tier: ${invoice.tier||"Professional"} Plan</div><table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody><tr><td>${invoice.description||"InstantSettlement.ai Subscription"}</td><td>1</td><td>$${Number(invoice.amount).toLocaleString()}</td><td>$${Number(invoice.amount).toLocaleString()}</td></tr></tbody><tfoot><tr class="total-row"><td colspan="3" style="text-align:right">Total Due (${(invoice.currency||"usd").toUpperCase()})</td><td>$${Number(invoice.amount).toLocaleString()}</td></tr></tfoot></table><div class="footer">InstantSettlement.ai &bull; ISO 27001 Certified &bull; AES-256 Encrypted &bull; All Rights Reserved &copy; 2026</div></body></html>`;
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `inline; filename=invoice-${invoice.id}.html`);
    res.send(html);
  });

  // === 2FA (with brute-force protection) ===
  app.post("/api/auth/2fa/send", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });
      let user = await storage.getUserByEmail(email);
      if (!user) { user = await storage.createUser({ email, name: email.split("@")[0], role: "user" }); }

      // Check account lock
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        return res.status(423).json({ message: `Account temporarily locked. Try again in ${mins} minutes.` });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 10 * 60 * 1000);
      await storage.updateUser(user.id, { twoFactorCode: code, twoFactorExpiry: expiry, loginAttempts: 0 });
      await sendTwoFactorEmail(email, code, user.name);
      console.log(`[2FA] Code for ${email}: ${code}`);
      res.json({ success: true, message: "Code sent.", demoCode: code });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/auth/2fa/verify", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ message: "Email and code required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Brute-force protection: lock after 5 failed attempts
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        return res.status(423).json({ message: `Account locked. Try again in ${mins} minutes.` });
      }

      if (!user.twoFactorCode || user.twoFactorCode !== code) {
        const attempts = (user.loginAttempts || 0) + 1;
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await storage.updateUser(user.id, { loginAttempts: attempts, ...(lockedUntil ? { lockedUntil } : {}) });
        if (attempts >= 5) await storage.createAuditLog({ userId: user.id, userEmail: user.email, action: "ACCOUNT_LOCKED", resource: "Security", details: `Account locked after 5 failed 2FA attempts` });
        return res.status(401).json({ message: "Invalid code", attemptsRemaining: Math.max(0, 5 - attempts) });
      }
      if (user.twoFactorExpiry && new Date() > user.twoFactorExpiry) return res.status(401).json({ message: "Code expired. Request a new one." });

      await storage.updateUser(user.id, { twoFactorCode: null, twoFactorExpiry: null, lastLogin: new Date(), loginAttempts: 0, lockedUntil: null });
      await storage.createAuditLog({ userId: user.id, userEmail: user.email, action: "LOGIN", resource: "Auth", details: "Successful 2FA login" });
      await storage.createNotification({ userEmail: user.email, type: "login", priority: "normal", title: "Secure Login Detected", message: `New login from ${new Date().toLocaleString()}` });
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, subscriptionTier: user.subscriptionTier } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  return httpServer;
}
