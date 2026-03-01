import { db } from "./db";
import {
  transactions,
  type InsertTransaction,
  type Transaction,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getTransactions(): Promise<Transaction[]>;
  createTransaction(tx: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined>;
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
    const [updated] = await db.update(transactions)
      .set({ status })
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();