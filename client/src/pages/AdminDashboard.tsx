import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, CreditCard, Activity, TrendingUp, ShieldCheck, Download, FileText, AlertTriangle, Bell, CheckCircle, Clock, XCircle, BarChart2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, AuditLog, Invoice } from "@shared/schema";
import { RiskBadge } from "@/components/RiskBadge";

const volumeData = [
  { month: "Aug", volume: 82, settlements: 120 },
  { month: "Sep", volume: 95, settlements: 145 },
  { month: "Oct", volume: 110, settlements: 180 },
  { month: "Nov", volume: 125, settlements: 210 },
  { month: "Dec", volume: 140, settlements: 240 },
  { month: "Jan", volume: 158, settlements: 275 },
  { month: "Feb", volume: 175, settlements: 310 },
];

const latencyData = [
  { time: "00:00", ms: 0.91 }, { time: "04:00", ms: 0.84 },
  { time: "08:00", ms: 0.79 }, { time: "12:00", ms: 0.88 },
  { time: "16:00", ms: 0.82 }, { time: "20:00", ms: 0.76 },
];

const riskDistData = [
  { name: "Low Risk", value: 65, color: "#34d399" },
  { name: "Medium Risk", value: 25, color: "#fbbf24" },
  { name: "High Risk", value: 10, color: "#f87171" },
];

