import { afterNextRender, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';

/**
 * Account 360 drawer: the buying committee is drawn outward from the account
 * node, one reporting line at a time, while the reachability model runs.
 */
@Component({
  selector: 'app-graph-loader',
  template: `
    <div role="status" aria-live="polite" class="p-5">
      <span class="sr-only">Building account intelligence</span>

      <div class="card relative overflow-hidden p-4">
        <svg viewBox="0 0 320 210" class="w-full" aria-hidden="true">
          <circle cx="160" cy="105" r="70" fill="none" stroke="#334155" stroke-dasharray="2 6"
                  style="transform-origin: 160px 105px; animation: spin-slow 14s linear infinite" />
          @for (n of committee; track n.label; let i = $index) {
            <line x1="160" y1="105" [attr.x2]="n.x" [attr.y2]="n.y" stroke="#6366F1" stroke-width="1.25"
                  pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"
                  [style.animation]="'draw .45s ease-out ' + (0.2 + i * 0.22) + 's forwards'" />
          }
          @for (n of committee; track n.label; let i = $index) {
            <g style="opacity: 0; transform-box: fill-box; transform-origin: center"
               [style.animation]="'pop-in .4s ease-out ' + (0.55 + i * 0.22) + 's forwards'">
              <circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" fill="#0F172A"
                      [attr.stroke]="n.best ? '#10B981' : '#475569'" stroke-width="1.5" />
              <text [attr.x]="n.x" [attr.y]="n.y + 3.5" text-anchor="middle" font-size="9" font-weight="600"
                    [attr.fill]="n.best ? '#6EE7B7' : '#CBD5E1'">{{ n.label }}</text>
            </g>
          }
          <circle cx="160" cy="105" r="22" fill="#6366F1" fill-opacity=".18" stroke="#6366F1" stroke-width="1.5" />
          <text x="160" y="110" text-anchor="middle" font-size="13" font-weight="700" fill="#E0E7FF">{{ initials() }}</text>
        </svg>

        <div class="mt-1 text-center">
          <div class="text-sm font-medium text-slate-100">Mapping buying committee at {{ company() }}</div>
          <div class="mt-1 h-4 font-mono text-[11px] text-indigo-300">
            @for (t of tasks; track t; let i = $index) {
              @if (i === task()) {
                <span class="animate-fade-up inline-block">{{ t }}…</span>
              }
            }
          </div>
        </div>
      </div>

      <div class="mt-4 space-y-3">
        <div class="skeleton h-3 w-32"></div>
        @for (w of [88, 72, 80]; track $index) {
          <div class="flex items-center gap-3">
            <div class="skeleton size-6 shrink-0 rounded-full"></div>
            <div class="skeleton h-2.5" [style.width.%]="w"></div>
          </div>
        }
        <div class="skeleton mt-2 h-24 w-full"></div>
      </div>
    </div>
  `,
})
export class GraphLoader {
  readonly company = input.required<string>();

  protected readonly initials = computed(() =>
    this.company()
      .split(/\s+/)
      .filter((w) => /^[A-Z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join(''),
  );

  protected readonly committee = [
    { label: 'CEO', x: 160, y: 22, best: false },
    { label: 'VP', x: 262, y: 62, best: false },
    { label: 'DIR', x: 248, y: 172, best: true },
    { label: 'MGR', x: 72, y: 172, best: false },
    { label: 'OPS', x: 58, y: 62, best: false },
  ];
  protected readonly tasks = ['Resolving org chart', 'Scoring title reachability', 'Forecasting call windows', 'Pulling buying signals'];
  protected readonly task = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setInterval(() => this.task.update((t) => (t + 1) % this.tasks.length), 360);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
}
