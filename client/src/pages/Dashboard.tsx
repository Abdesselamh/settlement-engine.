import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { 
  ArrowLeft, ArrowRight, Play, Activity, Clock, Zap, 
  CheckCircle2, AlertCircle, Loader2, Download, FileText, BarChart3, ShieldAlert
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from "recharts";
import { 
  useTransactions, 
  useCreateTransaction, 
  useUpdateTransactionStatus,
  useMetrics 
} from "@/hooks/use-settlement";
import { RiskBadge } from "@/components/RiskBadge";

// Helper to format currency
const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
};

export default function Dashboard() {
  const [isSimulating, setIsSimulating] = useState(false);
  
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: metrics, isLoading: metricsLoading } = useMetrics();
  
  const createTx = useCreateTransaction();
  const updateStatus = useUpdateTransactionStatus();

  // --------------------------------------------------------------------------
  // SIMULATION LOGIC:
  // Randomly creates a new transaction every 3s if simulation is active
  // Then orchestrates its status update to 'Validated' -> 'Settled'
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(async () => {
      // 1. Create Pending Transaction
      const banks = ["JPM", "GS", "MS", "CITI", "BofA", "BARC"];
      const sender = banks[Math.floor(Math.random() * banks.length)];
      let receiver = banks[Math.floor(Math.random() * banks.length)];
      while(receiver === sender) {
        receiver = banks[Math.floor(Math.random() * banks.length)];
      }
      
      const amount = (Math.random() * 10000000 + 100000).toFixed(2);
      // Realistic sub-millisecond latencies
      const latencyMs = (Math.random() * 0.9 + 0.1).toFixed(2); 
      
      try {
        const newTx = await createTx.mutateAsync({
          txId: `TX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          amount,
          currency: "USD",
          sender,
          receiver,
          status: "Pending",
          latencyMs,
        });

        // 2. Wait 800ms, set to Validated
        setTimeout(async () => {
          await updateStatus.mutateAsync({ id: newTx.id, status: "Validated" });
          
          // 3. Wait 400ms, set to Settled
          setTimeout(async () => {
            await updateStatus.mutateAsync({ id: newTx.id, status: "Settled" });
          }, 400);

        }, 800);

      } catch (err) {
        console.error("Simulation error", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating]);


  // Prepare chart data from transactions
  // We'll take the last 20 settled transactions to show charts
  const settledTxs = transactions.filter(t => t.status === "Settled").slice(-20).reverse();
  const chartData = settledTxs.map(t => ({
    name: t.txId.split('-')[1],
    latency: parseFloat(t.latencyMs.toString()),
    amount: parseFloat(t.amount.toString()),
  }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Nav */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-bold">Command Center</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-medium bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              System Operational
            </div>

            {/* Export Buttons */}
            <a
              href="/api/export/transactions/csv"
              download
              data-testid="link-export-csv"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </a>
            <a
              href="/api/export/transactions/pdf"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-export-pdf"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all"
            >
              <FileText className="w-3.5 h-3.5" /> PDF Report
            </a>
            
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              data-testid="button-simulate"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isSimulating 
                  ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20" 
                  : "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_25px_rgba(0,229,255,0.4)]"
              }`}
            >
              {isSimulating ? "Stop Simulation" : (
                <>
                  <Play className="w-4 h-4" />
                  Run Live Simulation
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Metrics & Charts */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel rounded-xl p-5 border-t border-t-white/10">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Throughput</p>
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold text-white">
                {metricsLoading ? "..." : formatCurrency(metrics?.throughputVolume || 0)}
              </p>
              <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                <ArrowLeft className="w-3 h-3 rotate-135" /> +12.5% today
              </p>
            </div>
            
            <div className="glass-panel rounded-xl p-5 border-t border-t-white/10">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Latency (ms)</p>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold text-white flex items-end gap-2">
                {metricsLoading ? "..." : (metrics?.avgLatencyMs || 0).toFixed(2)}
                <span className="text-base text-muted-foreground mb-1">ms</span>
              </p>
              <p className="text-xs text-green-400 mt-2">Well below 1.0ms SLA</p>
            </div>

            <div className="glass-panel rounded-xl p-5 border-t border-t-white/10">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-muted-foreground">Settled Transactions</p>
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold text-white">
                {metricsLoading ? "..." : (metrics?.totalTransactions || 0).toLocaleString()}
              </p>
              <p className="text-xs text-green-400 mt-2">100% success rate</p>
            </div>
          </div>

          {/* Charts Area */}
          <div className="glass-panel rounded-xl p-6 flex-1 min-h-[400px]">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Real-time Performance Telemetry
            </h3>
            
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                <p>Run simulation to generate telemetry data</p>
              </div>
            ) : (
              <div className="space-y-8 h-[calc(100%-3rem)] flex flex-col">
                {/* Latency Chart */}
                <div className="flex-1 min-h-[200px]">
                  <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Settlement Latency (ms)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 'dataMax + 0.2']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#050816', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                      />
                      <Area type="monotone" dataKey="latency" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Volume Chart */}
                <div className="flex-1 min-h-[150px]">
                  <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Liquidity Throughput ($)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis hide />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val/1000000).toFixed(0)}M`} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: '#050816', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Feed */}
        <div className="lg:col-span-4 glass-panel rounded-xl flex flex-col overflow-hidden max-h-[850px]">
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live Settlement Feed
            </h3>
            <span className="text-xs text-muted-foreground bg-black/30 px-2 py-1 rounded">T+0 Active</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
            {txLoading && transactions.length === 0 ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center text-muted-foreground mt-10">
                <p>No transactions yet.</p>
                <p className="text-sm mt-1">Start simulation to see data.</p>
              </div>
            ) : (
              <AnimatePresence>
                {/* Take the first 50 to prevent DOM overload, assuming sorted by newest first */}
                {transactions.slice(0, 50).map((tx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 rounded-lg bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-mono text-xs text-muted-foreground">
                        {tx.txId}
                      </div>
                      <StatusBadge status={tx.status} />
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-lg font-bold text-white tracking-tight">
                          {formatCurrency(tx.amount.toString())}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="font-medium text-white/70">{tx.sender}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="font-medium text-white/70">{tx.receiver}</span>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        {(tx as any).riskScore && <RiskBadge score={(tx as any).riskScore} showIcon={false} />}
                        {tx.status === "Settled" && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Latency</p>
                            <p className="text-xs font-mono text-primary font-medium">{tx.latencyMs} ms</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

// Sub-component for Status Badge
function StatusBadge({ status }: { status: string }) {
  switch(status) {
    case 'Pending':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
          <Loader2 className="w-3 h-3 animate-spin" />
          PENDING
        </span>
      );
    case 'Validated':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <AlertCircle className="w-3 h-3" />
          VALIDATED
        </span>
      );
    case 'Settled':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          <CheckCircle2 className="w-3 h-3" />
          SETTLED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
          {status.toUpperCase()}
        </span>
      );
  }
}
