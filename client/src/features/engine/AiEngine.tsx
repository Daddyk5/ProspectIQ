import { Cpu, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';

type Health = Awaited<ReturnType<typeof api.aiHealth>>;

export function AiEngine() {
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setHealth(await api.aiHealth());
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <div className="max-w-3xl space-y-4 p-6">
      <section className="card p-5" aria-labelledby="engine-title">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300">
            <Cpu className="size-5" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h2 id="engine-title" className="text-sm font-semibold text-white">
              Local inference · Ollama
            </h2>
            <p className="text-xs text-slate-500">Sequence optimization runs on your own hardware; prospect data is never sent to a hosted LLM.</p>
          </div>
          <button className="btn btn-sm" onClick={check} disabled={checking}>
            {checking ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
            Re-check
          </button>
        </div>

        {health && (
          <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-3" aria-live="polite">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <dt className="text-slate-500">Status</dt>
              <dd className={`mt-1 font-medium ${health.online ? 'text-emerald-300' : 'text-amber-300'}`}>{health.online ? 'Online' : 'Offline or unreachable'}</dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <dt className="text-slate-500">Host</dt>
              <dd className="mt-1 font-mono text-slate-200">{health.host}</dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <dt className="text-slate-500">Model order (fallback)</dt>
              <dd className="mt-1 space-y-0.5 font-mono">
                {health.preferredModels.map((m) => (
                  <div key={m} className={health.availableModels.includes(m) ? 'text-emerald-300' : 'text-slate-500 line-through'}>
                    {m}
                  </div>
                ))}
              </dd>
            </div>
          </dl>
        )}
        {health && !health.online && (
          <p className="mt-3 text-xs text-amber-200">
            Start Ollama and pull a model, e.g. <code className="font-mono">ollama pull llama3.2:3b</code>. The optimizer shows a clear error until then.
          </p>
        )}
      </section>

      <section className="card flex gap-3 p-5 text-xs text-slate-400">
        <ShieldCheck className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
        <div>
          <p className="font-medium text-slate-200">Guardrails on every request</p>
          <p className="mt-1">
            Schema-validated input, allow-listed models with automatic fallback, capped output length and temperature, per-IP rate limiting, and four timeouts
            (connect, first token, idle, total). Generation stops on the server when you press Stop or leave the page.
          </p>
        </div>
      </section>
    </div>
  );
}
