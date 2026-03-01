import { pgTable, text, serial, numeric, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  txId: text("tx_id").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull(),
  sender: text("sender").notNull(),
  receiver: text("receiver").notNull(),
  status: text("status").notNull(), // 'Pending', 'Validated', 'Settled', 'Frozen'
  latencyMs: numeric("latency_ms").notNull(),
  riskScore: text("risk_score"), // 'Low', 'Medium', 'High'
  riskFactors: text("risk_factors"), // JSON array as text
  frozenReason: text("frozen_reason"),
  webhookDelivered: boolean("webhook_delivered").default(false),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  company: text("company"),
  role: text("role").notNull().default("user"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorCode: text("two_factor_code"),
  twoFactorExpiry: timestamp("two_factor_expiry"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("none"),
  subscriptionTier: text("subscription_tier"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email"),
  action: text("action").notNull(),
  resource: text("resource"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("usd"),
  description: text("description"),
  status: text("status").default("paid"),
  tier: text("tier"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kycSubmissions = pgTable("kyc_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email").notNull(),
  fullName: text("full_name").notNull(),           // AES-256 encrypted
  dateOfBirth: text("date_of_birth").notNull(),    // AES-256 encrypted
  nationality: text("nationality").notNull(),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number").notNull(), // AES-256 encrypted
  companyName: text("company_name"),
  companyRegNumber: text("company_reg_number"),
  regulatoryBody: text("regulatory_body"),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewNotes: text("review_notes"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  priority: text("priority").default("normal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === NEW TABLES ===

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email").notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(), // SHA-256 hash of actual key
  keyPrefix: text("key_prefix").notNull(),       // First 12 chars for display (isk_live_xxxx)
  permissions: text("permissions").default("read"), // 'read', 'write', 'admin'
  active: boolean("active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  events: text("events").notNull().default("settlement.completed"), // comma-separated
  active: boolean("active").default(true),
  secret: text("secret").notNull(), // HMAC signing secret
  lastTriggered: timestamp("last_triggered"),
  deliveryCount: integer("delivery_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhook_id").notNull(),
  event: text("event").notNull(),
  payload: text("payload").notNull(),
  statusCode: integer("status_code"),
  success: boolean("success").default(false),
  responseBody: text("response_body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull(),
  rate: numeric("rate").notNull(),
  source: text("source").default("ECB_PLACEHOLDER"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === INSERT SCHEMAS ===
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, timestamp: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertKycSchema = createInsertSchema(kycSubmissions).omit({ id: true, submittedAt: true, reviewedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true, lastUsed: true });
export const insertWebhookSchema = createInsertSchema(webhooks).omit({ id: true, createdAt: true, lastTriggered: true, deliveryCount: true });
export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({ id: true, updatedAt: true });

// === TYPES ===
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertKyc = z.infer<typeof insertKycSchema>;
export type KycSubmission = typeof kycSubmissions.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
