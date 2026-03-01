import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Globe, Shield, Zap, Code2, Lock, Brain, FileCheck, Bell, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SettlementCalculator } from "@/components/SettlementCalculator";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-20">
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8"
            >
              <Zap className="w-4 h-4" />
              <span>Version 3.0 — AI Risk Engine + KYC Compliance Now Live</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-5xl mx-auto leading-tight text-gradient"
            >
              The Future of Liquidity is <span className="text-gradient-primary">Instant.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10"
            >
              AI-Driven T+0 Settlement Engine for Global Financial Institutions. 
              Eliminate counterparty risk and unlock trapped capital in milliseconds.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link 
                href="/dashboard"
                data-testid="link-hero-dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-lg font-semibold bg-primary text-primary-foreground shadow-[0_0_30px_rgba(0,229,255,0.25)] hover:shadow-[0_0_40px_rgba(0,229,255,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                Access Dashboard Sandbox
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/compliance" data-testid="link-hero-kyc" className="w-full sm:w-auto px-8 py-4 rounded-xl text-lg font-semibold bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" /> Start KYC Verification
              </Link>
            </motion.div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="py-12 border-y border-white/5 bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">
              Trusted by Leading Institutions
            </p>
            <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2 font-bold text-xl text-white">
                  <Globe className="w-6 h-6" />
                  Bank Corp {i}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENTO GRID FEATURES */}
        <section className="py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Engineered for Scale.</h2>
              <p className="text-lg text-muted-foreground">
                Our infrastructure replaces legacy clearinghouses with a deterministic, cryptographically secure execution environment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
              <div className="glass-panel glass-panel-hover rounded-2xl p-8 md:col-span-2 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/10 transition-colors" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Predictive Liquidity</h3>
                  <p className="text-muted-foreground text-lg max-w-md">
                    Machine learning models forecast liquidity bottlenecks before they occur, automatically routing capital to optimal settlement paths.
                  </p>
                </div>
              </div>

              <div className="glass-panel glass-panel-hover rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Real-time Fraud Shield</h3>
                  <p className="text-muted-foreground">
                    Sub-millisecond anomaly detection using behavioral biometrics and global sanction lists.
                  </p>
                </div>
              </div>

              <div className="glass-panel glass-panel-hover rounded-2xl p-8 md:col-span-3 flex flex-col md:flex-row items-center gap-8 justify-between">
                <div className="max-w-2xl">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Global Regulatory Compliance</h3>
                  <p className="text-muted-foreground text-lg">
                    Automatically enforces regional compliance rules (MiFID II, Dodd-Frank, Basel III) dynamically based on counterparty jurisdictions at execution time.
                  </p>
                </div>
                <div className="w-full md:w-1/3 h-48 rounded-xl border border-white/10 bg-black/50 flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80')] opacity-20 bg-cover bg-center mix-blend-overlay" />
                  <Lock className="w-12 h-12 text-primary/50 relative z-10" />
                </div>
              </div>
            </div>

            {/* Interactive Calculator Integration */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <SettlementCalculator />
            </motion.div>
          </div>
        </section>

        {/* TRUST & SECURITY SECTION (NEW) */}
        <section className="py-24 bg-black/40 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Trust & Security Infrastructure
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Institutional-Grade Security at Every Layer</h2>
              <p className="text-lg text-muted-foreground">
                From AI-powered risk detection to cryptographic identity verification, every transaction is protected by enterprise security controls that exceed regulatory requirements.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* AI Risk Engine Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="glass-panel rounded-2xl p-8 border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 relative z-10">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 relative z-10">AI Risk Assessment</h3>
                <p className="text-muted-foreground mb-6 relative z-10">
                  Every transaction is scored in real-time across 5 risk dimensions: amount, velocity, jurisdiction, counterparty, and settlement latency.
                </p>
                <div className="space-y-2 relative z-10">
                  {[
                    { label: "Amount Risk", color: "bg-green-500" },
                    { label: "Jurisdiction Risk", color: "bg-yellow-500" },
                    { label: "Counterparty Risk", color: "bg-primary" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.random() * 60 + 20}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-28">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
                    <CheckCircle className="w-3 h-3" /> Low Risk
                  </span>
                  <span className="text-xs text-muted-foreground">Sample assessment</span>
                </div>
              </motion.div>

              {/* KYC Compliance Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="glass-panel rounded-2xl p-8 border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-yellow-500/10 transition-colors" />
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-6 relative z-10">
                  <FileCheck className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 relative z-10">KYC Compliance Center</h3>
                <p className="text-muted-foreground mb-6 relative z-10">
                  Multi-tier identity verification with institutional-grade document validation. Plaid open banking integration for direct account verification.
                </p>
                <div className="space-y-3 relative z-10">
                  {[
                    { label: "Identity Verification", done: true },
                    { label: "Document Validation", done: true },
                    { label: "Plaid Bank Link", done: false },
                    { label: "Enhanced Due Diligence", done: false },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-green-500/20 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
                        {item.done && <CheckCircle className="w-3 h-3 text-green-400" />}
                      </div>
                      <span className={`text-sm ${item.done ? 'text-white' : 'text-muted-foreground'}`}>{item.label}</span>
                      {!item.done && <span className="text-xs text-primary ml-auto">Coming</span>}
                    </div>
                  ))}
                </div>
                <Link href="/compliance" data-testid="link-kyc-start" className="mt-6 flex items-center gap-2 text-primary text-sm font-semibold hover:underline relative z-10">
                  Start Verification <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              {/* 2FA & Notifications Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="glass-panel rounded-2xl p-8 border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors" />
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 relative z-10">
                  <Lock className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 relative z-10">2FA + Smart Alerts</h3>
                <p className="text-muted-foreground mb-6 relative z-10">
                  Two-factor authentication for every login combined with real-time email alerts for settlement activity and AI risk escalations.
                </p>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">High Risk Alert</p>
                      <p className="text-xs text-muted-foreground">SET-1005 flagged — review required</p>
                    </div>
                    <Bell className="w-4 h-4 text-red-400 ml-auto animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Settlement Confirmed</p>
                      <p className="text-xs text-muted-foreground">SET-1001 settled in 0.84ms</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Security Badges Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                { icon: Shield, label: "ISO 27001", sub: "Information Security" },
                { icon: Eye, label: "SOC 2 Type II", sub: "Audit Compliant" },
                { icon: Lock, label: "AES-256", sub: "Data Encryption" },
                { icon: CheckCircle, label: "FATF Compliant", sub: "AML/KYC Standards" },
              ].map(item => (
                <div key={item.label} className="glass-panel rounded-xl p-5 border border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{item.label}</p>
                    <p className="text-muted-foreground text-xs">{item.sub}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* DEVELOPER API & COMPLIANCE */}
        <section className="py-24 bg-black/40 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white text-sm font-medium mb-6">
                <Code2 className="w-4 h-4" />
                <span>Developer-First</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Integrate in days, not years.</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our REST and WebSocket APIs are designed for institutional high-frequency environments. 
                Full ISO 20022 messaging support out of the box.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg">ISO 27001 Certified</h4>
                    <p className="text-muted-foreground">Highest standard of information security.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg">AI-Driven AML</h4>
                    <p className="text-muted-foreground">Automated reporting and continuous screening.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d1117] font-mono text-sm leading-relaxed relative">
              <div className="bg-[#161b22] border-b border-white/5 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-4 text-xs text-muted-foreground">POST /api/v1/settlements</span>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre>
                  <code className="text-gray-300">
                    <span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span> fetch(<span className="text-green-300">"https://api.instantsettlement.ai/v1/tx"</span>, {"{\n"}
                    {"  "}method: <span className="text-green-300">"POST"</span>,{"\n"}
                    {"  "}headers: {"{\n"}
                    {"    "}<span className="text-green-300">"Authorization"</span>: <span className="text-green-300">`Bearer <span className="text-blue-300">{"${API_KEY}"}</span>`</span>,{"\n"}
                    {"    "}<span className="text-green-300">"Content-Type"</span>: <span className="text-green-300">"application/json"</span>{"\n"}
                    {"  }"},
                    {"\n"}{"  "}body: JSON.<span className="text-blue-400">stringify</span>({"{\n"}
                    {"    "}counterparty_id: <span className="text-green-300">"inst_884a2"</span>,{"\n"}
                    {"    "}amount: <span className="text-orange-300">50000000.00</span>,{"\n"}
                    {"    "}currency: <span className="text-green-300">"USD"</span>,{"\n"}
                    {"    "}execution_policy: <span className="text-green-300">"IMMEDIATE_T0"</span>{"\n"}
                    {"  }"}){"\n"}
                    {"}"});{"\n"}
                    {"\n"}
                    <span className="text-gray-500">// Response includes AI risk assessment</span>{"\n"}
                    <span className="text-purple-400">const</span> settlement = <span className="text-purple-400">await</span> response.<span className="text-blue-400">json</span>();{"\n"}
                    console.<span className="text-blue-400">log</span>(settlement.status); <span className="text-gray-500">// "SETTLED"</span>{"\n"}
                    console.<span className="text-blue-400">log</span>(settlement.riskScore); <span className="text-gray-500">// "Low"</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </section>

      </main>
      
      <Footer />
    </div>
  );
}
