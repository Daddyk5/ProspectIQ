export const formatInt = (n: number) => n.toLocaleString('en-US');

/** 1_380_000 → "$1.38M" */
export function formatMillions(usd: number): string {
  return `$${(usd / 1_000_000).toFixed(2)}M`;
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export const TIER_COLOR: Record<'High' | 'Medium' | 'Low', string> = {
  High: '#F43F5E',
  Medium: '#F59E0B',
  Low: '#64748B',
};

export const TIER_CHIP: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Low: 'border-slate-600 bg-slate-700/30 text-slate-400',
};
