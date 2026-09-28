import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';

const LAYERS = [3, 5, 5, 2];

/**
 * AI Engine: activation waves ripple left→right through a neural net while
 * each model's inference endpoint reports its warm-up progress.
 */
@Component({
  selector: 'app-model-warmup-loader',
  template: `
    <div role="status" aria-live="polite" class="card grid gap-8 p-6 lg:grid-cols-2">
      <span class="sr-only">Warming up AI models</span>

      <svg viewBox="0 0 300 200" class="w-full max-w-md self-center" aria-hidden="true">
        @for (e of edges; track $index) {
          <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" stroke="#818CF8" stroke-width="1"
                [style.animation]="'synapse 1.6s ease-in-out ' + e.delay + 's infinite'" style="opacity: .12" />
        }
        @for (n of nodes; track $index) {
          <circle [attr.cx]="n.x" [attr.cy]="n.y" r="7" fill="#0F172A" stroke="#6366F1" stroke-width="1.5" />
          <circle [attr.cx]="n.x" [attr.cy]="n.y" r="3.5" [attr.fill]="n.out ? '#10B981' : '#A5B4FC'"
                  [style.animation]="'synapse 1.6s ease-in-out ' + n.delay + 's infinite'" style="opacity: .12" />
        }
      </svg>

      <div>
        <div class="text-sm font-medium text-slate-100">Warming inference endpoints</div>
        <p class="mt-1 text-xs text-slate-500">Loading weights and checking the latency budget for each model</p>
        <ul class="mt-5 space-y-3">
          @for (m of models; track m; let i = $index) {
            <li>
              <div class="flex justify-between font-mono text-[11px]">
                <span [class]="progress()[i] >= 100 ? 'text-emerald-300' : 'text-slate-400'">{{ m }}</span>
                <span class="text-slate-500 tabular-nums">{{ progress()[i] >= 100 ? 'ready' : progress()[i] + '%' }}</span>
              </div>
              <div class="mt-1 h-1 overflow-hidden rounded-full bg-slate-800">
                <div class="h-full rounded-full transition-[width] duration-150"
                     [class]="progress()[i] >= 100 ? 'bg-emerald-500' : 'bg-brand'"
                     [style.width.%]="progress()[i]"></div>
              </div>
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class ModelWarmupLoader {
  protected readonly models = ['entity-resolver', 'icp-ranker-v4', 'reachability-bayes', 'call-window-tft', 'script-llm', 'roleplay-voice'];
  protected readonly progress = signal(this.models.map(() => 0));

  protected readonly nodes = LAYERS.flatMap((count, layer) =>
    Array.from({ length: count }, (_, i) => ({
      x: 30 + layer * 80,
      y: 100 + (i - (count - 1) / 2) * 36,
      layer,
      delay: layer * 0.28,
      out: layer === LAYERS.length - 1,
    })),
  );
  protected readonly edges = this.nodes.flatMap((a) =>
    this.nodes
      .filter((b) => b.layer === a.layer + 1)
      .map((b) => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, delay: a.layer * 0.28 + 0.14 })),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setInterval(() => {
        this.progress.update((p) => p.map((v, i) => Math.min(100, v + Math.round(Math.random() * (14 - i)) + 2)));
      }, 80);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
}
