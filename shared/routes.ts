import { z } from 'zod';
import { insertTransactionSchema, transactions, insertLeadSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions' as const,
      input: insertTransactionSchema,
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/transactions/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  metrics: {
    get: {
      method: 'GET' as const,
      path: '/api/metrics' as const,
      responses: {
        200: z.object({
          avgLatencyMs: z.number(),
          throughputVolume: z.number(),
          totalTransactions: z.number()
        })
      }
    }
  },
  leads: {
    create: {
      method: 'POST' as const,
      path: '/api/leads' as const,
      input: insertLeadSchema,
      responses: {
        201: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type TransactionInput = z.infer<typeof api.transactions.create.input>;
export type TransactionResponse = z.infer<typeof api.transactions.create.responses[201]>;
export type TransactionsListResponse = z.infer<typeof api.transactions.list.responses[200]>;
export type MetricsResponse = z.infer<typeof api.metrics.get.responses[200]>;
export type LeadInput = z.infer<typeof api.leads.create.input>;
