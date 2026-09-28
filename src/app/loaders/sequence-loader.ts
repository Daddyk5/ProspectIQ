import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Icons } from '../shared/icons';

const CYCLE_SECONDS = 3;

/**
 * Campaign canvas: a signal packet runs the outbound sequence end to end,
 * lighting each channel node as it arrives, while the funnel compiles below.
 */
@Component({
  selector: 'app-sequence-loader',
  imports: [LucideAngularModule],
  template: `
    <div role="status" aria-live="polite" class="card p-5 sm:p-8">
      <span class="sr-only">Compiling campaign workflow</span>

      <div class="flex items-center gap-2 text-sm font-medium text-slate-100">
        <lucide-icon [img]="icons.Workflow" [size]="16" class="text-brand" />
        Compiling multi-channel sequence
      </div>
      <p class="mt-1 text-xs text-slate-500">Resolving channels, compliance gates and conversion history for each touchpoint</p>

      <div class="relative mt-10 overflow-x-auto pb-2">
        <div class="relative min-w-140">
          <!-- Rail between first and last node centers (nodes are 4 equal columns). -->
          <div class="absolute top-9 right-[12.5%] left-[12.5%] h-px bg-slate-700">
            <div
              class="absolute top-1/2 size-2.5 -translate-1/2 rounded-full bg-brand shadow-[0_0_14px_4px_rgb(99_102_241/0.6)]"
              [style.animation]="'travel ' + cycle + 's cubic-bezier(.5,0,.5,1) infinite'"
            ></div>
          </div>

          <div class="relative grid grid-cols-4 gap-4">
            @for (n of nodes; track n.label; let i = $index) {
              <div class="flex flex-col items-center text-center">
                <div
                  class="grid size-18 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-400"
                  [style.animation]="'node-light ' + cycle + 's ease-out ' + nodeDelay(i) + 's infinite'"
                >
                  <lucide-icon [img]="n.icon" [size]="22" />
                </div>
                <div class="mt-3 font-mono text-[10px] tracking-wider text-slate-500 uppercase">Day {{ n.day }}</div>
                <div class="mt-0.5 text-xs font-medium text-slate-300">{{ n.label }}</div>
                <div class="skeleton mt-3 h-2 w-16"></div>
                <div class="skeleton mt-1.5 h-2 w-10"></div>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="mt-8 flex h-20 items-end gap-2">
        @for (h of funnel; track $index; let i = $index) {
          <div class="skeleton flex-1 rounded-t-md rounded-b-none"
               [style.height.%]="h" [style.animation]="'fade-up .5s ' + i * 0.08 + 's both'"></div>
        }
      </div>
    </div>
  `,
})
export class SequenceLoader {
  protected readonly icons = Icons;
  protected readonly cycle = CYCLE_SECONDS;
  protected readonly nodes = [
    { day: 1, label: 'AI Call Window', icon: Icons.Phone },
    { day: 2, label: 'Personalized Email', icon: Icons.Mail },
    { day: 4, label: 'LinkedIn Touch', icon: Icons.Linkedin },
    { day: 5, label: 'CRM Sync', icon: Icons.Cloud },
  ];
  protected readonly funnel = [100, 86, 78, 71, 64, 52, 45, 38, 30, 22, 17, 12];

  /** The packet covers the rail in the first 80% of the cycle; light each node on arrival. */
  protected nodeDelay(i: number): number {
    return (i / (this.nodes.length - 1)) * 0.8 * CYCLE_SECONDS;
  }
}
