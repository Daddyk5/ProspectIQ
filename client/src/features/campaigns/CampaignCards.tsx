import { CalendarCheck, DollarSign, MapPin } from 'lucide-react';
import { LiveValue } from '../../components/LiveValue';
import { formatInt, formatMillions } from '../../lib/format';
import type { Campaign } from '../../types';

interface Props {
  campaigns: Campaign[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CampaignCards({ campaigns, selectedId, onSelect }: Props) {
  return (
    <div role="tablist" aria-label="Active sequences" className="flex gap-3 overflow-x-auto pb-1">
      {campaigns.map((c) => {
        const selected = c.id === selectedId;
        return (
          <button
            key={c.id}
            role="tab"
            id={`tab-${c.id}`}
            aria-selected={selected}
            aria-controls="campaign-canvas-panel"
            onClick={() => onSelect(c.id)}
            className={`min-w-72 cursor-pointer rounded-xl border p-4 text-left transition-colors ${
              selected ? 'border-brand bg-indigo-500/10 shadow-[0_0_0_3px_rgb(99_102_241/0.15)]' : 'border-slate-800 bg-slate-800/20 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${c.status === 'Running' ? 'pulse-dot bg-emerald-400' : 'bg-amber-400'}`} aria-hidden="true" />
              <span className="truncate text-sm font-semibold text-slate-100">{c.name}</span>
              <span className="chip ml-auto border-slate-700 text-slate-400">{c.status}</span>
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">{c.audience}</div>

            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="flex items-center gap-1 text-slate-500">
                  <CalendarCheck className="size-3" aria-hidden="true" /> Meetings
                </dt>
                <dd className="mt-0.5 text-base font-semibold text-white">
                  <LiveValue value={c.meetingsBooked} format={formatInt} />
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-slate-500">
                  <DollarSign className="size-3" aria-hidden="true" /> Pipeline
                </dt>
                <dd className="mt-0.5 text-base font-semibold text-emerald-300">
                  <LiveValue value={c.pipelineUsd} format={formatMillions} />
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-slate-500">
                  <MapPin className="size-3" aria-hidden="true" /> Geos
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {c.activeGeos.map((g) => (
                    <span key={g} className="rounded bg-slate-700/50 px-1 font-mono text-[10px] text-slate-300">
                      {g}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </button>
        );
      })}
    </div>
  );
}
