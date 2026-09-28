import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { compact } from '../../core/format';
import { GeoRegion } from '../../core/models';
import { Icons } from '../../shared/icons';

type Scope = 'ALL' | 'US' | 'CA';
type Measure = 'accounts' | 'connectRate';

@Component({
  selector: 'app-geo-panel',
  imports: [LucideAngularModule, RouterLink],
  template: `
    <div class="card">
      <div class="card-header flex-wrap">
        <div>
          <div class="card-title">TAM geographic split</div>
          <div class="text-[11px] text-slate-500">{{ totalAccounts() }} ICP accounts · {{ scopeLabel() }}</div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="seg" role="group" aria-label="Country">
            @for (s of scopes; track s) {
              <button [attr.aria-pressed]="scope() === s" (click)="scope.set(s)">{{ s === 'ALL' ? 'US + CA' : s }}</button>
            }
          </div>
          <div class="seg" role="group" aria-label="Measure">
            <button [attr.aria-pressed]="measure() === 'accounts'" (click)="measure.set('accounts')">Density</button>
            <button [attr.aria-pressed]="measure() === 'connectRate'" (click)="measure.set('connectRate')">Connect %</button>
          </div>
          <div class="seg" role="group" aria-label="View">
            <button [attr.aria-pressed]="view() === 'map'" (click)="view.set('map')" aria-label="Map view"><lucide-icon [img]="icons.Map" [size]="14" /></button>
            <button [attr.aria-pressed]="view() === 'chart'" (click)="view.set('chart')" aria-label="Chart view"><lucide-icon [img]="icons.ChartColumn" [size]="14" /></button>
          </div>
        </div>
      </div>

      <div class="grid gap-4 p-4 lg:grid-cols-[1fr_220px]">
        @if (view() === 'map') {
          <div class="animate-fade-in">
            <div class="grid grid-cols-12 gap-1">
              @for (r of regions(); track r.code) {
                <button
                  class="relative aspect-square rounded-[5px] border text-[9px] font-semibold transition-all duration-150 hover:z-10 hover:scale-110 sm:text-[10px]"
                  [style.grid-row]="r.row + 1"
                  [style.grid-column]="r.col + 1"
                  [style.background-color]="fill(r)"
                  [class]="selected()?.code === r.code ? 'border-white text-white ring-2 ring-white/40' : inScope(r) ? 'border-white/5 text-white/80' : 'border-transparent text-slate-600 opacity-30'"
                  [title]="r.name + ' · ' + r.accounts.toLocaleString('en-US') + ' accounts'"
                  (click)="selected.set(r)"
                >
                  {{ r.code }}
                </button>
              }
              <div class="self-center text-[10px] text-slate-600" style="grid-column: 1 / 7; grid-row: 3">
                ▲ Canada &nbsp; ▼ United States
              </div>
            </div>
            <div class="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
              <span>{{ measure() === 'accounts' ? 'Fewer accounts' : 'Lower connect' }}</span>
              <div class="h-1.5 w-32 rounded-full" [style.background]="'linear-gradient(90deg,' + rampLow + ',' + rampHigh + ')'"></div>
              <span>{{ measure() === 'accounts' ? 'Denser' : 'Higher connect' }}</span>
            </div>
          </div>
        } @else {
          <ul class="space-y-1.5 animate-fade-in">
            @for (r of ranked(); track r.code; let i = $index) {
              <li>
                <button class="group flex w-full items-center gap-3 text-left text-xs" (click)="selected.set(r)">
                  <span class="w-7 font-mono text-slate-500">{{ r.code }}</span>
                  <span class="relative h-5 flex-1 overflow-hidden rounded bg-slate-800/60">
                    <span class="absolute inset-y-0 left-0 rounded transition-[width] duration-500"
                          [class]="r.country === 'CA' ? 'bg-emerald-500/60 group-hover:bg-emerald-400/70' : 'bg-brand/70 group-hover:bg-indigo-400/80'"
                          [style.width.%]="(value(r) / maxValue()) * 100"
                          [style.transition-delay.ms]="i * 30"></span>
                    <span class="absolute inset-y-0 left-2 flex items-center text-[11px] text-white/90">{{ r.name }}</span>
                  </span>
                  <span class="w-14 text-right font-mono text-slate-300 tabular-nums">{{ display(r) }}</span>
                </button>
              </li>
            }
            <li class="flex gap-3 pt-2 text-[10px] text-slate-500">
              <span class="flex items-center gap-1"><span class="size-2 rounded-sm bg-brand/70"></span>US</span>
              <span class="flex items-center gap-1"><span class="size-2 rounded-sm bg-emerald-500/60"></span>Canada</span>
            </li>
          </ul>
        }

        <aside class="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          @if (selected(); as r) {
            <div class="animate-fade-in">
              <div class="flex items-center gap-2">
                <span class="chip border-slate-700 text-slate-300">{{ r.country }}</span>
                <span class="text-sm font-semibold text-white">{{ r.name }}</span>
              </div>
              <dl class="mt-3 space-y-2.5 text-xs">
                <div class="flex justify-between"><dt class="text-slate-500">ICP accounts</dt><dd class="font-mono text-slate-200 tabular-nums">{{ r.accounts.toLocaleString('en-US') }}</dd></div>
                <div>
                  <div class="flex justify-between"><dt class="text-slate-500">Coverage</dt><dd class="font-mono text-slate-200 tabular-nums">{{ r.coverage }}%</dd></div>
                  <div class="mt-1 h-1 rounded-full bg-slate-800"><div class="h-full rounded-full bg-brand" [style.width.%]="r.coverage"></div></div>
                </div>
                <div class="flex justify-between"><dt class="text-slate-500">Live connect</dt><dd class="font-mono text-emerald-300 tabular-nums">{{ r.connectRate }}%</dd></div>
                <div class="flex justify-between"><dt class="text-slate-500">Compliance</dt><dd class="text-slate-300">{{ r.country === 'CA' ? 'CASL' : 'TCPA' }}</dd></div>
              </dl>
              <a class="btn btn-primary mt-4 w-full justify-center" routerLink="/leads" [queryParams]="{ q: r.code }">
                View leads <lucide-icon [img]="icons.ArrowRight" [size]="13" />
              </a>
            </div>
          } @else {
            <div class="grid h-full place-items-center py-6 text-center text-xs text-slate-500">
              <div>
                <lucide-icon [img]="icons.MapPin" [size]="18" class="mx-auto mb-2 text-slate-600" />
                Select a state or province<br />to see its market detail
              </div>
            </div>
          }
        </aside>
      </div>
    </div>
  `,
})
export class GeoPanel {
  readonly regions = input.required<GeoRegion[]>();

