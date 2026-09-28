import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../core/toast.service';
import { Icons } from '../shared/icons';

@Component({
  selector: 'app-toasts',
  imports: [LucideAngularModule],
  template: `
    <div class="pointer-events-none fixed right-4 bottom-4 z-60 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl shadow-black/40 backdrop-blur animate-fade-up">
          <div class="grid size-7 shrink-0 place-items-center rounded-lg"
               [class]="t.tone === 'ai' ? 'bg-indigo-500/15 text-indigo-300' : t.tone === 'info' ? 'bg-slate-700/60 text-slate-300' : 'bg-emerald-500/15 text-emerald-300'">
            <lucide-icon [img]="t.tone === 'ai' ? icons.Sparkles : t.tone === 'info' ? icons.Info : icons.CircleCheck" [size]="15" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-medium text-slate-100">{{ t.title }}</div>
            @if (t.detail) {
              <div class="mt-0.5 text-xs text-slate-400">{{ t.detail }}</div>
            }
          </div>
          <button class="text-slate-500 hover:text-slate-300" (click)="toasts.dismiss(t.id)" aria-label="Dismiss">
            <lucide-icon [img]="icons.X" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toasts = inject(ToastService);
  protected readonly icons = Icons;
}
