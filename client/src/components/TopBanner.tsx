import { Wifi, WifiOff } from 'lucide-react';
import { formatInt } from '../lib/format';
import { useWorkspace } from '../state/WorkspaceContext';
import { LiveValue } from './LiveValue';

const CONNECTION_LABEL = {
  connecting: 'Connecting…',
  open: 'Realtime connected',
  reconnecting: 'Reconnecting…',
  closed: 'Offline',
} as const;

export function TopBanner({ title }: { title: string }) {
  const { metrics, connection } = useWorkspace();
  const live = connection === 'open';

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-800 px-6">
      <h1 className="text-sm font-semibold text-white">{title}</h1>

      <div
        className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
        role="status"
        aria-live="off"
        aria-label={metrics ? `Live: ${formatInt(metrics.signalsToday)} signals today` : 'Loading live signals'}
      >
        <span className={`size-2 rounded-full ${live ? 'pulse-dot bg-emerald-400' : 'bg-amber-400'}`} aria-hidden="true" />
        <span className="font-medium">Live:</span>
        {metrics ? <LiveValue value={metrics.signalsToday} format={formatInt} className="font-mono font-semibold text-white" /> : <span className="text-emerald-300/60">—</span>}
        <span>signals today</span>
      </div>

      <div className={`ml-auto flex items-center gap-1.5 text-xs ${live ? 'text-slate-500' : 'text-amber-300'}`} role="status">
        {live ? <Wifi className="size-3.5" aria-hidden="true" /> : <WifiOff className="size-3.5" aria-hidden="true" />}
        {CONNECTION_LABEL[connection]}
      </div>
    </header>
  );
}
