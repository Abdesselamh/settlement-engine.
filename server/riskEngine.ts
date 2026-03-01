export interface RiskAssessment {
  score: 'Low' | 'Medium' | 'High';
  factors: string[];
  breakdown: {
    amountRisk: number;
    velocityRisk: number;
    jurisdictionRisk: number;
    counterpartyRisk: number;
    latencyRisk: number;
  };
  confidence: number;
}

const HIGH_RISK_JURISDICTIONS = ['Iran', 'North Korea', 'Syria', 'Sudan'];
const HIGH_RISK_ENTITIES = ['unknown', 'offshore', 'anonymous'];

export function assessRisk(tx: {
  amount: string;
  currency: string;
  sender: string;
  receiver: string;
  latencyMs: string;
}): RiskAssessment {
  const amount = Number(tx.amount);
  const latency = Number(tx.latencyMs);
  const factors: string[] = [];
  const breakdown = {
    amountRisk: 0,
    velocityRisk: 0,
    jurisdictionRisk: 0,
    counterpartyRisk: 0,
    latencyRisk: 0,
  };

  // Amount risk (0-40 points)
  if (amount > 50_000_000) { breakdown.amountRisk = 40; factors.push('Transaction exceeds $50M threshold'); }
  else if (amount > 20_000_000) { breakdown.amountRisk = 25; factors.push('Large transaction over $20M'); }
  else if (amount > 5_000_000) { breakdown.amountRisk = 12; }
  else { breakdown.amountRisk = 3; }

  // Jurisdiction risk (0-25 points)
  const senderLower = tx.sender.toLowerCase();
  const receiverLower = tx.receiver.toLowerCase();
  if (HIGH_RISK_JURISDICTIONS.some(j => senderLower.includes(j.toLowerCase()) || receiverLower.includes(j.toLowerCase()))) {
    breakdown.jurisdictionRisk = 25; factors.push('Sanctioned jurisdiction detected');
  } else if (tx.currency === 'JPY' || tx.currency === 'CHF') {
    breakdown.jurisdictionRisk = 8;
  } else { breakdown.jurisdictionRisk = 2; }

  // Counterparty risk (0-20 points)
  if (HIGH_RISK_ENTITIES.some(e => senderLower.includes(e) || receiverLower.includes(e))) {
    breakdown.counterpartyRisk = 20; factors.push('Unverified counterparty entity');
  } else if (senderLower === receiverLower) {
    breakdown.counterpartyRisk = 15; factors.push('Self-directed transaction detected');
  } else { breakdown.counterpartyRisk = 3; }

  // Latency risk (0-10 points)
  if (latency > 1.5) { breakdown.latencyRisk = 10; factors.push('Abnormal settlement latency detected'); }
  else if (latency > 1.0) { breakdown.latencyRisk = 5; }
  else { breakdown.latencyRisk = 1; }

  // Velocity risk (simulated, 0-5 points)
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) { breakdown.velocityRisk = 5; factors.push('Off-hours transaction pattern'); }
  else { breakdown.velocityRisk = 1; }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const maxScore = 100;
  const normalized = Math.min(total, maxScore);

  let score: 'Low' | 'Medium' | 'High';
  if (normalized >= 45) score = 'High';
  else if (normalized >= 20) score = 'Medium';
  else score = 'Low';

  if (factors.length === 0) {
    factors.push('Standard institutional counterparties');
    factors.push('Transaction within normal parameters');
  }

  return {
    score,
    factors,
    breakdown,
    confidence: Math.round(75 + Math.random() * 20),
  };
}
