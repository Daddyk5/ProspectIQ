import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';

const SWEEP_SECONDS = 2.4;

interface Blip {
  x: number;
  y: number;
  label?: string;
  delay: number;
}

/**
 * Dashboard: a radar sweeps North America; each market pings the moment the
 * beam passes over it while the metric tiles and signal feed skeletons wait.
 */
@Component({
  selector: 'app-radar-loader',
  template: `
    <div role="status" aria-live="polite" class="space-y-4">
      <span class="sr-only">Scanning market intelligence</span>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        @for (i of [0, 1, 2, 3]; track i) {
          <div class="card p-4" [style.animation]="'fade-up .4s ' + i * 0.06 + 's both'">
            <div class="skeleton h-3 w-28"></div>
            <div class="skeleton mt-3 h-7 w-24"></div>
            <div class="mt-3 flex items-end gap-1">
              @for (b of bars; track $index) {
                <div class="skeleton w-full" [style.height.px]="b"></div>
              }
            </div>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div class="card flex flex-col items-center gap-6 p-6 sm:flex-row xl:col-span-2">
          <div class="relative aspect-square w-full max-w-70 shrink-0 overflow-hidden rounded-full border border-indigo-500/30 bg-[radial-gradient(circle,rgb(99_102_241/0.08),transparent_70%)]">
            @for (r of [25, 50, 75]; track r) {
              <div class="absolute rounded-full border border-indigo-500/15"
                   [style.inset.%]="(100 - r) / 2"></div>
            }
            <div class="absolute inset-x-0 top-1/2 h-px bg-indigo-500/15"></div>
            <div class="absolute inset-y-0 left-1/2 w-px bg-indigo-500/15"></div>
            <div
              class="absolute inset-0 rounded-full"
              style="background: conic-gradient(from 0deg, transparent 0deg 285deg, rgb(99 102 241 / 0.5) 360deg)"
              [style.animation]="'spin-slow ' + sweep + 's linear infinite'"
            ></div>
            @for (b of blips; track $index) {
              <div class="absolute" [style.left.%]="b.x" [style.top.%]="b.y">
                <div
                  class="-translate-1/2 size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10B981]"
                  [style.animation]="'ping-once ' + sweep + 's linear ' + b.delay + 's infinite'"
                ></div>
                @if (b.label) {
                  <span class="absolute left-2 -top-2 font-mono text-[9px] text-slate-500">{{ b.label }}</span>
                }
              </div>
            }
            <div class="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full bg-brand shadow-[0_0_12px_#6366F1]"></div>
          </div>

          <div class="w-full min-w-0">
            <div class="flex items-center gap-2 text-sm font-medium text-slate-100">
              <span class="size-1.5 rounded-full bg-emerald-400 animate-pulse-dot"></span>
              Scanning North American market
            </div>
            <p class="mt-1 text-xs text-slate-500">Re-scoring TAM density across 50 states + DC and 13 provinces &amp; territories</p>
            <dl class="mt-5 grid grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <dt class="text-slate-500">Accounts indexed</dt>
                <dd class="mt-1 text-lg text-white tabular-nums">{{ indexed().toLocaleString('en-US') }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Regions swept</dt>
                <dd class="mt-1 text-lg text-white tabular-nums">{{ regions() }} / 64</dd>
              </div>
            </dl>
            <div class="mt-5 space-y-2">
              @for (w of [92, 76, 84]; track $index) {
                <div class="skeleton h-2.5" [style.width.%]="w"></div>
              }
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="skeleton h-3 w-32"></div>
          <div class="mt-4 space-y-4">
            @for (i of [0, 1, 2, 3, 4]; track i) {
              <div class="flex gap-3" [style.animation]="'fade-up .4s ' + (0.3 + i * 0.12) + 's both'">
                <div class="skeleton size-7 shrink-0 rounded-lg"></div>
                <div class="flex-1 space-y-1.5">
                  <div class="skeleton h-2.5 w-4/5"></div>
                  <div class="skeleton h-2.5 w-1/2"></div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RadarLoader {
  protected readonly sweep = SWEEP_SECONDS;
  protected readonly bars = [8, 12, 10, 16, 14, 20, 18, 24, 22, 28];
  protected readonly indexed = signal(0);
  protected readonly regions = signal(0);

  // Rough positions of key markets inside the radar disc (0–100 space).
  protected readonly blips: Blip[] = (
    [
      [26, 30, 'Vancouver'], [36, 28, 'Calgary'], [66, 33, 'Toronto'], [74, 27, 'Montréal'], [60, 22],
      [22, 44, 'Seattle'], [19, 62, 'San Diego'], [44, 72, 'Austin'], [40, 55, 'Denver'], [58, 48, 'Chicago'],
      [78, 45, 'New York'], [82, 38, 'Boston'], [66, 70, 'Atlanta'], [72, 84, 'Tampa'], [86, 30, 'Halifax'], [50, 38], [30, 76],
    ] as [number, number, string?][]
  ).map(([x, y, label]) => {
    // Clockwise angle from 12 o'clock, so each blip fires as the beam's leading edge reaches it.
    const angle = (Math.atan2(x - 50, 50 - y) * 180) / Math.PI;
    return { x, y, label, delay: (((angle + 360) % 360) / 360) * SWEEP_SECONDS };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setInterval(() => {
        this.indexed.update((n) => Math.min(128_400, n + 3_000 + Math.floor(Math.random() * 6_000)));
        this.regions.update((n) => Math.min(64, n + 3));
      }, 90);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
}
