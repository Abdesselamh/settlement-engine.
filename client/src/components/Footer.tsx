import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg text-white">InstantSettlement.ai</span>
            </div>
            <p className="text-muted-foreground max-w-sm">
              The AI-driven T+0 settlement engine designed exclusively for global financial institutions, central banks, and elite hedge funds.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-primary cursor-pointer transition-colors">Predictive Liquidity</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Fraud Shield</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Ledger Sync</li>
              <li className="hover:text-primary cursor-pointer transition-colors">Developer API</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Compliance</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="hover:text-primary cursor-pointer transition-colors">ISO 27001</li>
              <li className="hover:text-primary cursor-pointer transition-colors">SOC 2 Type II</li>
              <li className="hover:text-primary cursor-pointer transition-colors">GDPR</li>
              <li className="hover:text-primary cursor-pointer transition-colors">AML Directives</li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} InstantSettlement.ai. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
