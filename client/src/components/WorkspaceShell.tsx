import { useState } from 'react';
import type { Session } from '../features/auth/auth-service';
import { CampaignCanvas } from '../features/campaigns/CampaignCanvas';
import { AiEngine } from '../features/engine/AiEngine';
import { LeadDiscovery } from '../features/leads/LeadDiscovery';
import { MarketIntelligence } from '../features/market/MarketIntelligence';
import { MODULES, Sidebar, type ModuleId } from './Sidebar';
import { TopBanner } from './TopBanner';

export function WorkspaceShell({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [active, setActive] = useState<ModuleId>('campaigns');
  const title = MODULES.find((m) => m.id === active)!.label;

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar active={active} onNavigate={setActive} session={session} onSignOut={onSignOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBanner title={title} />
        <main className={`min-h-0 flex-1 ${active === 'leads' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {active === 'market' && <MarketIntelligence />}
          {active === 'leads' && <LeadDiscovery />}
          {active === 'campaigns' && <CampaignCanvas />}
          {active === 'engine' && <AiEngine />}
        </main>
      </div>
    </div>
  );
}
