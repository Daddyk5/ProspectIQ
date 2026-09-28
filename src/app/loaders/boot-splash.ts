import { afterNextRender, Component, DestroyRef, inject, output, signal } from '@angular/core';

/**
 * App boot: the ProspectIQ mark assembles itself as a knowledge graph
 * while the boot log brings each AI subsystem online.
 */
@Component({
  selector: 'app-boot-splash',
  template: `
    <div
      role="status"
      aria-live="polite"
      class="fixed inset-0 z-100 grid place-items-center bg-canvas transition-opacity duration-500"
      [class.opacity-0]="leaving()"
    >
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(99_102_241/0.14),transparent_60%)]"></div>

      <div class="relative flex w-[min(360px,calc(100vw-32px))] flex-col items-center">
        <svg viewBox="0 0 120 120" class="size-28" aria-hidden="true">
          @for (e of edges; track $index) {
            <line
              [attr.x1]="e[0]" [attr.y1]="e[1]" [attr.x2]="e[2]" [attr.y2]="e[3]"
              pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"
              [attr.stroke]="$index < 6 ? '#6366F1' : '#334155'" stroke-width="1.5" stroke-linecap="round"
              [style.animation]="'draw .5s ease-out ' + (0.15 + $index * 0.07) + 's forwards'"
            />
          }
          @for (n of nodes; track $index) {
            <circle
              [attr.cx]="n[0]" [attr.cy]="n[1]" [attr.r]="$index === 0 ? 9 : 5"
              [attr.fill]="$index === 0 ? '#6366F1' : '#0F172A'"
              [attr.stroke]="$index === 0 ? '#A5B4FC' : '#10B981'" stroke-width="2"
              style="transform-box: fill-box; transform-origin: center; opacity: 0"
              [style.animation]="'pop-in .45s cubic-bezier(.2,.8,.2,1) ' + ($index * 0.09) + 's forwards'"
            />
          }
        </svg>

        <div class="mt-5 text-xl font-semibold tracking-tight text-white animate-fade-up" style="animation-delay: .5s">
          Prospect<span class="text-brand">IQ</span>
        </div>
        <div class="mt-1 text-xs text-slate-500 animate-fade-up" style="animation-delay: .6s">
          Lead intelligence · US &amp; Canada
        </div>

        <ul class="mt-8 w-full space-y-2 font-mono text-[11px]">
          @for (s of steps; track s; let i = $index) {
            @if (step() >= i) {
              <li class="flex items-center gap-2 animate-fade-up">
                @if (step() > i) {
                  <span class="grid size-3.5 place-items-center rounded-full bg-emerald-500/20 text-[9px] text-emerald-400">✓</span>
                  <span class="text-slate-400">{{ s }}</span>
                } @else {
                  <span class="size-3.5 rounded-full border-2 border-brand border-t-transparent" style="animation: spin-slow .7s linear infinite"></span>
                  <span class="text-slate-200">{{ s }}</span>
                }
              </li>
            }
          }
        </ul>

        <div class="mt-6 h-0.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            class="h-full rounded-full bg-linear-to-r from-brand to-go transition-[width] duration-300 ease-out"
            [style.width.%]="(step() / steps.length) * 100"
          ></div>
        </div>
      </div>
      <span class="sr-only">Starting ProspectIQ</span>
    </div>
  `,
})
export class BootSplash {
  readonly done = output<void>();

  protected readonly steps = [
    'Connecting knowledge graph · 128,400 entities',
    'Loading ICP match model v4.2',
    'Syncing CASL / TCPA consent ledger',
    'Calibrating call-window forecaster',
  ];
  protected readonly step = signal(0);
  protected readonly leaving = signal(false);

  // Hexagonal graph: center node + 6 satellites.
  protected readonly nodes: [number, number][] = [
    [60, 60],
    ...Array.from({ length: 6 }, (_, i): [number, number] => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return [60 + 42 * Math.cos(a), 60 + 42 * Math.sin(a)];
    }),
  ];
  protected readonly edges: number[][] = [
    ...this.nodes.slice(1).map(([x, y]) => [60, 60, x, y]),
    ...this.nodes.slice(1).map(([x, y], i) => {
      const [nx, ny] = this.nodes[1 + ((i + 1) % 6)];
      return [x, y, nx, ny];
    }),
  ];

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setInterval(() => {
        if (this.step() < this.steps.length) {
          this.step.update((s) => s + 1);
          return;
        }
        clearInterval(timer);
        this.leaving.set(true);
        setTimeout(() => this.done.emit(), 500);
      }, 420);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
}
