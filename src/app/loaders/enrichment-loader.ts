import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';

/**
 * Lead grid: a scan beam sweeps the table while records move through the
 * enrichment pipeline; rows that finish resolve into scored placeholders.
 */
@Component({
  selector: 'app-enrichment-loader',
  template: `
    <div role="status" aria-live="polite" class="card overflow-hidden">
      <span class="sr-only">Enriching and scoring leads</span>

      <div class="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-slate-800 px-4 py-3">
        @for (s of stages; track s; let i = $index) {
          <div
            class="chip transition-colors"
            [class]="
              i < stage()
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : i === stage()
                  ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-200'
                  : 'border-slate-700 text-slate-500'
            "
          >
            @if (i < stage()) {
              ✓
            } @else if (i === stage()) {
              <span class="size-1.5 rounded-full bg-indigo-400 animate-pulse-dot"></span>
            }
            {{ s }}
          </div>
          @if (i < stages.length - 1) {
            <span class="text-slate-700">→</span>
          }
        }
        <span class="ml-auto font-mono text-[11px] text-slate-500 tabular-nums">
          {{ enriched().toLocaleString('en-US') }} / 12,860 records
        </span>
      </div>

      <div class="relative">
        <div
          class="pointer-events-none absolute inset-x-0 top-0 z-10 h-[11%] border-b border-indigo-400/60 bg-linear-to-b from-transparent to-indigo-500/15"
          style="animation: scan-beam 1.9s cubic-bezier(.45,0,.55,1) infinite"
        ></div>

        @for (row of rows; track $index; let i = $index) {
          <div class="flex items-center gap-4 border-b border-slate-800/70 px-4 py-3.5 last:border-0">
            <div class="skeleton size-4 shrink-0 rounded"></div>
            <div class="skeleton size-8 shrink-0 rounded-lg"></div>
            <div class="w-44 shrink-0 space-y-1.5">
              <div class="skeleton h-2.5" [style.width.%]="row[0]"></div>
              <div class="skeleton h-2" [style.width.%]="row[1]"></div>
            </div>
            <div class="skeleton hidden h-2.5 w-32 md:block"></div>
            <div class="skeleton hidden h-2.5 w-20 lg:block"></div>
            @if (i < resolved()) {
              <div class="h-5 w-10 rounded-md border border-emerald-500/30 bg-emerald-500/10 animate-fade-in"></div>
              <div class="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-800 sm:block">
                <div class="h-full rounded-full bg-indigo-500/60" [style.width.%]="row[2]"></div>
              </div>
            } @else {
              <div class="skeleton h-5 w-10"></div>
              <div class="skeleton hidden h-1.5 w-20 sm:block"></div>
            }
            <div class="ml-auto hidden gap-1.5 xl:flex">
              <div class="skeleton h-5 w-16"></div>
              <div class="skeleton h-5 w-14"></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class EnrichmentLoader {
  protected readonly stages = ['Firmographics', 'Technographics', 'Email + phone validation', 'CASL / TCPA screen', 'ICP scoring'];
  protected readonly rows = [
    [80, 55, 78], [65, 70, 64], [90, 50, 72], [72, 62, 58], [58, 45, 81], [84, 66, 69], [70, 52, 74], [62, 60, 55],
  ];
  protected readonly stage = signal(0);
  protected readonly enriched = signal(0);
  protected readonly resolved = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setInterval(() => {
        this.stage.update((s) => Math.min(this.stages.length - 1, s + 1));
        this.resolved.update((r) => Math.min(this.rows.length, r + 2));
      }, 330);
      const counter = setInterval(() => this.enriched.update((n) => Math.min(12_860, n + 420 + Math.floor(Math.random() * 380))), 60);
      destroyRef.onDestroy(() => {
        clearInterval(timer);
        clearInterval(counter);
      });
    });
  }
}
