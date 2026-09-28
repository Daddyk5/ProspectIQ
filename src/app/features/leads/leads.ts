import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { intentTone, money, scoreTone } from '../../core/format';
import { INDUSTRIES, LEADS } from '../../core/mock-data';
import { Currency, IntentLevel, Lead } from '../../core/models';
import { ProspectApi } from '../../core/prospect-api';
import { ToastService } from '../../core/toast.service';
import { EnrichmentLoader } from '../../loaders/enrichment-loader';
import { Icons } from '../../shared/icons';
import { LeadDrawer } from './lead-drawer';

type Region = 'ALL' | 'US' | 'CA';
type SortKey = 'icp' | 'reachability' | 'intentScore';
type RevenueBand = 'any' | 'small' | 'mid' | 'large';

const REVENUE_BANDS: Record<RevenueBand, [number, number]> = {
  any: [0, Infinity],
  small: [0, 50],
  mid: [50, 150],
  large: [150, Infinity],
};

@Component({
  selector: 'app-leads',
  imports: [LucideAngularModule, EnrichmentLoader, LeadDrawer],
  templateUrl: './leads.html',
})
export class Leads {
  private readonly api = inject(ProspectApi);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly icons = Icons;
  protected readonly industries = INDUSTRIES;
  protected readonly intents: IntentLevel[] = ['High', 'Medium', 'Low'];
  protected readonly scoreTone = scoreTone;
  protected readonly intentTone = intentTone;

  protected readonly leads = signal<Lead[] | null>(null);

  // Filters
  protected readonly region = signal<Region>('ALL');
  protected readonly industry = signal('');
  protected readonly currency = signal<Currency>('USD');
  protected readonly revenue = signal<RevenueBand>('any');
  protected readonly icpMin = signal(0);
  protected readonly intentFilter = signal<Set<IntentLevel>>(new Set());
  protected readonly query = signal('');
  protected readonly sortKey = signal<SortKey>('icp');

  // Selection & per-lead action state
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly openLead = signal<Lead | null>(null);
  protected readonly queued = signal<Set<string>>(new Set());
  protected readonly synced = signal<Map<string, string>>(new Map());
  protected readonly nurturing = signal<Set<string>>(new Set());

  protected readonly filtered = computed(() => {
    const all = this.leads() ?? [];
    const q = this.query().trim().toLowerCase();
    const [lo, hi] = REVENUE_BANDS[this.revenue()];
    const intents = this.intentFilter();
    return all
      .filter(
        (l) =>
          (this.region() === 'ALL' || l.country === this.region()) &&
          (!this.industry() || l.industry === this.industry()) &&
          l.revenueUsdM >= lo &&
          l.revenueUsdM < hi &&
          l.icp >= this.icpMin() &&
          (!intents.size || intents.has(l.intent)) &&
          (!q || `${l.company} ${l.contact} ${l.title} ${l.city} ${l.region}`.toLowerCase().includes(q)),
      )
      .sort((a, b) => b[this.sortKey()] - a[this.sortKey()]);
  });

  protected readonly allSelected = computed(
    () => this.filtered().length > 0 && this.filtered().every((l) => this.selected().has(l.id)),
  );
  protected readonly activeFilterCount = computed(
    () =>
      +(this.region() !== 'ALL') + +!!this.industry() + +(this.revenue() !== 'any') + +(this.icpMin() > 0) +
      +(this.intentFilter().size > 0) + +!!this.query(),
  );

  constructor() {
    this.load();
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((p) => {
        const region = p.get('region');
        if (region === 'US' || region === 'CA') this.region.set(region);
        const intent = p.get('intent') as IntentLevel | null;
        if (intent && this.intents.includes(intent)) this.intentFilter.set(new Set([intent]));
        if (p.has('icp')) this.icpMin.set(Number(p.get('icp')) || 0);
        if (p.has('q')) this.query.set(p.get('q') ?? '');
        const open = LEADS.find((l) => l.id === p.get('open'));
        if (open) this.openLead.set(open);
      });
  }

  protected load(): void {
    this.leads.set(null);
    this.api
      .leads()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((l) => this.leads.set(l));
  }

  protected revenueLabel(band: RevenueBand): string {
    const c = this.currency();
    return {
      any: 'Any revenue',
      small: `< ${money(50, c)}`,
      mid: `${money(50, c)} – ${money(150, c)}`,
      large: `> ${money(150, c)}`,
    }[band];
  }
  protected readonly bands: RevenueBand[] = ['any', 'small', 'mid', 'large'];
  protected money(l: Lead): string {
    return money(l.revenueUsdM, this.currency());
  }

  protected toggleIntent(level: IntentLevel): void {
    this.intentFilter.update((s) => {
      const next = new Set(s);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  }

  protected toggle(id: string, e?: Event): void {
    e?.stopPropagation();
    this.selected.update((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  protected toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.filtered().map((l) => l.id)));
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected resetFilters(): void {
    this.region.set('ALL');
    this.industry.set('');
    this.revenue.set('any');
    this.icpMin.set(0);
    this.intentFilter.set(new Set());
    this.query.set('');
  }

  // ── Actions ──

  protected pushToCrm(crm: 'Salesforce' | 'HubSpot', ids = [...this.selected()]): void {
    this.synced.update((m) => new Map([...m, ...ids.map((id): [string, string] => [id, crm])]));
    this.toast.show(`Pushed ${ids.length} ${ids.length === 1 ? 'lead' : 'leads'} to ${crm}`, 'Enrichment, intent score and call window attached to each record');
    this.selected.set(new Set());
  }

  protected addToQueue(ids = [...this.selected()], e?: Event): void {
    e?.stopPropagation();
    this.queued.update((s) => new Set([...s, ...ids]));
    this.toast.show(`${ids.length} added to AI Call Queue`, 'Dials are scheduled at each contact’s predicted phone-in-hand window', 'ai');
    this.selected.set(new Set());
  }

  protected startNurture(ids = [...this.selected()], e?: Event): void {
    e?.stopPropagation();
    this.nurturing.update((s) => new Set([...s, ...ids]));
    const ca = ids.filter((id) => LEADS.find((l) => l.id === id)?.country === 'CA').length;
    this.toast.show(
      `Email nurture triggered for ${ids.length}`,
      ca ? `${ca} Canadian ${ca === 1 ? 'contact' : 'contacts'} routed through the CASL consent check` : 'Hyper-personalized 3-step cadence',
      'ai',
    );
    this.selected.set(new Set());
  }
}