function StatCard({ icon: Icon, label, value, sub, color, alert }: { icon: any; label: string; value: string | number; sub?: string; color?: string; alert?: boolean }) {
  return (
    <div className={`glass-panel p-6 rounded-2xl border ${alert ? 'border-red-500/20 bg-red-500/5' : 'border-white/5'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${alert ? 'text-red-400' : 'text-primary'}`} />
        </div>
        {alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1" />}
      </div>
      <p className={`text-3xl font-bold mb-1 ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className={`text-xs mt-1 ${alert ? 'text-red-400/70' : 'text-primary'}`}>{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [reviewingKyc, setReviewingKyc] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/stats"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/admin/users"] });
  const { data: auditLogs = [] } = useQuery<AuditLog[]>({ queryKey: ["/api/admin/audit-logs"] });
  const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ["/api/admin/invoices"] });
  const { data: kycList = [] } = useQuery<any[]>({ queryKey: ["/api/admin/kyc"] });
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    queryFn: () => fetch("/api/notifications?email=admin@instantsettlement.ai").then(r => r.json()),
  });
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/transactions"] });
  const { data: frozenTxs = [] } = useQuery<any[]>({ queryKey: ["/api/admin/frozen"] });

  const kycReviewMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: string; notes: string }) =>
      apiRequest("PATCH", `/api/admin/kyc/${id}`, { status, reviewNotes: notes, reviewedBy: "admin@instantsettlement.ai" }),
    onSuccess: () => {
      toast({ title: "KYC Review Submitted" });
      setReviewingKyc(null);
      setReviewNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (e: any) => toast({ title: "Review Failed", description: e.message, variant: "destructive" }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const releaseFrozenMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: number; action: string; notes: string }) =>
      apiRequest("POST", `/api/admin/frozen/${id}/release`, { action, notes }),
    onSuccess: () => {
      toast({ title: "Frozen Transaction Updated", description: "Admin decision recorded and audit logged." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/frozen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
    },
    onError: (e: any) => toast({ title: "Action Failed", description: e.message, variant: "destructive" }),
  });

  function tierBadge(tier?: string | null) {
    if (!tier) return <Badge variant="outline" className="text-muted-foreground">None</Badge>;
    if (tier === "professional") return <Badge className="bg-primary/20 text-primary border-primary/30">Professional</Badge>;
    if (tier === "essential") return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Essential</Badge>;
    return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Custom</Badge>;
  }

  function statusBadge(status?: string | null) {
    if (status === "active") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
    if (status === "canceled") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Canceled</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">None</Badge>;
  }

  function kycStatusBadge(status: string) {
    if (status === "approved") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === "rejected") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  }

  function actionIcon(action: string) {
    if (action === "LOGIN") return <ShieldCheck className="w-4 h-4 text-green-400" />;
    if (action === "EXPORT") return <Download className="w-4 h-4 text-blue-400" />;
    if (action.includes("SUBSCRIPTION")) return <CreditCard className="w-4 h-4 text-primary" />;
    if (action.includes("KYC")) return <FileText className="w-4 h-4 text-yellow-400" />;
    if (action.includes("RISK") || action.includes("HIGH")) return <AlertTriangle className="w-4 h-4 text-red-400" />;
    return <Activity className="w-4 h-4 text-muted-foreground" />;
  }

  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const highRiskTxs = transactions.filter((t: any) => t.riskScore === 'High');
  const pendingKyc = kycList.filter((k: any) => k.status === 'pending');
  const [frozenNotes, setFrozenNotes] = useState<Record<number, string>>({});

  return (
    <div className="min-h-screen flex flex-col">
      <div className="tech-bg-animation" />
      <Navbar />
      <main className="flex-1 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gradient mb-2" data-testid="text-admin-title">Enterprise Admin Dashboard</h1>
              <p className="text-muted-foreground">Platform operations, AI risk monitoring, KYC compliance, and financial analytics</p>
            </div>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <Bell className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-semibold">{unreadCount} unread alerts</span>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? users.length} sub="Registered accounts" />
            <StatCard icon={CreditCard} label="Active Subs" value={stats?.activeSubscriptions ?? 0} sub="Revenue generating" />
            <StatCard icon={Activity} label="Settlements" value={(stats?.totalTransactions ?? 0).toLocaleString()} sub="All-time processed" />
            <StatCard icon={TrendingUp} label="Revenue" value={`$${((stats?.totalRevenue ?? 0) / 1000).toFixed(1)}K`} sub="Stripe collected" />
            <StatCard icon={Lock} label="Frozen TXs" value={frozenTxs.length} sub="Awaiting fraud audit" alert={frozenTxs.length > 0} />
            <StatCard icon={FileText} label="Pending KYC" value={stats?.pendingKyc ?? pendingKyc.length} sub="Awaiting review" alert={(stats?.pendingKyc ?? pendingKyc.length) > 0} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <div className="glass-panel p-6 rounded-2xl border-white/5 lg:col-span-1">
              <h3 className="text-white font-bold mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Settlement Volume</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="adminVolGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="volume" stroke="#00e5ff" fill="url(#adminVolGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-white/5 lg:col-span-1">
              <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Latency (ms)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[0.6, 1.0]} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="ms" fill="#00e5ff" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-white/5 lg:col-span-1">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" /> AI Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={riskDistData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {riskDistData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {riskDistData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name.split(' ')[0]} ({d.value}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users">
            <TabsList className="bg-white/5 border border-white/10 mb-6 flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-users">
                <Users className="w-4 h-4 mr-2" /> Users
              </TabsTrigger>
              <TabsTrigger value="kyc" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-kyc">
                <ShieldCheck className="w-4 h-4 mr-2" /> KYC Review
                {pendingKyc.length > 0 && <span className="ml-2 w-4 h-4 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center">{pendingKyc.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="risk" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-risk">
                <AlertTriangle className="w-4 h-4 mr-2" /> Risk Monitor
                {highRiskTxs.length > 0 && <span className="ml-2 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{highRiskTxs.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-alerts">
                <Bell className="w-4 h-4 mr-2" /> Alerts
                {unreadCount > 0 && <span className="ml-2 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="audit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-audit">
                <Activity className="w-4 h-4 mr-2" /> Audit Logs
              </TabsTrigger>
              <TabsTrigger value="invoices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-invoices">
                <FileText className="w-4 h-4 mr-2" /> Invoices
              </TabsTrigger>
              <TabsTrigger value="frozen" className="data-[state=active]:bg-red-600 data-[state=active]:text-white" data-testid="tab-frozen">
                <Lock className="w-4 h-4 mr-2 text-red-400" /> Fraud Queue
                {frozenTxs.length > 0 && <span className="ml-2 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">{frozenTxs.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-reports">
                <BarChart2 className="w-4 h-4 mr-2" /> Reports
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Registered Users</h3>
                  <Badge variant="outline" className="text-muted-foreground">{users.length} total</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="text-left p-4">User</th>
                        <th className="text-left p-4">Company</th>
                        <th className="text-left p-4">Role</th>
                        <th className="text-left p-4">Tier</th>
                        <th className="text-left p-4">Subscription</th>
                        <th className="text-left p-4">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users yet</td></tr>}
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors" data-testid={`row-user-${user.id}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white font-medium">{user.name}</p>
                                <p className="text-muted-foreground text-xs">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{user.company || "—"}</td>
                          <td className="p-4"><Badge variant="outline" className={user.role === "admin" ? "border-amber-500/30 text-amber-400" : "text-muted-foreground"}>{user.role}</Badge></td>
                          <td className="p-4">{tierBadge(user.subscriptionTier)}</td>
                          <td className="p-4">{statusBadge(user.subscriptionStatus)}</td>
                          <td className="p-4 text-muted-foreground text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* KYC Tab */}
            <TabsContent value="kyc">
              <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white">KYC Submissions</h3>
                  <div className="flex gap-2">
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{pendingKyc.length} Pending</Badge>
                    <Badge variant="outline" className="text-muted-foreground">{kycList.length} Total</Badge>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="text-left p-4">Applicant</th>
                        <th className="text-left p-4">Document</th>
                        <th className="text-left p-4">Company</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Submitted</th>
                        <th className="text-left p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kycList.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No KYC submissions yet</td></tr>}
                      {kycList.map((kyc: any) => (
                        <tr key={kyc.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`row-kyc-${kyc.id}`}>
                          <td className="p-4">
                            <p className="text-white font-medium">{kyc.fullName}</p>
                            <p className="text-muted-foreground text-xs">{kyc.userEmail}</p>
                            <p className="text-muted-foreground text-xs">{kyc.nationality}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-white text-xs capitalize">{kyc.documentType?.replace('_', ' ')}</p>
                            <p className="text-muted-foreground font-mono text-xs">{kyc.documentNumber}</p>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs">{kyc.companyName || "—"}</td>
                          <td className="p-4">{kycStatusBadge(kyc.status)}</td>
                          <td className="p-4 text-muted-foreground text-xs">{new Date(kyc.submittedAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            {kyc.status === 'pending' && (
                              <Button data-testid={`button-review-kyc-${kyc.id}`} size="sm" variant="outline" className="border-white/10 text-xs" onClick={() => { setReviewingKyc(kyc); setReviewNotes(""); }}>
                                Review
                              </Button>
                            )}
                            {kyc.reviewNotes && kyc.status !== 'pending' && (
                              <p className="text-xs text-muted-foreground max-w-xs">{kyc.reviewNotes}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* KYC Review Modal */}
              {reviewingKyc && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="glass-panel rounded-2xl p-8 border border-white/10 max-w-md w-full">
                    <h3 className="text-xl font-bold text-white mb-2">Review KYC Application</h3>
                    <p className="text-muted-foreground text-sm mb-6">{reviewingKyc.fullName} — {reviewingKyc.userEmail}</p>
                    <div className="space-y-2 mb-6">
                      {[
                        ["Document", `${reviewingKyc.documentType?.replace('_', ' ')} — ${reviewingKyc.documentNumber}`],
                        ["Nationality", reviewingKyc.nationality],
                        ["Company", reviewingKyc.companyName || "Individual"],
                        ["Regulatory Body", reviewingKyc.regulatoryBody || "N/A"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm border-b border-white/5 py-2">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="text-white capitalize">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mb-4">
                      <label className="text-sm text-muted-foreground mb-2 block">Review Notes</label>
                      <textarea
                        data-testid="textarea-review-notes"
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        rows={3}
                        placeholder="Optional notes for the applicant..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button data-testid="button-approve-kyc" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={kycReviewMutation.isPending}
                        onClick={() => kycReviewMutation.mutate({ id: reviewingKyc.id, status: "approved", notes: reviewNotes })}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve
                      </Button>
                      <Button data-testid="button-reject-kyc" className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={kycReviewMutation.isPending}
                        onClick={() => kycReviewMutation.mutate({ id: reviewingKyc.id, status: "rejected", notes: reviewNotes })}>
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                      <Button variant="outline" className="border-white/10" onClick={() => setReviewingKyc(null)}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Risk Monitor Tab */}
            <TabsContent value="risk">
              <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> AI Risk Monitor
                  </h3>
                  <div className="flex gap-2">
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{highRiskTxs.length} High Risk</Badge>
                    <Badge variant="outline" className="text-muted-foreground">{transactions.length} Total TXs</Badge>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="text-left p-4">TX ID</th>
                        <th className="text-left p-4">Amount</th>
                        <th className="text-left p-4">Route</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">AI Risk Score</th>
                        <th className="text-left p-4">Risk Factors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No transactions yet</td></tr>}
                      {[...transactions].sort((a, b) => {
                        const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
                        return (order[a.riskScore || 'Low'] ?? 2) - (order[b.riskScore || 'Low'] ?? 2);
                      }).map((tx: any) => {
                        const factors = tx.riskFactors ? JSON.parse(tx.riskFactors) : [];
                        return (
                          <tr key={tx.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${tx.riskScore === 'High' ? 'bg-red-500/[0.03]' : ''}`} data-testid={`row-risk-${tx.id}`}>
                            <td className="p-4 font-mono text-xs text-white">{tx.txId}</td>
                            <td className="p-4 text-white font-semibold">{Number(tx.amount).toLocaleString()} {tx.currency}</td>
                            <td className="p-4 text-muted-foreground text-xs">{tx.sender} → {tx.receiver}</td>
                            <td className="p-4"><Badge variant="outline" className="text-xs text-muted-foreground">{tx.status}</Badge></td>
                            <td className="p-4"><RiskBadge score={tx.riskScore} /></td>
                            <td className="p-4 text-muted-foreground text-xs max-w-xs">{factors[0] || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts">
              <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> System Notifications</h3>
                  <Badge variant="outline" className="text-muted-foreground">{notifications.length} total</Badge>
                </div>
                <div className="divide-y divide-white/5">
                  {notifications.length === 0 && <div className="p-8 text-center text-muted-foreground">No notifications</div>}
                  {notifications.map((n: any) => (
                    <div key={n.id} className={`flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors ${!n.read ? 'bg-primary/[0.02]' : ''}`} data-testid={`notification-${n.id}`}>
                      <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        n.priority === 'critical' ? 'bg-red-500/20' : n.priority === 'high' ? 'bg-yellow-500/20' : 'bg-primary/10'
                      }`}>
                        {n.type === 'high_risk' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                          n.type === 'kyc_update' ? <ShieldCheck className="w-4 h-4 text-yellow-400" /> :
                          <Bell className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-semibold ${!n.read ? 'text-white' : 'text-muted-foreground'}`}>{n.title}</p>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                          {n.priority === 'critical' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Critical</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                      {!n.read && (
                        <Button data-testid={`button-mark-read-${n.id}`} size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-white flex-shrink-0"
                          onClick={() => markReadMutation.mutate(n.id)}>
                          Mark read
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Audit Tab */}
            <TabsContent value="audit">
              <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Audit Log</h3>
                  <Badge variant="outline" className="text-muted-foreground">{auditLogs.length} events</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="text-left p-4">Action</th>
                        <th className="text-left p-4">User</th>
                        <th className="text-left p-4">Resource</th>
                        <th className="text-left p-4">Details</th>
                        <th className="text-left p-4">IP</th>
                        <th className="text-left p-4">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No audit events yet</td></tr>}
                      {auditLogs.map(log => (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`row-audit-${log.id}`}>
                          <td className="p-4"><div className="flex items-center gap-2">{actionIcon(log.action)}<span className="text-white font-mono text-xs">{log.action}</span></div></td>
                          <td className="p-4 text-muted-foreground text-xs">{log.userEmail || "—"}</td>
                          <td className="p-4 text-muted-foreground text-xs">{log.resource || "—"}</td>
                          <td className="p-4 text-muted-foreground text-xs max-w-xs truncate">{log.details || "—"}</td>
                          <td className="p-4 text-muted-foreground font-mono text-xs">{log.ipAddress || "—"}</td>
                          <td className="p-4 text-muted-foreground text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Invoices</h3>
                  <Badge variant="outline" className="text-muted-foreground">{invoices.length} total</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="text-left p-4">Invoice</th>
                        <th className="text-left p-4">Customer</th>
                        <th className="text-left p-4">Plan</th>
                        <th className="text-left p-4">Amount</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Date</th>
                        <th className="text-left p-4">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No invoices yet.</td></tr>}
                      {invoices.map(inv => (
                        <tr key={inv.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`row-invoice-${inv.id}`}>
                          <td className="p-4 text-white font-mono text-xs">INV-{String(inv.id).padStart(5, '0')}</td>
                          <td className="p-4 text-muted-foreground text-xs">{inv.userEmail}</td>
                          <td className="p-4">{tierBadge(inv.tier)}</td>
                          <td className="p-4 text-white font-semibold">${Number(inv.amount).toLocaleString()}</td>
                          <td className="p-4"><Badge className="bg-green-500/20 text-green-400 border-green-500/30">PAID</Badge></td>
                          <td className="p-4 text-muted-foreground text-xs">{new Date(inv.createdAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary text-xs hover:underline" data-testid={`link-invoice-pdf-${inv.id}`}>
                              <FileText className="w-3 h-3" /> PDF
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
            {/* Frozen / Fraud Queue Tab */}
            <TabsContent value="frozen">
              <div className="glass-panel rounded-2xl border border-red-500/10 overflow-hidden">
                <div className="p-4 border-b border-red-500/10 bg-red-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-red-400" />
                    <div>
                      <h3 className="font-semibold text-white">Fraud Prevention Queue</h3>
                      <p className="text-xs text-red-400/70">Auto-frozen: High risk + amount ≥ $1M. Manual admin audit required before release.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">{frozenTxs.length} Frozen</Badge>
                    <a href="/api/admin/reports/frozen/csv" target="_blank" data-testid="link-frozen-csv">
                      <Button size="sm" variant="outline" className="gap-1 text-xs border-white/10"><Download className="w-3 h-3" /> CSV</Button>
                    </a>
                  </div>
                </div>
                {frozenTxs.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle className="w-10 h-10 mx-auto text-green-400 mb-3" />
                    <p className="text-muted-foreground">No frozen transactions — fraud queue is clear.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-red-500/10">
                    {frozenTxs.map((tx: any) => (
                      <div key={tx.id} data-testid={`card-frozen-${tx.id}`} className="p-5 bg-red-500/[0.02] hover:bg-red-500/5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-mono font-bold text-white">{tx.txId}</span>
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">FROZEN</Badge>
                              <RiskBadge score={tx.riskScore} />
                            </div>
                            <p className="text-2xl font-bold text-white">{Number(tx.amount).toLocaleString()} <span className="text-lg text-muted-foreground">{tx.currency}</span></p>
                            <p className="text-sm text-muted-foreground">{tx.sender} → {tx.receiver}</p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>Latency: {tx.latencyMs}ms</p>
                            <p>{new Date(tx.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                          <p className="text-xs text-red-300 font-medium mb-1">Freeze Reason:</p>
                          <p className="text-xs text-red-200/80">{tx.frozenReason || "High risk transaction auto-frozen for manual review."}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            placeholder="Admin notes (optional)..."
                            value={frozenNotes[tx.id] || ""}
                            onChange={e => setFrozenNotes(prev => ({ ...prev, [tx.id]: e.target.value }))}
                            data-testid={`input-frozen-notes-${tx.id}`}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                          />
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                            disabled={releaseFrozenMutation.isPending}
                            onClick={() => releaseFrozenMutation.mutate({ id: tx.id, action: 'approve', notes: frozenNotes[tx.id] || '' })}
                            data-testid={`button-approve-frozen-${tx.id}`}
                          >
                            <CheckCircle className="w-4 h-4" /> Approve & Release
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white gap-2"
                            disabled={releaseFrozenMutation.isPending}
                            onClick={() => releaseFrozenMutation.mutate({ id: tx.id, action: 'reject', notes: frozenNotes[tx.id] || '' })}
                            data-testid={`button-reject-frozen-${tx.id}`}
                          >
                            <XCircle className="w-4 h-4" /> Reject Transaction
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports">
              <div className="space-y-6">
                <div className="glass-panel rounded-2xl border-white/5 p-6">
                  <h3 className="font-semibold text-white mb-1 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-primary" /> Institutional Reporting Hub</h3>
                  <p className="text-sm text-muted-foreground mb-6">Export financial audit logs and reports optimized for tax authority and compliance audits. AES-256 certified data lineage.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Audit Log CSV */}
                    <div className="glass-panel border border-white/5 rounded-xl p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <Download className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Audit Log — CSV</p>
                          <p className="text-xs text-muted-foreground">All system events, user actions, IP addresses. Machine-readable for SIEM/compliance tools.</p>
                        </div>
                      </div>
                      <a href="/api/admin/reports/audit-log/csv" target="_blank" data-testid="link-audit-csv">
                        <Button className="w-full gap-2 bg-blue-600/80 hover:bg-blue-600 text-white"><Download className="w-4 h-4" /> Export CSV</Button>
                      </a>
                    </div>

                    {/* Audit Log PDF/HTML */}
                    <div className="glass-panel border border-white/5 rounded-xl p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Audit Log — Compliance PDF</p>
                          <p className="text-xs text-muted-foreground">Formatted institutional report with branding, FATF/ISO markings — print-ready for tax auditors.</p>
                        </div>
                      </div>
                      <a href="/api/admin/reports/audit-log/pdf" target="_blank" data-testid="link-audit-pdf">
                        <Button className="w-full gap-2"><FileText className="w-4 h-4" /> View Compliance Report</Button>
                      </a>
                    </div>

                    {/* Transaction CSV */}
                    <div className="glass-panel border border-white/5 rounded-xl p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Settlement Transactions — CSV</p>
                          <p className="text-xs text-muted-foreground">All settlement transactions with AI risk scores, frozen status, and latency data.</p>
                        </div>
                      </div>
                      <a href="/api/export/transactions/csv" target="_blank" data-testid="link-transactions-csv">
                        <Button className="w-full gap-2 bg-green-600/80 hover:bg-green-600 text-white"><Download className="w-4 h-4" /> Export Transactions CSV</Button>
                      </a>
                    </div>

                    {/* Transaction PDF */}
                    <div className="glass-panel border border-white/5 rounded-xl p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Settlement Report — Institutional PDF</p>
                          <p className="text-xs text-muted-foreground">Full settlement report with risk color-coding, frozen status flags. Suitable for board reporting.</p>
                        </div>
                      </div>
                      <a href="/api/export/transactions/pdf" target="_blank" data-testid="link-transactions-pdf">
                        <Button className="w-full gap-2 bg-purple-600/80 hover:bg-purple-600 text-white"><FileText className="w-4 h-4" /> View Settlement Report</Button>
                      </a>
                    </div>

                    {/* Frozen Transactions CSV */}
                    <div className="glass-panel border border-red-500/10 rounded-xl p-5 bg-red-500/5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <Lock className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">Frozen Transactions — CSV</p>
                          <p className="text-xs text-muted-foreground">All auto-frozen transactions with fraud reasons. Required for AML/FATF compliance filings.</p>
                        </div>
                      </div>
                      <a href="/api/admin/reports/frozen/csv" target="_blank" data-testid="link-frozen-csv-report">
                        <Button className="w-full gap-2 bg-red-600/80 hover:bg-red-600 text-white"><Download className="w-4 h-4" /> Export Fraud Report CSV</Button>
                      </a>
                    </div>

                    {/* Security Info */}
                    <div className="glass-panel border border-white/5 rounded-xl p-5 flex flex-col justify-between">
                      <div className="space-y-3 mb-4">
                        {[
                          { label: "Encryption", value: "AES-256-GCM", icon: "🔐" },
                          { label: "Standard", value: "ISO 27001 / FATF", icon: "✅" },
                          { label: "Data Residency", value: "EU / US dual-region", icon: "🌍" },
                          { label: "Retention", value: "7 years (configurable)", icon: "📂" },
                        ].map(({ label, value, icon }) => (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{icon} {label}</span>
                            <span className="text-white font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                      <Badge variant="outline" className="w-fit text-xs bg-green-500/5 text-green-400 border-green-500/20">GDPR · FATF · SOC2 Compliant</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
