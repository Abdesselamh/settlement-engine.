import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type TransactionInput } from "@shared/routes";

// ============================================
// TRANSACTIONS
// ============================================

export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
    // Poll frequently to make the dashboard feel "alive"
    refetchInterval: 1000, 
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TransactionInput) => {
      const validated = api.transactions.create.input.parse(data);
      const res = await fetch(api.transactions.create.path, {
        method: api.transactions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.transactions.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create transaction");
      }
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.metrics.get.path] });
    },
  });
}

export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.transactions.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.transactions.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to update transaction status");
      }
      return api.transactions.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
    },
  });
}

// ============================================
// METRICS
// ============================================

export function useMetrics() {
  return useQuery({
    queryKey: [api.metrics.get.path],
    queryFn: async () => {
      const res = await fetch(api.metrics.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return api.metrics.get.responses[200].parse(await res.json());
    },
    refetchInterval: 2000,
  });
}
