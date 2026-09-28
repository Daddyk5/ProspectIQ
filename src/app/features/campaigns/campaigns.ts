import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { compact } from '../../core/format';
import { Campaign, CampaignStep } from '../../core/models';
import { ProspectApi } from '../../core/prospect-api';
import { ToastService } from '../../core/toast.service';
import { SequenceLoader } from '../../loaders/sequence-loader';
import { CHANNEL_ICON, Icons } from '../../shared/icons';

@Component({
  selector: 'app-campaigns',
  imports: [LucideAngularModule, SequenceLoader],
  templateUrl: './campaigns.html',
})
export class Campaigns {
  private readonly api = inject(ProspectApi);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private compileTimer?: ReturnType<typeof setTimeout>;

  protected readonly icons = Icons;
  protected readonly channelIcon = CHANNEL_ICON;
  protected readonly compact = compact;

  protected readonly campaigns = signal<Campaign[] | null>(null);
  protected readonly activeId = signal('c-ca');
  protected readonly compiling = signal(false);
  protected readonly selectedStepId = signal<string | null>('s1');

  protected readonly campaign = computed(() => this.campaigns()?.find((c) => c.id === this.activeId()) ?? null);
  protected readonly selectedStep = computed(() => this.campaign()?.steps.find((s) => s.id === this.selectedStepId()) ?? null);
  protected readonly maxEntered = computed(() => Math.max(...(this.campaign()?.steps.map((s) => s.entered) ?? [1])));
  protected readonly overallConversion = computed(() => {
    const c = this.campaign();
    return c ? ((c.meetings / c.steps[0].entered) * 100).toFixed(1) : '0';
  });

  constructor() {
    this.api
      .campaigns()
      .pipe(takeUntilDestroyed())
      .subscribe((c) => this.campaigns.set(c));
    this.destroyRef.onDestroy(() => clearTimeout(this.compileTimer));
  }

  protected switchTo(id: string): void {
    if (id === this.activeId()) return;
    this.activeId.set(id);
    this.selectedStepId.set('s1');
    this.compiling.set(true);
    clearTimeout(this.compileTimer);
    this.compileTimer = setTimeout(() => this.compiling.set(false), 1100);
  }

  protected toggleStatus(): void {
    const c = this.campaign();
    if (!c) return;
    const status = c.status === 'Running' ? 'Paused' : 'Running';
    this.patchCampaign({ status });
    this.toast.show(`${c.name} ${status === 'Running' ? 'resumed' : 'paused'}`, status === 'Running' ? 'AI call windows re-synced for all enrolled contacts' : 'Pending touchpoints are held; CRM sync continues', 'info');
  }

  protected updateStep(patch: Partial<CampaignStep>): void {
    const c = this.campaign();
    const id = this.selectedStepId();
    if (!c || !id) return;
    this.patchCampaign({ steps: c.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  protected optimize(): void {
    this.toast.show('AI optimization applied', 'Call window shifted to 9:30–11:00 local; email subject A/B test queued. Projected +2.3 meetings/week', 'ai');
  }

  protected stepConversionTone(s: CampaignStep): string {
    return s.conversion >= 30 ? 'text-emerald-300' : s.conversion >= 15 ? 'text-indigo-300' : 'text-slate-300';
  }

  private patchCampaign(patch: Partial<Campaign>): void {
    this.campaigns.update((list) => list?.map((c) => (c.id === this.activeId() ? { ...c, ...patch } : c)) ?? null);
  }
}
