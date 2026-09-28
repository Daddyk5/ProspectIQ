import { Bot, CircleAlert, LoaderCircle, RotateCcw, Sparkles, Square } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { buildOptimizeRequest, type OptimizeObjective } from '../../services/ai/optimize-sequence';
import { useOptimizeSequence } from '../../services/ai/use-optimize-sequence';
import { api } from '../../services/api';
import type { Campaign, Lead } from '../../types';

const OBJECTIVES: { value: OptimizeObjective; label: string }[] = [
  { value: 'improve-conversion', label: 'Improve conversion' },
  { value: 'shorten-cycle', label: 'Shorten time to meeting' },
  { value: 'personalize', label: 'Deepen personalization' },
];

/** Streams sequence recommendations from the local Ollama model via POST /api/ai/optimize-sequence. */
export function AiOptimizerPanel({ campaign, leads }: { campaign: Campaign; leads: Lead[] }) {
  const ai = useOptimizeSequence();
  const id = useId();
  const [objective, setObjective] = useState<OptimizeObjective>('improve-conversion');
  const [health, setHealth] = useState<{ online: boolean; availableModels: string[] } | null>(null);

  // Enrolled leads first, then the rest by intent.
  const candidates = useMemo(
    () =>
      [...leads].sort(
        (a, b) => Number(b.enrolledSequenceId === campaign.id) - Number(a.enrolledSequenceId === campaign.id) || b.intentScore - a.intentScore,
      ),
    [leads, campaign.id],
  );
  const [leadId, setLeadId] = useState<string>('');
  const lead = candidates.find((l) => l.id === leadId) ?? candidates[0];

  useEffect(() => {
    let alive = true;
    api.aiHealth().then((h) => alive && setHealth(h));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => ai.reset(), [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = ai.status === 'connecting' || ai.status === 'streaming';
  const run = () => lead && ai.start(buildOptimizeRequest(lead, campaign, objective));

  return (
    <section aria-labelledby={`${id}-title`} className="card flex flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <h2 id={`${id}-title`} className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-100">
          <Sparkles className="size-3.5 text-indigo-400" aria-hidden="true" /> AI sequence optimizer
        </h2>
        <span
          className={`chip font-mono ${health?.online ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : health ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-500'}`}
          title="Local Ollama instance"
        >
          <span className={`size-1.5 rounded-full ${health?.online ? 'bg-emerald-400' : health ? 'bg-amber-400' : 'bg-slate-500'}`} aria-hidden="true" />
          {health ? (health.online ? `Ollama · ${health.availableModels[0] ?? 'no model'}` : 'Ollama offline') : 'checking…'}
        </span>
      </header>

      <div className="grid gap-3 p-4 text-xs">
        <label className="grid gap-1">
          <span className="text-slate-500">Prospect</span>
          <select className="field h-9 text-xs" value={lead?.id ?? ''} onChange={(e) => setLeadId(e.target.value)} disabled={busy}>
            {candidates.map((l) => (
              <option key={l.id} value={l.id}>
                {l.company} · {l.contact} ({l.intentTier}){l.enrolledSequenceId === campaign.id ? ' · enrolled' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-slate-500">Objective</span>
          <select className="field h-9 text-xs" value={objective} onChange={(e) => setObjective(e.target.value as OptimizeObjective)} disabled={busy}>
            {OBJECTIVES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {busy ? (
          <button className="btn w-full" onClick={ai.stop}>
            <Square className="size-3.5 fill-current" aria-hidden="true" /> Stop generating
          </button>
        ) : (
          <button className="btn btn-primary w-full" onClick={run} disabled={!lead}>
            <Bot className="size-4" aria-hidden="true" /> Optimize with local AI
          </button>
        )}
      </div>

      <div className="min-h-40 flex-1 border-t border-slate-800 p-4" aria-live="polite" aria-busy={busy}>
        {ai.status === 'idle' && <p className="text-xs text-slate-500">Recommendations stream here token by token. Nothing leaves this machine: inference runs on your local Ollama.</p>}

        {ai.status === 'connecting' && (
          <p className="flex items-center gap-2 text-xs text-indigo-300">
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> Contacting Ollama… the first request can take a few seconds while the model loads.
          </p>
        )}

        {ai.text && (
          <pre className="font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap text-slate-200">
            {ai.text}
            {ai.status === 'streaming' && <span className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 animate-pulse bg-indigo-300" aria-hidden="true" />}
          </pre>
        )}

        {(ai.status === 'done' || ai.status === 'stopped') && (
          <p className="mt-3 font-mono text-[10px] text-slate-500">
            {ai.status === 'stopped' ? 'Stopped' : 'Done'} · {ai.model}
            {ai.usedFallbackModel ? ' (fallback model)' : ''}
            {ai.durationMs ? ` · ${(ai.durationMs / 1000).toFixed(1)}s` : ''} · review before using with prospects
          </p>
        )}

        {ai.status === 'error' && ai.error && (
          <div role="alert" className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            <div className="flex items-center gap-1.5 font-medium">
              <CircleAlert className="size-3.5" aria-hidden="true" /> {ai.error.message}
            </div>
            {ai.error.hint && <p className="mt-1 text-rose-200/80">{ai.error.hint}</p>}
            <p className="mt-1 font-mono text-[10px] text-rose-300/70">{ai.error.code}</p>
            {ai.error.retryable && (
              <button className="btn btn-sm mt-2" onClick={run}>
                <RotateCcw className="size-3" aria-hidden="true" /> Retry
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
