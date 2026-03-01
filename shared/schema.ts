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
  status: text("status").notNull(), // 'Pending', 'Validated', 'Settled'
  latencyMs: numeric("latency_ms").notNull(),
  riskScore: text("risk_score"), // 'Low', 'Medium', 'High'
  riskFactors: text("risk_factors"), // JSON array stored as text
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
  fullName: text("full_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  nationality: text("nationality").notNull(),
  documentType: text("document_type").notNull(), // 'passport', 'national_id', 'drivers_license'
  documentNumber: text("document_number").notNull(),
  companyName: text("company_name"),
  companyRegNumber: text("company_reg_number"),
  regulatoryBody: text("regulatory_body"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  reviewedBy: text("reviewed_by"),
  reviewNotes: text("review_notes"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userEmail: text("user_email"),
  type: text("type").notNull(), // 'settlement_alert', 'high_risk', 'kyc_update', 'login'
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  priority: text("priority").default("normal"), // 'normal', 'high', 'critical'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, timestamp: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertKycSchema = createInsertSchema(kycSubmissions).omit({ id: true, submittedAt: true, reviewedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

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
