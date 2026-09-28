import { CalendarCheck, Cloud, Mail, Maximize2, Minus, Phone, Plus, RotateCcw, Sparkles, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { LiveValue } from '../../components/LiveValue';
import { formatInt, formatMillions, formatPercent } from '../../lib/format';
import type { Campaign, CampaignStep, Channel } from '../../types';
import { LinkedInIcon } from '../auth/BrandIcons';

const NODE_W = 232;
const PORT_Y = 46; // edge anchor, measured from the node's top
const GAP_X = 72;

type NodeModel =
  | { id: 'trigger'; kind: 'trigger' }
  | { id: string; kind: 'step'; step: CampaignStep }
  | { id: 'outcome'; kind: 'outcome' };

type Point = { x: number; y: number };

const CHANNEL: Record<Channel, { icon: (p: { className?: string }) => ReactNode; tone: string; label: string }> = {
  call: { icon: (p) => <Phone {...p} aria-hidden="true" />, tone: 'bg-emerald-500/15 text-emerald-300', label: 'Call' },
  email: { icon: (p) => <Mail {...p} aria-hidden="true" />, tone: 'bg-indigo-500/15 text-indigo-300', label: 'Email' },
  linkedin: { icon: (p) => <LinkedInIcon className={p.className} />, tone: 'bg-sky-500/15 text-sky-300', label: 'LinkedIn' },
  crm: { icon: (p) => <Cloud {...p} aria-hidden="true" />, tone: 'bg-violet-500/15 text-violet-300', label: 'CRM' },
};

function defaultLayout(nodes: NodeModel[]): Record<string, Point> {
  return Object.fromEntries(nodes.map((n, i) => [n.id, { x: 32 + i * (NODE_W + GAP_X), y: 48 + (i % 2) * 28 }]));
}

interface Props {
  campaign: Campaign;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

/**
 * Interactive node graph for one sequence: drag nodes (mouse, touch or arrow
 * keys), pan the canvas, zoom with the controls or Ctrl/⌘ + wheel. Metrics in
 * each node are bound to live campaign state. Layout is UI-only and kept per sequence.
 */
export function WorkflowCanvas({ campaign, selectedNodeId, onSelectNode }: Props) {
  const nodes = useMemo<NodeModel[]>(
    () => [{ id: 'trigger', kind: 'trigger' }, ...campaign.steps.map((step) => ({ id: step.id, kind: 'step' as const, step })), { id: 'outcome', kind: 'outcome' }],
    [campaign.steps],
  );

  const [layouts, setLayouts] = useState<Record<string, Record<string, Point>>>({});
  const positions = layouts[campaign.id] ?? defaultLayout(nodes);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: 'node' | 'pan'; id?: string; startX: number; startY: number; origin: Point; moved: boolean } | null>(null);

  const setPos = useCallback(
    (id: string, p: Point) => setLayouts((all) => ({ ...all, [campaign.id]: { ...(all[campaign.id] ?? defaultLayout(nodes)), [id]: p } })),
    [campaign.id, nodes],
  );

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const pts = Object.values(positions);
    const width = Math.max(...pts.map((p) => p.x)) + NODE_W + 32;
    const zoom = Math.max(0.45, Math.min(1, el.clientWidth / width));
    setView({ x: 0, y: 0, zoom });
  }, [positions]);

  useEffect(() => {
    fit();
    // refit only when switching sequence, not on every drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  // Ctrl/⌘ + wheel zoom (needs a non-passive listener to prevent page zoom).
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setView((v) => ({ ...v, zoom: Math.min(1.6, Math.max(0.4, v.zoom * (e.deltaY < 0 ? 1.1 : 0.9))) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function onPointerDown(e: ReactPointerEvent, id?: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode: id ? 'node' : 'pan', id, startX: e.clientX, startY: e.clientY, origin: id ? positions[id] : { x: view.x, y: view.y }, moved: false };
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (!d.moved) return;
    if (d.mode === 'node' && d.id) setPos(d.id, { x: Math.round(d.origin.x + dx / view.zoom), y: Math.round(d.origin.y + dy / view.zoom) });
    else setView((v) => ({ ...v, x: d.origin.x + dx, y: d.origin.y + dy }));
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (d?.mode === 'node' && d.id && !d.moved) onSelectNode(d.id);
  }

  function onNodeKey(e: KeyboardEvent, id: string) {
    const step = e.shiftKey ? 48 : 16;
    const delta: Record<string, Point> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    if (delta[e.key]) {
      e.preventDefault();
      setPos(id, { x: positions[id].x + delta[e.key].x, y: positions[id].y + delta[e.key].y });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectNode(id);
    }
  }

  const running = campaign.status === 'Running';
  const edges = nodes.slice(1).map((n, i) => {
    const a = positions[nodes[i].id];
    const b = positions[n.id];
    const x1 = a.x + NODE_W;
    const y1 = a.y + PORT_Y;
    const x2 = b.x;
    const y2 = b.y + PORT_Y;
    const c = Math.max(40, Math.abs(x2 - x1) / 2);
    const prev = nodes[i];
    const label =
      n.kind === 'step' && prev.kind === 'step' ? `+${n.step.day - prev.step.day}d` : n.kind === 'step' ? 'enroll' : 'booked';
    return { id: `${nodes[i].id}->${n.id}`, d: `M${x1},${y1} C${x1 + c},${y1} ${x2 - c},${y2} ${x2},${y2}`, mid: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, label };
  });

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10 flex gap-1 rounded-lg border border-slate-700 bg-slate-900/90 p-1" role="toolbar" aria-label="Canvas controls">
        <button className="btn btn-sm border-transparent bg-transparent px-1.5" aria-label="Zoom out" onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.4, v.zoom - 0.1) }))}>
          <Minus className="size-3.5" aria-hidden="true" />
        </button>
        <span className="grid w-11 place-items-center font-mono text-[11px] text-slate-400 tabular-nums" aria-live="polite">
          {Math.round(view.zoom * 100)}%
        </span>
        <button className="btn btn-sm border-transparent bg-transparent px-1.5" aria-label="Zoom in" onClick={() => setView((v) => ({ ...v, zoom: Math.min(1.6, v.zoom + 0.1) }))}>
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
        <button className="btn btn-sm border-transparent bg-transparent px-1.5" aria-label="Fit to screen" onClick={fit}>
          <Maximize2 className="size-3.5" aria-hidden="true" />
        </button>
        <button
          className="btn btn-sm border-transparent bg-transparent px-1.5"
          aria-label="Reset layout"
          onClick={() => {
            setLayouts((all) => {
              const next = { ...all };
              delete next[campaign.id];
              return next;
            });
            setView({ x: 0, y: 0, zoom: view.zoom });
          }}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={viewportRef}
        className="relative h-[380px] cursor-grab touch-none overflow-hidden bg-[radial-gradient(rgb(51_65_85/0.55)_1px,transparent_1px)] bg-size-[18px_18px] select-none active:cursor-grabbing"
        onPointerDown={(e) => onPointerDown(e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`Workflow for ${campaign.name}. Use Tab to focus a node and arrow keys to move it.`}
        role="application"
      >
        <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
          <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1" aria-hidden="true">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
              </marker>
            </defs>
            {edges.map((e) => (
              <g key={e.id}>
                <path d={e.d} fill="none" stroke="#334155" strokeWidth={2} markerEnd="url(#arrow)" />
                {running && <path d={e.d} fill="none" stroke="#818cf8" strokeWidth={2} className="edge-flow" />}
                <text x={e.mid.x} y={e.mid.y - 8} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="JetBrains Mono, monospace">
                  {e.label}
                </text>
              </g>
            ))}
          </svg>

          {nodes.map((n) => {
            const p = positions[n.id];
            const selected = selectedNodeId === n.id;
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={nodeLabel(n, campaign)}
                onPointerDown={(e) => onPointerDown(e, n.id)}
                onKeyDown={(e) => onNodeKey(e, n.id)}
                className={`absolute cursor-pointer rounded-xl border bg-slate-900 p-3 shadow-lg shadow-black/30 transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  selected ? 'border-brand shadow-[0_0_0_4px_rgb(99_102_241/0.18)]' : n.kind === 'outcome' ? 'border-emerald-500/40' : n.kind === 'trigger' ? 'border-dashed border-slate-600' : 'border-slate-700 hover:border-slate-500'
                }`}
                style={{ left: p.x, top: p.y, width: NODE_W }}
              >
                <NodeBody node={n} campaign={campaign} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function nodeLabel(n: NodeModel, c: Campaign): string {
  if (n.kind === 'trigger') return `Trigger: Intent at least ${c.trigger.intentMin} and ICP at least ${c.trigger.icpMin}`;
  if (n.kind === 'outcome') return `Outcome: ${c.meetingsBooked} meetings booked`;
  return `Day ${n.step.day} ${n.step.title}: ${n.step.inbound} inbound, ${n.step.done} done, ${n.step.conversionRate}% conversion`;
}

function NodeBody({ node, campaign }: { node: NodeModel; campaign: Campaign }) {
  if (node.kind === 'trigger') {
    return (
      <>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <span className="grid size-7 place-items-center rounded-lg bg-amber-500/15 text-amber-300">
            <Zap className="size-4" aria-hidden="true" />
          </span>
          Trigger
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <span className="chip border-rose-500/30 bg-rose-500/10 text-rose-200">Intent ≥ {campaign.trigger.intentMin}</span>
          <span className="text-slate-500">&amp;</span>
          <span className="chip border-indigo-500/30 bg-indigo-500/10 text-indigo-200">ICP ≥ {campaign.trigger.icpMin}</span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-slate-500">Qualified leads enter the sequence automatically.</p>
      </>
    );
  }

  if (node.kind === 'outcome') {
    return (
      <>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
          <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
            <CalendarCheck className="size-4" aria-hidden="true" />
          </span>
          Meetings booked
        </div>
        <div className="mt-2 text-3xl font-semibold text-white">
          <LiveValue value={campaign.meetingsBooked} format={formatInt} />
        </div>
        <div className="font-mono text-[11px] text-emerald-300/80">
          <LiveValue value={campaign.pipelineUsd} format={formatMillions} /> pipeline
        </div>
      </>
    );
  }

  const { step } = node;
  const ch = CHANNEL[step.channel];
  const completion = step.inbound ? (step.done / step.inbound) * 100 : 0;
  return (
    <>
      <div className="flex items-center gap-2">
        <span className={`grid size-7 place-items-center rounded-lg ${ch.tone}`}>{ch.icon({ className: 'size-4' })}</span>
        <span className="font-mono text-[10px] tracking-wider text-slate-500 uppercase">Day {step.day}</span>
        {step.channel !== 'crm' && (
          <span className="chip ml-auto border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
            <Sparkles className="size-2.5" aria-hidden="true" /> AI
          </span>
        )}
      </div>
      <div className="mt-2 text-[13px] leading-snug font-semibold text-slate-100">
        Day {step.day} {step.title}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-800 pt-2 font-mono text-[11px]">
        <div>
          <dt className="text-[9px] tracking-wide text-slate-500 uppercase">Inbound</dt>
          <dd className="text-slate-200">
            <LiveValue value={step.inbound} format={formatInt} />
          </dd>
        </div>
        <div>
          <dt className="text-[9px] tracking-wide text-slate-500 uppercase">Done</dt>
          <dd className="text-slate-200">
            <LiveValue value={step.done} format={formatInt} />
          </dd>
        </div>
        <div>
          <dt className="text-[9px] tracking-wide text-slate-500 uppercase">Conv. rate</dt>
          <dd className={step.conversionRate >= 30 ? 'text-emerald-300' : step.conversionRate >= 15 ? 'text-indigo-300' : 'text-slate-300'}>
            <LiveValue value={step.conversionRate} format={(n) => formatPercent(n)} />
          </dd>
        </div>
      </dl>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
        <div className="h-full rounded-full bg-linear-to-r from-brand to-go transition-[width] duration-500" style={{ width: `${completion}%` }} />
      </div>
    </>
  );
}