  protected readonly icons = Icons;
  protected readonly scopes: Scope[] = ['ALL', 'US', 'CA'];
  protected readonly scope = signal<Scope>('ALL');
  protected readonly measure = signal<Measure>('accounts');
  protected readonly view = signal<'map' | 'chart'>('map');
  protected readonly selected = signal<GeoRegion | null>(null);
  protected readonly rampLow = 'rgb(30 41 59)';
  protected readonly rampHigh = 'rgb(99 102 241)';

  protected readonly scoped = computed(() => this.regions().filter((r) => this.inScope(r)));
  protected readonly totalAccounts = computed(() => compact(this.scoped().reduce((s, r) => s + r.accounts, 0)));
  protected readonly scopeLabel = computed(() => ({ ALL: 'United States + Canada', US: 'United States', CA: 'Canada' })[this.scope()]);
  protected readonly maxValue = computed(() => Math.max(...this.scoped().map((r) => this.value(r))));
  protected readonly ranked = computed(() => [...this.scoped()].sort((a, b) => this.value(b) - this.value(a)).slice(0, 12));

  protected inScope(r: GeoRegion): boolean {
    return this.scope() === 'ALL' || r.country === this.scope();
  }

  protected value(r: GeoRegion): number {
    return this.measure() === 'accounts' ? r.accounts : r.connectRate;
  }

  protected display(r: GeoRegion): string {
    return this.measure() === 'accounts' ? compact(r.accounts) : `${r.connectRate}%`;
  }

  protected fill(r: GeoRegion): string {
    if (!this.inScope(r)) return 'rgb(30 41 59 / 0.4)';
    const all = this.regions().map((x) => this.value(x));
    const min = Math.min(...all);
    // sqrt scale so a handful of huge markets don't wash out everything else
    const t = Math.sqrt((this.value(r) - min) / (Math.max(...all) - min || 1));
    const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
    return `rgb(${mix(30, 99)} ${mix(41, 102)} ${mix(59, 241)} / ${0.55 + t * 0.45})`;
  }
}
