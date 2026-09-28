import { CircleAlert, KeyRound, LoaderCircle, Maximize2 } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { env } from '../../lib/env';
import { LeadMapController } from '../../services/maps/lead-map';
import type { Campaign, Lead } from '../../types';

export interface LeadMapHandle {
  focus: (leadId: string) => void;
}

interface Props {
  leads: Lead[];
  campaigns: Campaign[];
  onEnroll: (leadId: string, sequenceId: string) => Promise<void>;
  apiKey?: string;
  mapId?: string;
}

/** React wrapper around LeadMapController: creates the map once, then streams data into it. */
export const LeadMap = forwardRef<LeadMapHandle, Props>(function LeadMap(
  { leads, campaigns, onEnroll, apiKey = env.googleMapsApiKey, mapId = env.googleMapsMapId },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<LeadMapController | null>(null);
  const onEnrollRef = useRef(onEnroll);
  onEnrollRef.current = onEnroll;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-key'>(apiKey ? 'loading' : 'no-key');
  const [error, setError] = useState('');

  useImperativeHandle(ref, () => ({ focus: (id) => controllerRef.current?.focus(id) }), []);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let cancelled = false;
    LeadMapController.create(containerRef.current, {
      apiKey,
      mapId,
      campaigns,
      onEnroll: (leadId, seq) => onEnrollRef.current(leadId, seq),
    })
      .then((c) => {
        if (cancelled) return c.destroy();
        controllerRef.current = c;
        c.setLeads(leads);
        c.fitToLeads();
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Google Maps failed to load');
        setStatus('error');
      });
    return () => {
      cancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
    // The map is created once per key/mapId; data flows in through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, mapId]);

  useEffect(() => controllerRef.current?.setLeads(leads), [leads]);
  useEffect(() => controllerRef.current?.setCampaigns(campaigns), [campaigns]);

  // Google Maps reports auth failures (bad key, referrer not allowed) through this global hook.
  useEffect(() => {
    const w = window as unknown as { gm_authFailure?: () => void };
    w.gm_authFailure = () => {
      setError('Google rejected the API key. Check that the Maps JavaScript API is enabled and this origin is allowed.');
      setStatus('error');
    };
    return () => {
      delete w.gm_authFailure;
    };
  }, []);

  return (
    <div className="relative size-full bg-slate-950">
      <div ref={containerRef} className="size-full" role="region" aria-label="Map of prospects by headquarters location" />

      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center text-sm text-slate-400" role="status">
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Loading map…
          </span>
        </div>
      )}

      {status === 'ready' && (
        <button className="btn btn-sm absolute top-3 left-3 bg-slate-900/90" onClick={() => controllerRef.current?.fitToLeads()}>
          <Maximize2 className="size-3.5" aria-hidden="true" /> Fit all
        </button>
      )}

      {(status === 'no-key' || status === 'error') && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-xs">
            {status === 'no-key' ? <KeyRound className="mx-auto size-7 text-slate-500" aria-hidden="true" /> : <CircleAlert className="mx-auto size-7 text-rose-400" aria-hidden="true" />}
            <p className="mt-2 text-sm font-medium text-slate-200">{status === 'no-key' ? 'Google Maps is not configured' : 'The map could not load'}</p>
            <p className="mt-1 text-xs text-slate-500">
              {status === 'no-key' ? (
                <>
                  Set <code className="text-slate-300">VITE_GOOGLE_MAPS_API_KEY</code> in <code className="text-slate-300">client/.env</code> and restart the dev server.
                  All {leads.length} prospects are still listed in the table.
                </>
              ) : (
                error
              )}
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-3 rounded-md border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-[10px] text-slate-400">
        {(['High', 'Medium', 'Low'] as const).map((t) => (
          <span key={t} className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: t === 'High' ? '#F43F5E' : t === 'Medium' ? '#F59E0B' : '#64748B' }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
});
