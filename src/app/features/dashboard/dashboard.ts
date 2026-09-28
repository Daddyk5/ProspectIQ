import { DecimalPipe } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { sparkPath } from '../../core/format';
import { LEADS, SIGNAL_KIND_LABEL } from '../../core/mock-data';
import { DashboardData, MarketSignal } from '../../core/models';
import { ProspectApi } from '../../core/prospect-api';
import { RadarLoader } from '../../loaders/radar-loader';
import { Icons, SIGNAL_ICON } from '../../shared/icons';
import { GeoPanel } from './geo-panel';

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, LucideAngularModule, RadarLoader, GeoPanel],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly api = inject(ProspectApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly icons = Icons;
  protected readonly signalIcon = SIGNAL_ICON;
  protected readonly kindLabel = SIGNAL_KIND_LABEL;
  protected readonly sparkPath = sparkPath;

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly feed = signal<MarketSignal[]>([]);
  protected readonly feedPaused = signal(false);

  protected readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  protected readonly hours = ['8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p'];
  protected readonly heatMax = computed(() => Math.max(...(this.data()?.callHeatmap.flat() ?? [1])));
  protected readonly bestSlot = computed(() => {
    const grid = this.data()?.callHeatmap ?? [];
    let best = { d: 0, h: 0, v: 0 };
    grid.forEach((row, d) => row.forEach((v, h) => v > best.v && (best = { d, h, v })));
    return best;
  });

  constructor() {
    this.load();
    afterNextRender(() => {
      const ticker = setInterval(() => {
        if (!this.data() || this.feedPaused()) return;
        this.feed.update((f) => [this.api.nextSignal(), ...f.map((s) => ({ ...s, minutesAgo: s.minutesAgo + 1 }))].slice(0, 8));
      }, 4500);
      this.destroyRef.onDestroy(() => clearInterval(ticker));
    });
  }

  protected load(): void {
    this.data.set(null);
    this.api
      .dashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        this.data.set(d);
        this.feed.set(d.signals);
      });
  }

  protected openSignal(s: MarketSignal): void {
    const lead = LEADS.find((l) => l.company === s.company);
    this.router.navigate(['/leads'], { queryParams: lead ? { open: lead.id } : { q: s.company } });
  }

  protected heatColor(v: number): string {
    const t = v / this.heatMax();
    return `rgb(16 185 129 / ${(0.06 + t * t * 0.9).toFixed(2)})`;
  }
}
