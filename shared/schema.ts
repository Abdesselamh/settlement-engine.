import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
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

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, timestamp: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
