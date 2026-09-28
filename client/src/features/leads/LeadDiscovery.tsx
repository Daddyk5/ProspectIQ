import { CircleCheck, LoaderCircle, PanelRightClose, PanelRightOpen, Search, UserPlus } from 'lucide-react';
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { LiveValue } from '../../components/LiveValue';
import { TIER_CHIP } from '../../lib/format';
import { useWorkspace } from '../../state/WorkspaceContext';
import type { IntentTier } from '../../types';
import { LeadMap, type LeadMapHandle } from './LeadMap';

const TIERS: IntentTier[] = ['High', 'Medium', 'Low'];
const MIN_PANE = 320;
const MAX_PANE = 900;

export function LeadDiscovery() {
  const { leads, campaigns, hydrated, enrollLead } = useWorkspace();
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<'ALL' | 'US' | 'CA'>('ALL');
  const [tiers, setTiers] = useState<Set<IntentTier>>(new Set());
  const [mapOpen, setMapOpen] = useState(true);
  const [paneWidth, setPaneWidth] = useState(520);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const mapRef = useRef<LeadMapHandle>(null);
  const resize = useRef<{ startX: number; startW: number } | null>(null);

  const defaultSequence = campaigns.find((c) => c.status === 'Running') ?? campaigns[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter(
        (l) =>
          (country === 'ALL' || l.country === country) &&
          (!tiers.size || tiers.has(l.intentTier)) &&
          (!q || `${l.company} ${l.contact} ${l.city} ${l.region} ${l.industry}`.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.intentScore - a.intentScore);
  }, [leads, query, country, tiers]);

  async function enroll(leadId: string) {
    if (!defaultSequence) return;
    setEnrolling(leadId);
    setRowError(null);
    try {
      await enrollLead(leadId, defaultSequence.id);
    } catch (e) {
      setRowError({ id: leadId, message: e instanceof Error ? e.message : 'Enrollment failed' });
    } finally {
      setEnrolling(null);
    }
  }

  function startResize(e: ReactPointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resize.current = { startX: e.clientX, startW: paneWidth };
  }
  function onResize(e: ReactPointerEvent) {
    if (!resize.current) return;
    setPaneWidth(Math.min(MAX_PANE, Math.max(MIN_PANE, resize.current.startW - (e.clientX - resize.current.startX))));
  }

  if (!hydrated) {
    return (
      <div className="grid h-64 place-items-center text-sm text-slate-500" role="status">
        <span className="flex items-center gap-2">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Waiting for live lead data…
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Lead list">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input className="field h-8 w-56 pl-8 text-xs" placeholder="Company, contact, city…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search leads" />
          </div>
          <div className="flex rounded-lg border border-slate-700 p-0.5" role="group" aria-label="Country">
            {(['ALL', 'US', 'CA'] as const).map((c) => (
              <button
                key={c}
                aria-pressed={country === c}
                onClick={() => setCountry(c)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs ${country === c ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {c === 'ALL' ? 'All' : c}
              </button>
            ))}
          </div>
          {TIERS.map((t) => (
            <button
              key={t}
              aria-pressed={tiers.has(t)}
              onClick={() =>
                setTiers((s) => {
                  const n = new Set(s);
                  if (n.has(t)) n.delete(t);
                  else n.add(t);
                  return n;
                })
              }
              className={`chip cursor-pointer ${tiers.has(t) ? TIER_CHIP[t] : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
            >
              {t} intent
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500">
            {filtered.length} of {leads.length}
          </span>
          <button className="btn btn-sm" onClick={() => setMapOpen((o) => !o)} aria-expanded={mapOpen} aria-controls="lead-map-pane">
            {mapOpen ? <PanelRightClose className="size-3.5" aria-hidden="true" /> : <PanelRightOpen className="size-3.5" aria-hidden="true" />}
            {mapOpen ? 'Hide map' : 'Show map'}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-canvas text-[11px] text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="py-2.5 pl-6 font-medium">Company &amp; contact</th>
                <th className="py-2.5 font-medium">Location</th>
                <th className="py-2.5 font-medium">Intent</th>
                <th className="py-2.5 font-medium">ICP</th>
                <th className="py-2.5 font-medium">Latest signal</th>
                <th className="py-2.5 pr-6 text-right font-medium">Sequence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filtered.map((l) => {
                const enrolledIn = campaigns.find((c) => c.id === l.enrolledSequenceId);
                return (
                  <tr key={l.id} className="group cursor-pointer hover:bg-slate-800/40" onClick={() => mapRef.current?.focus(l.id)}>
                    <td className="py-2.5 pl-6">
                      <div className="font-medium text-slate-100">{l.company}</div>
                      <div className="text-slate-500">
                        {l.contact} · {l.title}
                      </div>
                    </td>
                    <td className="py-2.5 whitespace-nowrap text-slate-300">
                      {l.city}, {l.region}
                    </td>
                    <td className="py-2.5">
                      <span className={`chip ${TIER_CHIP[l.intentTier]}`}>
                        <LiveValue value={l.intentScore} /> · {l.intentTier}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-300">{l.icp}</td>
                    <td className="max-w-56 truncate py-2.5 text-slate-400">{l.lastSignal}</td>
                    <td className="py-2.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                      {enrolledIn ? (
                        <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300" title={enrolledIn.name}>
                          <CircleCheck className="size-3" aria-hidden="true" /> Enrolled
                        </span>
                      ) : (
                        <button
                          className="btn btn-sm"
                          onClick={() => enroll(l.id)}
                          disabled={enrolling === l.id || !defaultSequence}
                          aria-label={`Enroll ${l.company} in ${defaultSequence?.name ?? 'a sequence'}`}
                        >
                          {enrolling === l.id ? <LoaderCircle className="size-3 animate-spin" aria-hidden="true" /> : <UserPlus className="size-3" aria-hidden="true" />}
                          Enroll
                        </button>
                      )}
                      {rowError?.id === l.id && (
                        <p role="alert" className="mt-1 text-[11px] text-rose-300">
                          {rowError.message}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {mapOpen && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize map pane"
            aria-valuenow={paneWidth}
            aria-valuemin={MIN_PANE}
            aria-valuemax={MAX_PANE}
            tabIndex={0}
            onPointerDown={startResize}
            onPointerMove={onResize}
            onPointerUp={() => (resize.current = null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setPaneWidth((w) => Math.min(MAX_PANE, w + 32));
              if (e.key === 'ArrowRight') setPaneWidth((w) => Math.max(MIN_PANE, w - 32));
            }}
            className="w-1.5 shrink-0 cursor-col-resize bg-slate-800 transition-colors hover:bg-brand/60 focus-visible:bg-brand"
          />
          <aside id="lead-map-pane" className="shrink-0" style={{ width: paneWidth }} aria-label="Geographic lead map">
            <LeadMap ref={mapRef} leads={filtered} campaigns={campaigns} onEnroll={enrollLead} />
          </aside>
        </>
      )}
    </div>
  );
}
