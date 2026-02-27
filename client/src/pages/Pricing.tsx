import { motion } from "framer-motion";
import { Check, Shield, Zap, Globe } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";

export default function Pricing() {
  const [volume, setVolume] = useState([500]);
  
  const dailyVolume = volume[0] * 1000000;
  const yearlySavings = dailyVolume * 0.0015 * 252; // Assuming 0.15% savings on capital efficiency

  return (
    <div className="min-h-screen flex flex-col">
      <div className="tech-bg-animation" />
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gradient">Institutional Pricing</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Transparent, volume-based pricing designed for the scale of global finance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            {/* Tier 1 */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-panel p-8 rounded-2xl border-white/5 flex flex-col"
            >
              <h3 className="text-xl font-bold mb-2">Essential</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$5,000</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  Up to $1B Monthly Volume
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  Standard T+0 Settlement
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  Basic Compliance Suite
                </li>
              </ul>
              <Link href="/request-demo" className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-center font-semibold hover:bg-white/10 transition-all">
                Get Started
              </Link>
            </motion.div>

            {/* Tier 2 */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-panel p-8 rounded-2xl border-primary/50 bg-primary/5 relative flex flex-col"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-bold mb-2 text-primary">Professional</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">$25,000</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  Up to $50B Monthly Volume
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  Priority Settlement Routing
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  Advanced AI Fraud Shield
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  24/7 Dedicated Support
                </li>
              </ul>
              <Link href="/request-demo" className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-center font-semibold shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all">
                Get Started
              </Link>
            </motion.div>

            {/* Tier 3 */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-panel p-8 rounded-2xl border-white/5 flex flex-col"
            >
              <h3 className="text-xl font-bold mb-2">Custom</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">Custom</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  Unlimited Volume
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  White-label Integration
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  On-premise AI Deployment
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-5 h-5 text-primary shrink-0" />
                  Custom Compliance Logic
                </li>
              </ul>
              <Link href="/request-demo" className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-center font-semibold hover:bg-white/10 transition-all">
                Contact Sales
              </Link>
            </motion.div>
          </div>

          {/* Revenue Calculator */}
          <div className="glass-panel rounded-3xl p-12 border-white/5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Settlement Revenue Calculator</h2>
                <p className="text-muted-foreground mb-10">
                  Estimate your annual capital savings by switching to our T+0 AI-driven settlement engine.
                </p>
                
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between mb-4">
                      <label className="text-white font-medium">Daily Settlement Volume</label>
                      <span className="text-primary font-bold text-xl">${volume[0]}M</span>
                    </div>
                    <Slider 
                      value={volume} 
                      onValueChange={setVolume} 
                      max={10000} 
                      step={100}
                      className="py-4"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
                <p className="text-muted-foreground mb-2">Estimated Annual Savings</p>
                <h3 className="text-5xl md:text-6xl font-bold text-primary mb-6">
                  ${(yearlySavings / 1000000).toFixed(2)}B
                </h3>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="p-4 rounded-xl bg-black/40">
                    <p className="text-xs text-muted-foreground mb-1">Capital Efficiency</p>
                    <p className="text-lg font-bold text-white">+84%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40">
                    <p className="text-xs text-muted-foreground mb-1">Risk Reduction</p>
                    <p className="text-lg font-bold text-white">99.9%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
