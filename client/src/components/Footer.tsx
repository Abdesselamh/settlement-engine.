import { Link } from "wouter";
import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/40 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                InstantSettlement<span className="text-primary">.ai</span>
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm">
              The world's leading AI-driven T+0 settlement engine for Tier-1 financial institutions.
              Unlocking liquidity and eliminating counterparty risk globally.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/request-demo" className="hover:text-primary transition-colors">Request Demo</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Compliance</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© 2026 InstantSettlement.ai. All rights reserved. ISO 27001 Certified.</p>
          <div className="flex gap-6">
            <span>Status: All Systems Operational</span>
            <span>Security: 256-bit AES</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
