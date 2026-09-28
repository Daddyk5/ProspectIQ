import { Component, input } from '@angular/core';

/**
 * AI Copilot: a voice-style waveform "thinks" while draft lines materialize
 * one by one behind a blinking caret, grounded on the account's live signals.
 */
@Component({
  selector: 'app-token-stream-loader',
  template: `
    <div role="status" aria-live="polite" class="rounded-xl border border-indigo-500/30 bg-indigo-500/6 p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-6 items-center gap-0.75" aria-hidden="true">
          @for (b of bars; track $index) {
            <span
              class="block h-full w-0.75 origin-center rounded-full bg-linear-to-t from-brand to-violet-300"
              [style.animation]="'wave ' + b.d + 's ease-in-out ' + b.delay + 's infinite'"
            ></span>
          }
        </div>
        <div class="text-xs font-medium text-indigo-200">Copilot is drafting your {{ label() }}</div>
      </div>

      <div class="mt-3 flex flex-wrap gap-1.5">
        <span class="text-[11px] text-slate-500">Grounded on</span>
        @for (g of grounding(); track g; let i = $index) {
          <span class="chip border-slate-700 text-slate-300" [style.animation]="'fade-up .3s ' + i * 0.15 + 's both'">{{ g }}</span>
        }
      </div>

      <div class="mt-4 space-y-2">
        @for (w of lines; track $index; let i = $index; let last = $last) {
          <div class="flex items-center gap-1" [style.animation]="'fade-up .3s ' + (0.2 + i * 0.18) + 's both'">
            <div class="skeleton h-2.5" [style.width.%]="w"></div>
            @if (last) {
              <span class="h-3.5 w-0.5 bg-indigo-300" style="animation: caret 1s step-end infinite"></span>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TokenStreamLoader {
  readonly label = input.required<string>();
  readonly grounding = input<string[]>([]);

  protected readonly bars = Array.from({ length: 18 }, (_, i) => ({
    d: 0.7 + ((i * 37) % 9) / 20,
    delay: -((i * 53) % 11) / 10,
  }));
  protected readonly lines = [94, 82, 88, 60, 91, 74, 45];
}
