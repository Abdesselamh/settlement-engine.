import { db } from "./db";
import {
  transactions, users, auditLogs, invoices, kycSubmissions, notifications,
  type InsertTransaction, type Transaction,
  type InsertUser, type User,
  type InsertAuditLog, type AuditLog,
  type InsertInvoice, type Invoice,
  type InsertKyc, type KycSubmission,
  type InsertNotification, type Notification,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Transactions
  getTransactions(): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined>;
  updateTransactionRisk(id: number, riskScore: string, riskFactors: string): Promise<Transaction | undefined>;
  // Users
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  // Audit Logs
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoicesByUser(userId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  // KYC
  getKycSubmissions(): Promise<KycSubmission[]>;
  getKycByEmail(email: string): Promise<KycSubmission | undefined>;
  createKycSubmission(kyc: InsertKyc): Promise<KycSubmission>;
  updateKycSubmission(id: number, data: Partial<KycSubmission>): Promise<KycSubmission | undefined>;
  // Notifications
  getNotifications(userEmail?: string): Promise<Notification[]>;
  createNotification(n: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  // Stripe
  getStripeProducts(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.timestamp));
  }

  async createTransaction(tx: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(tx).returning();
    return created;
  }

  async updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined> {
    const [updated] = await db.update(transactions).set({ status }).where(eq(transactions.id, id)).returning();
    return updated;
  }

  async updateTransactionRisk(id: number, riskScore: string, riskFactors: string): Promise<Transaction | undefined> {
    const [updated] = await db.update(transactions).set({ riskScore, riskFactors }).where(eq(transactions.id, id)).returning();
    return updated;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async getAuditLogsByUser(userId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByUser(userId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async getKycSubmissions(): Promise<KycSubmission[]> {
    return await db.select().from(kycSubmissions).orderBy(desc(kycSubmissions.submittedAt));
  }

  async getKycByEmail(email: string): Promise<KycSubmission | undefined> {
    const [kyc] = await db.select().from(kycSubmissions).where(eq(kycSubmissions.userEmail, email));
    return kyc;
  }

  async createKycSubmission(kyc: InsertKyc): Promise<KycSubmission> {
    const [created] = await db.insert(kycSubmissions).values(kyc).returning();
    return created;
  }

  async updateKycSubmission(id: number, data: Partial<KycSubmission>): Promise<KycSubmission | undefined> {
    const [updated] = await db.update(kycSubmissions).set(data).where(eq(kycSubmissions.id, id)).returning();
    return updated;
  }

  async getNotifications(userEmail?: string): Promise<Notification[]> {
    if (userEmail) {
      return await db.select().from(notifications)
        .where(eq(notifications.userEmail, userEmail))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    }
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
  }

  async createNotification(n: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(n).returning();
    return created;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async getStripeProducts(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id, p.name as product_name,
          p.description as product_description, p.active as product_active,
          p.metadata as product_metadata, pr.id as price_id,
          pr.unit_amount, pr.currency, pr.recurring, pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true ORDER BY pr.unit_amount ASC
      `);
      return result.rows as any[];
    } catch { return []; }
  }
}

export const storage = new DatabaseStorage();
