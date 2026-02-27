import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { leads } from "@shared/schema";
import { db } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Create a realistic seed data function
  async function seedDatabase() {
    try {
      const existing = await storage.getTransactions();
      if (existing.length === 0) {
        const mockTxs = [
          { txId: "SET-1001", amount: "5000000.00", currency: "USD", sender: "JPMorgan Chase", receiver: "Goldman Sachs", status: "Settled", latencyMs: "0.85" },
          { txId: "SET-1002", amount: "12500000.00", currency: "EUR", sender: "Deutsche Bank", receiver: "BNP Paribas", status: "Validated", latencyMs: "1.02" },
          { txId: "SET-1003", amount: "750000.00", currency: "GBP", sender: "Barclays", receiver: "HSBC", status: "Pending", latencyMs: "0.95" },
          { txId: "SET-1004", amount: "22000000.00", currency: "JPY", sender: "Bank of Tokyo", receiver: "Nomura", status: "Settled", latencyMs: "0.78" },
          { txId: "SET-1005", amount: "340000 Swiss Francs", currency: "CHF", sender: "UBS", receiver: "Credit Suisse", status: "Validated", latencyMs: "0.91" },
        ];
        for (const tx of mockTxs) {
          await storage.createTransaction(tx);
        }
        console.log("Database seeded with initial transactions");
      }
    } catch (e) {
      console.error("Failed to seed database:", e);
    }
  }
  
  // Call seed at startup
  seedDatabase();

  app.get(api.transactions.list.path, async (req, res) => {
    const txs = await storage.getTransactions();
    res.json(txs);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const tx = await storage.createTransaction(input);
      res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.transactions.updateStatus.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.transactions.updateStatus.input.parse(req.body);
      const updated = await storage.updateTransactionStatus(id, input.status);
      if (!updated) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.metrics.get.path, async (req, res) => {
    // Generate some impressive looking mock metrics
    res.json({
      avgLatencyMs: 0.84,
      throughputVolume: 125000000000, // 125B
      totalTransactions: 1450280
    });
  });

  app.post(api.leads.create.path, async (req, res) => {
    try {
      const input = api.leads.create.input.parse(req.body);
      await db.insert(leads).values(input);
      res.status(201).json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
