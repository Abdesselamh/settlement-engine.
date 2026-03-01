import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { leads } from "@shared/schema";
import { db } from "./db";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { assessRisk } from "./riskEngine";
import { sendTwoFactorEmail, sendSettlementAlertEmail, sendHighRiskAlertToAdmin, sendInvoiceEmail } from "./email";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  async function seedDatabase() {
    try {
      const existing = await storage.getTransactions();
      if (existing.length === 0) {
        const mockTxs = [
          { txId: "SET-1001", amount: "5000000.00", currency: "USD", sender: "JPMorgan Chase", receiver: "Goldman Sachs", status: "Settled", latencyMs: "0.85", riskScore: "Low", riskFactors: '["Standard institutional counterparties","Transaction within normal parameters"]' },
          { txId: "SET-1002", amount: "12500000.00", currency: "EUR", sender: "Deutsche Bank", receiver: "BNP Paribas", status: "Validated", latencyMs: "1.02", riskScore: "Medium", riskFactors: '["Large transaction over $20M","Off-hours transaction pattern"]' },
          { txId: "SET-1003", amount: "750000.00", currency: "GBP", sender: "Barclays", receiver: "HSBC", status: "Pending", latencyMs: "0.95", riskScore: "Low", riskFactors: '["Standard institutional counterparties"]' },
          { txId: "SET-1004", amount: "22000000.00", currency: "JPY", sender: "Bank of Tokyo", receiver: "Nomura", status: "Settled", latencyMs: "0.78", riskScore: "Medium", riskFactors: '["Large transaction over $20M"]' },
          { txId: "SET-1005", amount: "750000000.00", currency: "CHF", sender: "UBS", receiver: "Credit Suisse", status: "Validated", latencyMs: "1.8", riskScore: "High", riskFactors: '["Transaction exceeds $50M threshold","Abnormal settlement latency detected"]' },
        ];
        for (const tx of mockTxs) await storage.createTransaction(tx);

        const adminExists = await storage.getUserByEmail("admin@instantsettlement.ai");
        if (!adminExists) {
          await storage.createUser({ email: "admin@instantsettlement.ai", name: "Admin User", company: "InstantSettlement.ai", role: "admin", subscriptionStatus: "active", subscriptionTier: "professional" });
        }

        await storage.createAuditLog({ userEmail: "admin@instantsettlement.ai", action: "LOGIN", resource: "Auth", details: "Admin login successful", ipAddress: "10.0.0.1" });
        await storage.createAuditLog({ userEmail: "trader@jpmorgan.com", action: "EXPORT", resource: "Transactions", details: "Exported 500 transaction records as CSV", ipAddress: "10.0.0.5" });
        await storage.createAuditLog({ userEmail: "admin@instantsettlement.ai", action: "SUBSCRIPTION_UPGRADE", resource: "Billing", details: "Upgraded plan from Essential to Professional", ipAddress: "10.0.0.1" });

        await storage.createNotification({ userEmail: "admin@instantsettlement.ai", type: "high_risk", title: "High Risk Transaction Detected", message: "Transaction SET-1005 flagged with HIGH risk score. Immediate review required.", priority: "critical" });
        await storage.createNotification({ userEmail: "admin@instantsettlement.ai", type: "kyc_update", title: "KYC Submission Received", message: "New KYC document submitted for review.", priority: "high" });

        console.log("Database seeded");
      }
    } catch (e) { console.error("Failed to seed database:", e); }
  }

  seedDatabase();

  // === TRANSACTIONS ===
  app.get(api.transactions.list.path, async (req, res) => {
    const txs = await storage.getTransactions();
    res.json(txs);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      // Auto-assess risk on creation
      const risk = assessRisk(input as any);
      const tx = await storage.createTransaction({
        ...input,
        riskScore: risk.score,
        riskFactors: JSON.stringify(risk.factors),
      });

      // Send high-risk alert to admin
      if (risk.score === 'High') {
        const admin = await storage.getUserByEmail("admin@instantsettlement.ai");
        if (admin) {
          await sendHighRiskAlertToAdmin(admin.email, {
            txId: tx.txId, amount: tx.amount, currency: tx.currency,
            sender: tx.sender, receiver: tx.receiver,
            riskScore: risk.score, riskFactors: risk.factors,
          });
          await storage.createNotification({
            userEmail: admin.email, type: "high_risk", priority: "critical",
            title: `High Risk: ${tx.txId}`,
            message: `Transaction ${tx.txId} (${tx.amount} ${tx.currency}) flagged HIGH risk. ${risk.factors[0]}`,
          });
        }
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
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // === AI RISK ASSESSMENT ===
  app.post("/api/risk/assess", async (req, res) => {
    try {
      const { amount, currency, sender, receiver, latencyMs } = req.body;
      if (!amount || !currency || !sender || !receiver) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const result = assessRisk({ amount: String(amount), currency, sender, receiver, latencyMs: String(latencyMs || 0.85) });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/risk/transaction/:id", async (req, res) => {
    try {
      const txs = await storage.getTransactions();
      const tx = txs.find(t => t.id === Number(req.params.id));
      if (!tx) return res.status(404).json({ message: "Not found" });
      const risk = assessRisk({ amount: tx.amount, currency: tx.currency, sender: tx.sender, receiver: tx.receiver, latencyMs: tx.latencyMs });
      // Persist the risk score if not already set
      if (!tx.riskScore) {
        await storage.updateTransactionRisk(tx.id, risk.score, JSON.stringify(risk.factors));
      }
      res.json({ tx, riskAssessment: risk });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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
    await storage.createAuditLog({ userEmail: "admin@instantsettlement.ai", action: "USER_UPDATE", resource: "Users", details: `Updated user #${id}: ${JSON.stringify(req.body)}` });
    res.json(updated);
  });

  // === ADMIN: AUDIT LOGS ===
  app.get("/api/admin/audit-logs", async (req, res) => {
    const logs = await storage.getAuditLogs(200);
    res.json(logs);
  });

  app.post("/api/audit-logs", async (req, res) => {
    const log = await storage.createAuditLog(req.body);
    res.status(201).json(log);
  });

  // === ADMIN: INVOICES ===
  app.get("/api/admin/invoices", async (req, res) => {
    const allInvoices = await storage.getInvoices();
    res.json(allInvoices);
  });

  // === ADMIN: STATS ===
  app.get("/api/admin/stats", async (req, res) => {
    const allUsers = await storage.getUsers();
    const txs = await storage.getTransactions();
    const invoiceList = await storage.getInvoices();
    const kycList = await storage.getKycSubmissions();
    const totalRevenue = invoiceList.reduce((acc, inv) => acc + Number(inv.amount), 0);
    const highRiskTxs = txs.filter(t => t.riskScore === 'High').length;
    const pendingKyc = kycList.filter(k => k.status === 'pending').length;
    res.json({
      totalUsers: allUsers.length,
      activeSubscriptions: allUsers.filter(u => u.subscriptionStatus === "active").length,
      totalTransactions: txs.length,
      totalRevenue,
      highRiskTxs,
      pendingKyc,
    });
  });

  // === KYC ROUTES ===
  app.post("/api/kyc/submit", async (req, res) => {
    try {
      const { userEmail, fullName, dateOfBirth, nationality, documentType, documentNumber, companyName, companyRegNumber, regulatoryBody } = req.body;
      if (!userEmail || !fullName || !dateOfBirth || !nationality || !documentType || !documentNumber) {
        return res.status(400).json({ message: "Missing required KYC fields" });
      }
      const existing = await storage.getKycByEmail(userEmail);
      if (existing && existing.status === 'pending') {
        return res.status(409).json({ message: "A KYC submission is already pending review" });
      }
      const kyc = await storage.createKycSubmission({ userEmail, fullName, dateOfBirth, nationality, documentType, documentNumber, companyName, companyRegNumber, regulatoryBody, status: "pending" });
      await storage.createAuditLog({ userEmail, action: "KYC_SUBMITTED", resource: "Compliance", details: `KYC submission #${kyc.id} received for ${fullName}` });
      await storage.createNotification({ userEmail: "admin@instantsettlement.ai", type: "kyc_update", priority: "high", title: "New KYC Submission", message: `${fullName} (${userEmail}) submitted KYC documents for review.` });
      res.status(201).json(kyc);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/kyc/status/:email", async (req, res) => {
    const kyc = await storage.getKycByEmail(req.params.email);
    if (!kyc) return res.json({ status: "not_submitted" });
    res.json(kyc);
  });

  app.get("/api/admin/kyc", async (req, res) => {
    const kycs = await storage.getKycSubmissions();
    res.json(kycs);
  });

  app.patch("/api/admin/kyc/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, reviewNotes, reviewedBy } = req.body;
      if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      const updated = await storage.updateKycSubmission(id, { status, reviewNotes, reviewedBy, reviewedAt: new Date() });
      if (!updated) return res.status(404).json({ message: "KYC submission not found" });
      await storage.createAuditLog({ userEmail: reviewedBy || "admin@instantsettlement.ai", action: `KYC_${status.toUpperCase()}`, resource: "Compliance", details: `KYC #${id} ${status}: ${reviewNotes || 'No notes'}` });
      if (updated.userEmail) {
        await storage.createNotification({ userEmail: updated.userEmail, type: "kyc_update", priority: status === 'approved' ? "normal" : "high", title: `KYC ${status === 'approved' ? 'Approved' : 'Rejected'}`, message: status === 'approved' ? 'Your identity verification has been approved. Full platform access enabled.' : `Your KYC submission was rejected. Reason: ${reviewNotes || 'See admin for details.'}` });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === NOTIFICATIONS ===
  app.get("/api/notifications", async (req, res) => {
    const email = req.query.email as string | undefined;
    const notifs = await storage.getNotifications(email);
    res.json(notifs);
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    await storage.markNotificationRead(Number(req.params.id));
    res.json({ success: true });
  });

  // === SEND SETTLEMENT NOTIFICATION ===
  app.post("/api/notify/settlement", async (req, res) => {
    try {
      const { userEmail, txId, amount, currency, status, sender, receiver, riskScore } = req.body;
      await sendSettlementAlertEmail(userEmail, { txId, amount, currency, status, sender, receiver, riskScore });
      await storage.createNotification({ userEmail, type: "settlement_alert", priority: riskScore === 'High' ? "critical" : "normal", title: `Settlement ${status}: ${txId}`, message: `${amount} ${currency} — ${sender} → ${receiver}${riskScore ? ` | Risk: ${riskScore}` : ''}` });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === STRIPE: PUBLISHABLE KEY ===
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try { res.json({ publishableKey: await getStripePublishableKey() }); }
    catch { res.json({ publishableKey: null }); }
  });

  // === STRIPE: PRODUCTS ===
  app.get("/api/stripe/products", async (req, res) => {
    res.json(await storage.getStripeProducts());
  });

  // === STRIPE: CREATE CHECKOUT SESSION ===
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
      const session = await stripe.checkout.sessions.create({
        customer: customer.id, payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }], mode: 'subscription',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
        cancel_url: `${baseUrl}/pricing`, metadata: { tier: tier || "" }
      });
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  // === STRIPE: CHECKOUT SUCCESS ===
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
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === EXPORT: CSV ===
  app.get("/api/export/transactions/csv", async (req, res) => {
    const txs = await storage.getTransactions();
    const header = "ID,TX_ID,Amount,Currency,Sender,Receiver,Status,RiskScore,LatencyMs,Timestamp";
    const rows = txs.map(t => `${t.id},${t.txId},${t.amount},${t.currency},"${t.sender}","${t.receiver}",${t.status},${t.riskScore || 'N/A'},${t.latencyMs},${t.timestamp}`);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
    res.send([header, ...rows].join("\n"));
    await storage.createAuditLog({ action: "EXPORT", resource: "Transactions", details: `Exported ${txs.length} transactions as CSV` });
  });

  // === EXPORT: PDF ===
  app.get("/api/export/transactions/pdf", async (req, res) => {
    const txs = await storage.getTransactions();
    const now = new Date().toISOString();
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;color:#1a2a4a;margin:40px}.header{text-align:center;border-bottom:3px solid #00e5ff;padding-bottom:20px;margin-bottom:30px}h1{color:#050816;font-size:28px;margin:0}.subtitle{color:#666;font-size:13px;margin-top:5px}.meta{display:flex;justify-content:space-between;margin-bottom:20px;font-size:12px;color:#555}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#050816;color:#00e5ff;padding:10px 8px;text-align:left}td{padding:8px;border-bottom:1px solid #e8edf5}tr:nth-child(even) td{background:#f8fafc}.risk-low{color:#16a34a;font-weight:bold}.risk-medium{color:#d97706;font-weight:bold}.risk-high{color:#dc2626;font-weight:bold}.status-settled{color:#16a34a;font-weight:bold}.status-validated{color:#2563eb;font-weight:bold}.status-pending{color:#d97706;font-weight:bold}.footer{text-align:center;margin-top:30px;font-size:11px;color:#999;border-top:1px solid #e5e7eb;padding-top:15px}</style></head><body><div class="header"><h1>InstantSettlement.ai</h1><p class="subtitle">Settlement Transaction Report &bull; AI Risk Analysis &bull; Generated: ${now}</p></div><div class="meta"><span>Records: <strong>${txs.length}</strong></span><span>ISO 27001 &bull; Confidential</span></div><table><thead><tr><th>TX ID</th><th>Amount</th><th>CCY</th><th>Sender</th><th>Receiver</th><th>Status</th><th>AI Risk</th><th>Latency</th></tr></thead><tbody>${txs.map(t => `<tr><td>${t.txId}</td><td>${Number(t.amount).toLocaleString()}</td><td>${t.currency}</td><td>${t.sender}</td><td>${t.receiver}</td><td class="status-${t.status.toLowerCase()}">${t.status}</td><td class="risk-${(t.riskScore || 'low').toLowerCase()}">${t.riskScore || 'N/A'}</td><td>${t.latencyMs}ms</td></tr>`).join('')}</tbody></table><div class="footer">InstantSettlement.ai &bull; Enterprise Settlement Platform &bull; All Rights Reserved &copy; 2026</div></body></html>`;
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", "inline; filename=transactions-report.html");
    res.send(html);
  });

  // === INVOICE PDF ===
  app.get("/api/invoices/:id/pdf", async (req, res) => {
    const invoiceList = await storage.getInvoices();
    const invoice = invoiceList.find(i => i.id === Number(req.params.id));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;color:#1a2a4a;margin:0;padding:40px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:20px;border-bottom:3px solid #00e5ff}.logo h1{color:#050816;font-size:24px;margin:0}.logo p{color:#00e5ff;font-size:12px;margin:4px 0 0}.invoice-meta{text-align:right;font-size:13px;color:#555}.invoice-meta strong{color:#050816;font-size:22px;display:block;margin-bottom:5px}.bill-to{background:#f8fafc;padding:20px;border-radius:8px;margin-bottom:30px}.bill-to h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;color:#999}table{width:100%;border-collapse:collapse;margin-bottom:30px}th{background:#050816;color:#00e5ff;padding:12px;text-align:left;font-size:12px}td{padding:14px 12px;border-bottom:1px solid #e5e7eb}.total-row{background:#f0fffe;font-weight:bold;font-size:16px}.footer{text-align:center;color:#999;font-size:11px;margin-top:40px;padding-top:15px;border-top:1px solid #e5e7eb}.badge{display:inline-block;padding:4px 12px;background:#dcfce7;color:#16a34a;border-radius:20px;font-size:12px;font-weight:bold}</style></head><body><div class="header"><div class="logo"><h1>InstantSettlement.ai</h1><p>Enterprise Settlement Platform</p></div><div class="invoice-meta"><strong>INVOICE</strong>#INV-${String(invoice.id).padStart(5,'0')}<br/>Date: ${new Date(invoice.createdAt).toLocaleDateString()}<br/>Status: <span class="badge">PAID</span></div></div><div class="bill-to"><h3>Bill To</h3><strong>${invoice.userEmail}</strong><br/>Tier: ${invoice.tier||"Professional"} Plan</div><table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody><tr><td>${invoice.description||"InstantSettlement.ai Subscription"}</td><td>1</td><td>$${Number(invoice.amount).toLocaleString()}</td><td>$${Number(invoice.amount).toLocaleString()}</td></tr></tbody><tfoot><tr class="total-row"><td colspan="3" style="text-align:right">Total Due (${(invoice.currency||"usd").toUpperCase()})</td><td>$${Number(invoice.amount).toLocaleString()}</td></tr></tfoot></table><div class="footer">InstantSettlement.ai &bull; ISO 27001 Certified &bull; All Rights Reserved &copy; 2026</div></body></html>`;
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", `inline; filename=invoice-${invoice.id}.html`);
    res.send(html);
  });

  // === 2FA: SEND CODE ===
  app.post("/api/auth/2fa/send", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });
      let user = await storage.getUserByEmail(email);
      if (!user) { user = await storage.createUser({ email, name: email.split("@")[0], role: "user" }); }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 10 * 60 * 1000);
      await storage.updateUser(user.id, { twoFactorCode: code, twoFactorExpiry: expiry });
      await sendTwoFactorEmail(email, code, user.name);
      console.log(`[2FA] Code for ${email}: ${code}`);
      res.json({ success: true, message: "Code sent.", demoCode: code });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // === 2FA: VERIFY CODE ===
  app.post("/api/auth/2fa/verify", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ message: "Email and code required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.twoFactorCode || user.twoFactorCode !== code) return res.status(401).json({ message: "Invalid code" });
      if (user.twoFactorExpiry && new Date() > user.twoFactorExpiry) return res.status(401).json({ message: "Code expired" });
      await storage.updateUser(user.id, { twoFactorCode: null, twoFactorExpiry: null, lastLogin: new Date() });
      await storage.createAuditLog({ userId: user.id, userEmail: user.email, action: "LOGIN", resource: "Auth", details: "Successful 2FA login" });
      await storage.createNotification({ userEmail: user.email, type: "login", priority: "normal", title: "Secure Login Detected", message: `New login to your account from ${new Date().toLocaleString()}` });
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, subscriptionTier: user.subscriptionTier } });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  return httpServer;
}
