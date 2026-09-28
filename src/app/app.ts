import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter, map } from 'rxjs';
import { BootSplash } from './loaders/boot-splash';
import { CommandPalette } from './shell/command-palette';
import { Toasts } from './shell/toasts';
import { Icons } from './shared/icons';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, BootSplash, CommandPalette, Toasts],
  templateUrl: './app.html',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class App {
  protected readonly icons = Icons;
  protected readonly booted = signal(false);
  protected readonly paletteOpen = signal(false);
  protected readonly navOpen = signal(false);

  protected readonly nav = [
    { path: '/', label: 'Market Intelligence', icon: Icons.LayoutDashboard, exact: true },
    { path: '/leads', label: 'Lead Discovery', icon: Icons.Users, exact: false },
    { path: '/campaigns', label: 'Campaign Canvas', icon: Icons.Workflow, exact: false },
    { path: '/engine', label: 'AI Engine', icon: Icons.Cpu, exact: false },
  ];

  /** True while a lazy route chunk is being fetched; drives the top progress rail. */
  protected readonly navigating = toSignal(
    inject(Router).events.pipe(
      filter((e) => e instanceof NavigationStart || e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
      map((e) => e instanceof NavigationStart),
    ),
    { initialValue: false },
  );

  protected onKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.paletteOpen.update((o) => !o);
    }
  }
}
