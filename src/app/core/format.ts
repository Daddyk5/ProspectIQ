import { Currency, IntentLevel } from './models';

export const USD_TO_CAD = 1.37;

export function money(usdMillions: number, currency: Currency): string {
  const v = currency === 'CAD' ? usdMillions * USD_TO_CAD : usdMillions;
  const prefix = currency === 'CAD' ? 'CA$' : '$';
  return v >= 1000 ? `${prefix}${(v / 1000).toFixed(1)}B` : `${prefix}${Math.round(v)}M`;
}

export function compact(n: number): string {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function scoreTone(score: number): string {
  if (score >= 85) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (score >= 70) return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
  if (score >= 50) return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-slate-600 bg-slate-700/30 text-slate-400';
}

export function intentTone(level: IntentLevel): string {
  return {
    High: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    Low: 'border-slate-600 bg-slate-700/30 text-slate-400',
  }[level];
}

export function sparkPath(values: number[], w: number, h: number, pad = 2): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
