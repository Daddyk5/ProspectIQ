import { Cpu, LayoutDashboard, LogOut, Radar, Sparkles, Users, Workflow, type LucideIcon } from 'lucide-react';
import { formatInt } from '../lib/format';
import { useWorkspace } from '../state/WorkspaceContext';
import type { Session } from '../features/auth/auth-service';

export type ModuleId = 'market' | 'leads' | 'campaigns' | 'engine';

export const MODULES: { id: ModuleId; label: string; icon: LucideIcon }[] = [
  { id: 'market', label: 'Market Intelligence', icon: LayoutDashboard },
  { id: 'leads', label: 'Lead Discovery', icon: Users },
  { id: 'campaigns', label: 'Campaign Canvas', icon: Workflow },
  { id: 'engine', label: 'AI Engine', icon: Cpu },
];

interface Props {
  active: ModuleId;
  onNavigate: (id: ModuleId) => void;
  session: Session;
  onSignOut: () => void;
}

export function Sidebar({ active, onNavigate, session, onSignOut }: Props) {
  const { metrics } = useWorkspace();
  const credits = metrics?.credits;
  const pct = credits ? Math.min(100, (credits.used / credits.limit) * 100) : 0;
  const initials = session.user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950/80">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="grid size-7 place-items-center rounded-lg bg-brand shadow-[0_0_18px_rgb(99_102_241/0.5)]">
          <Radar className="size-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          Prospect<span className="text-indigo-400">IQ</span>
        </span>
        <span className="ml-auto rounded border border-slate-700 px-1 font-mono text-[10px] text-slate-500">US·CA</span>
      </div>

      <nav aria-label="Workspace" className="flex-1 space-y-0.5 px-3">
        <div className="eyebrow px-2 pt-3 pb-1.5">Workspace</div>
        {MODULES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={active === id ? 'page' : undefined}
            className={`flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-left text-[13px] transition-colors ${
              active === id ? 'bg-slate-800/80 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Icon className={`size-4 ${active === id ? 'text-indigo-400' : ''}`} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      <section aria-labelledby="ai-credits-title" className="m-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.07] p-3">
        <h2 id="ai-credits-title" className="flex items-center gap-1.5 text-xs font-medium text-indigo-200">
          <Sparkles className="size-3.5" aria-hidden="true" /> AI Credits
        </h2>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-label="AI credits used this month"
          aria-valuemin={0}
          aria-valuemax={credits?.limit ?? 0}
          aria-valuenow={credits?.used ?? 0}
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-slate-400 tabular-nums">
          {credits ? `${formatInt(credits.used)} / ${formatInt(credits.limit)} this month` : 'Loading…'}
        </p>
      </section>

      <div className="flex items-center gap-2.5 border-t border-slate-800 p-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-emerald-400 to-brand text-[11px] font-semibold text-white">{initials}</div>
        <div className="min-w-0 flex-1 text-xs">
          <div className="truncate font-medium text-slate-200">{session.user.name}</div>
          <div className="truncate text-slate-500">{session.user.org}</div>
        </div>
        <button onClick={onSignOut} className="btn btn-sm border-transparent bg-transparent px-1.5 text-slate-500 hover:text-slate-200" aria-label="Sign out">
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
