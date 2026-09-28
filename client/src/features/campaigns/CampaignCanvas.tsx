import { LoaderCircle, Pause, Play, Workflow } from 'lucide-react';
import { useState } from 'react';
import { LiveValue } from '../../components/LiveValue';
import { formatInt, formatPercent } from '../../lib/format';
import { useWorkspace } from '../../state/WorkspaceContext';
import { AiOptimizerPanel } from './AiOptimizerPanel';
import { CampaignCards } from './CampaignCards';
import { WorkflowCanvas } from './WorkflowCanvas';

export function CampaignCanvas() {
  const { campaigns, leads, hydrated, setCampaignStatus } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>('s1');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const campaign = campaigns.find((c) => c.id === selectedId) ?? campaigns[0];

  if (!hydrated) {
    return (
      <div className="grid h-64 place-items-center text-sm text-slate-500" role="status">
        <span className="flex items-center gap-2">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Waiting for live campaign data…
        </span>
      </div>
    );
  }
  if (!campaign) return <p className="p-6 text-sm text-slate-500">No sequences yet.</p>;

  const step = campaign.steps.find((s) => s.id === selectedNode);
  const enrolled = campaign.steps[0]?.inbound ?? 0;
  const overall = enrolled ? (campaign.meetingsBooked / enrolled) * 100 : 0;

  async function toggleStatus() {
    if (!campaign) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      await setCampaignStatus(campaign.id, campaign.status === 'Running' ? 'Paused' : 'Running');
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Could not update the sequence');
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-6">
      <CampaignCards campaigns={campaigns} selectedId={campaign.id} onSelect={(id) => setSelectedId(id)} />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section id="campaign-canvas-panel" role="tabpanel" aria-labelledby={`tab-${campaign.id}`} className="card overflow-hidden">
          <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-slate-100">
              <Workflow className="size-4 text-indigo-400" aria-hidden="true" /> Sequence workflow
            </h2>
            <span className="chip border-slate-700 text-slate-400">{campaign.compliance}</span>
            <span className="font-mono text-[11px] text-slate-400">
              <LiveValue value={enrolled} format={formatInt} /> enrolled · <span className="text-emerald-300">{formatPercent(overall)} → meeting</span>
            </span>
            <button className="btn btn-sm ml-auto" onClick={toggleStatus} disabled={statusBusy}>
              {statusBusy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : campaign.status === 'Running' ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
              {campaign.status === 'Running' ? 'Pause' : 'Resume'}
            </button>
            {statusError && (
              <p role="alert" className="w-full text-xs text-rose-300">
                {statusError}
              </p>
            )}
          </header>

          <WorkflowCanvas campaign={campaign} selectedNodeId={selectedNode} onSelectNode={setSelectedNode} />

          <footer className="border-t border-slate-800 px-4 py-3 text-xs">
            {step ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <span className="font-medium text-slate-200">
                  Day {step.day} · {step.title}
                </span>
                <span className="text-slate-500">{step.detail}</span>
                <span className="ml-auto font-mono text-slate-400">
                  {formatInt(step.done)} / {formatInt(step.inbound)} done · {formatPercent(step.conversionRate)} conversion
                </span>
              </div>
            ) : (
              <span className="text-slate-500">
                {selectedNode === 'trigger'
                  ? `Leads enter when intent ≥ ${campaign.trigger.intentMin} and ICP ≥ ${campaign.trigger.icpMin}.`
                  : selectedNode === 'outcome'
                    ? `${campaign.meetingsBooked} meetings booked from ${formatInt(enrolled)} enrolled.`
                    : 'Select a node to inspect it. Drag nodes to rearrange, drag the background to pan.'}
              </span>
            )}
          </footer>
        </section>

        <AiOptimizerPanel campaign={campaign} leads={leads} />
      </div>
    </div>
  );
}
