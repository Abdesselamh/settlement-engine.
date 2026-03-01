import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

type RiskLevel = "Low" | "Medium" | "High" | null | undefined;

interface RiskBadgeProps {
  score: RiskLevel;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function RiskBadge({ score, showIcon = true, size = "sm" }: RiskBadgeProps) {
  if (!score) return <span className="text-muted-foreground text-xs">N/A</span>;

  const config = {
    Low: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", label: "Low Risk" },
    Medium: { icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "Medium Risk" },
    High: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", label: "High Risk" },
  }[score] || { icon: CheckCircle, color: "text-muted-foreground", bg: "bg-white/5 border-white/10", label: score };

  const Icon = config.icon;
  const padding = size === "md" ? "px-3 py-1.5" : "px-2 py-0.5";
  const textSize = size === "md" ? "text-sm" : "text-xs";
  const iconSize = size === "md" ? "w-4 h-4" : "w-3 h-3";

  return (
    <span className={`inline-flex items-center gap-1.5 ${padding} rounded-full border ${config.bg} ${config.color} font-semibold ${textSize}`}>
      {showIcon && <Icon className={iconSize} />}
      {config.label}
    </span>
  );
}

interface RiskBreakdownChartProps {
  breakdown: {
    amountRisk: number;
    velocityRisk: number;
    jurisdictionRisk: number;
    counterpartyRisk: number;
    latencyRisk: number;
  };
}

export function RiskBreakdownChart({ breakdown }: RiskBreakdownChartProps) {
  const labels: Record<string, string> = {
    amountRisk: "Amount",
    velocityRisk: "Velocity",
    jurisdictionRisk: "Jurisdiction",
    counterpartyRisk: "Counterparty",
    latencyRisk: "Latency",
  };
  const maxValues: Record<string, number> = {
    amountRisk: 40, velocityRisk: 5, jurisdictionRisk: 25, counterpartyRisk: 20, latencyRisk: 10,
  };

  return (
    <div className="space-y-3">
      {Object.entries(breakdown).map(([key, value]) => {
        const max = maxValues[key] || 40;
        const pct = Math.round((value / max) * 100);
        const color = pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-yellow-500" : "bg-green-500";
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{labels[key]}</span>
              <span className="text-white font-mono">{value}/{max}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10">
              <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
