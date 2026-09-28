import { Flame, LoaderCircle } from 'lucide-react';
import { useMemo } from 'react';
import { LiveValue } from '../../components/LiveValue';
import { TIER_CHIP, formatInt, formatMillions } from '../../lib/format';
import { useWorkspace } from '../../state/WorkspaceContext';

export function MarketIntelligence() {
  const { leads, campaigns, metrics, hydrated } = useWorkspace();

  const byRegion = useMemo(() => {
    const m = new Map<string, { region: string; country: string; count: number; high: number }>();
    for (const l of leads) {
      const r = m.get(l.region) ?? { region: l.region, country: l.country, count: 0, high: 0 };
      r.count++;
      if (l.intentTier === 'High') r.high++;
      m.set(l.region, r);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [leads]);

  if (!hydrated || !metrics) {
    return (
      <div className="grid h-64 place-items-center text-sm text-slate-500" role="status">
        <span className="flex items-center gap-2">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Waiting for live market data…
        </span>
      </div>
    );
  }

  const pipeline = campaigns.reduce((s, c) => s + c.pipelineUsd, 0);
  const meetings = campaigns.reduce((s, c) => s + c.meetingsBooked, 0);
  const hot = [...leads].sort((a, b) => b.intentScore - a.intentScore).slice(0, 8);
  const maxRegion = Math.max(...byRegion.map((r) => r.count), 1);

  const tiles = [
    { label: 'Signals today', value: metrics.signalsToday, format: formatInt },
    { label: 'Tracked accounts', value: leads.length, format: formatInt },
    { label: 'Meetings booked', value: meetings, format: formatInt },
    { label: 'Sequence pipeline', value: pipeline, format: formatMillions },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="text-xs text-slate-400">{t.label}</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              <LiveValue value={t.value} format={t.format} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card" aria-labelledby="mi-hot">
          <h2 id="mi-hot" className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-3 text-[13px] font-semibold text-slate-100">
            <Flame className="size-3.5 text-rose-400" aria-hidden="true" /> Highest intent right now
          </h2>
          <ul className="divide-y divide-slate-800/70">
            {hot.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-100">{l.company}</div>
                  <div className="truncate text-slate-500">
                    {l.city}, {l.region} · {l.lastSignal}
                  </div>
                </div>
                <span className={`chip ${TIER_CHIP[l.intentTier]}`}>
                  <LiveValue value={l.intentScore} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="mi-geo">
          <h2 id="mi-geo" className="border-b border-slate-800 px-4 py-3 text-[13px] font-semibold text-slate-100">
            Accounts by state / province
          </h2>
          <ul className="space-y-1.5 p-4">
            {byRegion.slice(0, 12).map((r) => (
              <li key={r.region} className="flex items-center gap-3 text-xs">
                <span className="w-7 font-mono text-slate-400">{r.region}</span>
                <span className="relative h-5 flex-1 overflow-hidden rounded bg-slate-800/60">
                  <span className={`absolute inset-y-0 left-0 rounded ${r.country === 'CA' ? 'bg-emerald-500/60' : 'bg-brand/70'}`} style={{ width: `${(r.count / maxRegion) * 100}%` }} />
                </span>
                <span className="w-16 text-right font-mono text-slate-300">
                  {r.count} · <span className="text-rose-300">{r.high}🔥</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
