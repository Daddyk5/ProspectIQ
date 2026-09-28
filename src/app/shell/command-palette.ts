import { Component, computed, ElementRef, inject, output, signal, viewChild, afterNextRender } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { LEADS } from '../core/mock-data';
import { Icons } from '../shared/icons';

interface PaletteItem {
  group: 'Navigate' | 'Leads' | 'Actions';
  label: string;
  hint: string;
  icon: typeof Icons.Search;
  run: () => void;
}

@Component({
  selector: 'app-command-palette',
  imports: [LucideAngularModule],
  host: { '(keydown)': 'onKey($event)' },
  template: `
    <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm animate-fade-in" (click)="close.emit()"></div>
    <div role="dialog" aria-modal="true" aria-label="Command palette"
         class="fixed top-[12vh] left-1/2 z-50 w-[min(600px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 animate-fade-up">
      <div class="flex items-center gap-2 border-b border-slate-800 px-4">
        <lucide-icon [img]="icons.Search" [size]="16" class="text-slate-500" />
        <input #input
          class="h-12 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          placeholder="Search leads, jump to a screen, run an AI action…"
          [value]="query()" (input)="query.set($any($event.target).value); active.set(0)" />
        <span class="kbd">esc</span>
      </div>
      <ul class="max-h-[50vh] overflow-y-auto p-2" role="listbox">
        @for (item of results(); track item.label; let i = $index) {
          @if (i === 0 || results()[i - 1].group !== item.group) {
            <li class="eyebrow px-2 pt-2 pb-1">{{ item.group }}</li>
          }
          <li role="option" [attr.aria-selected]="i === active()"
              class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm"
              [class]="i === active() ? 'bg-indigo-500/15 text-white' : 'text-slate-300'"
              (mouseenter)="active.set(i)" (click)="execute(item)">
            <lucide-icon [img]="item.icon" [size]="15" class="text-slate-400" />
            <span class="flex-1 truncate">{{ item.label }}</span>
            <span class="truncate text-xs text-slate-500">{{ item.hint }}</span>
            @if (i === active()) {
              <lucide-icon [img]="icons.CornerDownLeft" [size]="13" class="text-slate-500" />
            }
          </li>
        } @empty {
          <li class="px-3 py-8 text-center text-sm text-slate-500">No matches for "{{ query() }}"</li>
        }
      </ul>
    </div>
  `,
})
export class CommandPalette {
  readonly close = output<void>();

  private readonly router = inject(Router);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  protected readonly icons = Icons;
  protected readonly query = signal('');
  protected readonly active = signal(0);

  private readonly items: PaletteItem[] = [
    { group: 'Navigate', label: 'Market Intelligence', hint: 'Dashboard', icon: Icons.LayoutDashboard, run: () => this.go('/') },
    { group: 'Navigate', label: 'Lead Discovery', hint: 'Qualification grid', icon: Icons.Users, run: () => this.go('/leads') },
    { group: 'Navigate', label: 'Campaign Canvas', hint: 'Outbound workflows', icon: Icons.Workflow, run: () => this.go('/campaigns') },
    { group: 'Navigate', label: 'AI Engine', hint: 'Model architecture', icon: Icons.Cpu, run: () => this.go('/engine') },
    { group: 'Actions', label: 'Show high-intent Canadian leads', hint: 'Filter', icon: Icons.Flame, run: () => this.go('/leads', { region: 'CA', intent: 'High' }) },
    { group: 'Actions', label: 'Show US leads with ICP ≥ 85', hint: 'Filter', icon: Icons.Target, run: () => this.go('/leads', { region: 'US', icp: 85 }) },
    ...LEADS.map((l) => ({
      group: 'Leads' as const,
      label: `${l.company} · ${l.contact}`,
      hint: `${l.city}, ${l.region}`,
      icon: Icons.Building2,
      run: () => this.go('/leads', { open: l.id }),
    })),
  ];

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.items.slice(0, 10); // screens, actions and the first few leads
    return this.items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q)).slice(0, 12);
  });

  constructor() {
    afterNextRender(() => this.input().nativeElement.focus());
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.results().length;
    if (e.key === 'Escape') this.close.emit();
    else if (e.key === 'ArrowDown') this.active.update((a) => (a + 1) % Math.max(n, 1));
    else if (e.key === 'ArrowUp') this.active.update((a) => (a - 1 + n) % Math.max(n, 1));
    else if (e.key === 'Enter' && n) this.execute(this.results()[this.active()]);
    else return;
    e.preventDefault();
  }

  protected execute(item: PaletteItem): void {
    item.run();
    this.close.emit();
  }

  private go(path: string, queryParams?: Record<string, string | number>): void {
    this.router.navigate([path], { queryParams });
  }
}
