import { Link, useLocation } from "wouter";
import { Activity, ShieldCheck, TerminalSquare } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
  const [location] = useLocation();

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 inset-x-0 z-50 glass-panel border-x-0 border-t-0"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-primary transition-colors">
              InstantSettlement<span className="text-primary">.ai</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors ${
                location === "/" ? "text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              Platform
            </Link>
            <Link 
              href="/pricing" 
              className={`text-sm font-medium transition-colors ${
                location === "/pricing" ? "text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              Pricing
            </Link>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors cursor-pointer">
              <ShieldCheck className="w-4 h-4" />
              Compliance
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <Link 
              href="/request-demo"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Request Demo
            </Link>
            <Link 
              href="/dashboard"
              className="hidden sm:flex px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30_px_rgba(0,229,255,0.5)] hover:-translate-y-0.5 transition-all"
            >
              Launch Dashboard
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
