import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, switchMap, tap } from 'rxjs';
import { intentTone, money, scoreTone, sparkPath } from '../../core/format';
import { SIGNAL_KIND_LABEL } from '../../core/mock-data';
import { Account360, CopilotKind, Currency, EntryPath, Lead } from '../../core/models';
import { CopilotChunk, ProspectApi } from '../../core/prospect-api';
import { ToastService } from '../../core/toast.service';
import { GraphLoader } from '../../loaders/graph-loader';
import { TokenStreamLoader } from '../../loaders/token-stream-loader';
import { Icons, SIGNAL_ICON } from '../../shared/icons';

type Tab = 'intel' | 'pathway' | 'copilot';

const COPILOT_OPTIONS: { kind: CopilotKind; label: string; noun: string; icon: typeof Icons.Phone }[] = [
  { kind: 'phone', label: 'Phone script', noun: 'phone script', icon: Icons.Phone },
  { kind: 'email', label: 'Email cadence', noun: '3-step email cadence', icon: Icons.Mail },
  { kind: 'objections', label: 'Objection counters', noun: 'objection handling', icon: Icons.MessageSquare },
  { kind: 'roleplay', label: 'Roleplay practice', noun: 'roleplay simulation', icon: Icons.Mic },
];

@Component({
  selector: 'app-lead-drawer',
  imports: [LucideAngularModule, GraphLoader, TokenStreamLoader],
  templateUrl: './lead-drawer.html',
  host: { '(document:keydown.escape)': 'close.emit()' },
})
export class LeadDrawer {
  readonly lead = input.required<Lead>();
  readonly currency = input<Currency>('USD');
  readonly close = output<void>();
  readonly queue = output<void>();
  readonly nurture = output<void>();
  readonly crm = output<'Salesforce' | 'HubSpot'>();

  private readonly api = inject(ProspectApi);
  private readonly toast = inject(ToastService);

  protected readonly icons = Icons;
  protected readonly signalIcon = SIGNAL_ICON;
  protected readonly kindLabel = SIGNAL_KIND_LABEL;
  protected readonly scoreTone = scoreTone;
  protected readonly intentTone = intentTone;
  protected readonly copilotOptions = COPILOT_OPTIONS;
  protected readonly months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

  protected readonly tab = signal<Tab>('intel');
  protected readonly data = signal<Account360 | null>(null);

  protected readonly copilotKind = signal<CopilotKind | null>(null);
  protected readonly drafting = signal(false);
  protected readonly draft = signal('');
  protected readonly streaming = signal(false);
  protected readonly draftSource = signal<CopilotChunk['source'] | null>(null);
  protected readonly aiStatus = toSignal(this.api.aiStatus());
  private copilotSub?: Subscription;

  protected readonly revenue = computed(() => money(this.lead().revenueUsdM, this.currency()));
  protected readonly copilotNoun = computed(() => COPILOT_OPTIONS.find((o) => o.kind === this.copilotKind())?.noun ?? '');

  protected readonly headcount = computed(() => {
    const s = this.data()?.headcountSeries ?? [];
    if (!s.length) return null;
    const line = sparkPath(s, 320, 96, 6);
    return { line, area: `${line} L314,96 L6,96 Z`, min: Math.min(...s), max: Math.max(...s) };
  });

  /** Tiers ordered C-Suite → Manager, positioned for the pathway graph. */
  protected readonly paths = computed(() =>
    [...(this.data()?.pathway ?? [])].reverse().map((p, i) => ({ ...p, y: 28 + i * 48 })),
  );
  protected readonly bestPath = computed(() => this.data()?.pathway.find((p) => p.recommended));
  protected readonly cSuite = computed(() => this.data()?.pathway.find((p) => p.tier === 'C-Suite'));

  constructor() {
    toObservable(this.lead)
      .pipe(
        tap(() => {
          this.data.set(null);
          this.resetCopilot();
        }),
        switchMap((l) => this.api.account360(l)),
        takeUntilDestroyed(),
      )
      .subscribe((d) => this.data.set(d));

    inject(DestroyRef).onDestroy(() => this.resetCopilot());
  }

  protected generate(kind: CopilotKind): void {
    this.resetCopilot();
    this.copilotKind.set(kind);
    this.drafting.set(true);
    this.copilotSub = this.api.copilot(this.lead(), kind).subscribe({
      next: ({ text, source }) => {
        this.drafting.set(false);
        this.streaming.set(true);
        this.draftSource.set(source);
        this.draft.set(text);
      },
      complete: () => {
        this.drafting.set(false);
        this.streaming.set(false);
      },
    });
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.draft());
      this.toast.show('Copied to clipboard', undefined, 'info');
    } catch {
      this.toast.show('Clipboard unavailable', 'Select the text and copy it manually', 'info');
    }
  }

  protected curve(p: EntryPath & { y: number }): string {
    return `M52,106 C130,106 120,${p.y} 196,${p.y}`;
  }

  private resetCopilot(): void {
    this.copilotSub?.unsubscribe();
    this.copilotKind.set(null);
    this.draftSource.set(null);
    this.drafting.set(false);
    this.streaming.set(false);
    this.draft.set('');
  }
}
