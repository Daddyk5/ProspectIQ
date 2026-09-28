import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { ProspectApi } from '../../core/prospect-api';
import { ModelWarmupLoader } from '../../loaders/model-warmup-loader';
import { Icons } from '../../shared/icons';

@Component({
  selector: 'app-engine',
  imports: [LucideAngularModule, ModelWarmupLoader],
  template: `
    <div class="mx-auto max-w-360 space-y-4 p-4 md:p-6">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-white">AI Engine</h1>
        <p class="text-xs text-slate-500">The models and data pipelines behind every score, window and script in ProspectIQ</p>
      </div>

      @if (layers(); as ls) {
        <!-- Data flow -->
        <div class="card overflow-x-auto p-4 animate-fade-in">
          <div class="flex min-w-190 items-center gap-2 text-xs">
            @for (stage of flow; track stage.label; let i = $index; let last = $last) {
              <div class="flex-1 rounded-lg border p-3" [class]="stage.tone" [style.animation]="'fade-up .4s ' + i * 0.07 + 's both'">
                <div class="flex items-center gap-1.5 font-medium text-slate-100">
                  <lucide-icon [img]="stage.icon" [size]="13" /> {{ stage.label }}
                </div>
                <div class="mt-1 text-[11px] leading-snug text-slate-400">{{ stage.detail }}</div>
              </div>
              @if (!last) {
                <lucide-icon [img]="icons.ArrowRight" [size]="14" class="shrink-0 text-slate-600" />
              }
            }
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          @for (layer of ls; track layer.id; let li = $index) {
            <section class="card flex flex-col" [style.animation]="'fade-up .4s ' + (0.15 + li * 0.08) + 's both'">
              <div class="border-b border-slate-800 p-4">
                <div class="eyebrow">Layer {{ li + 1 }}</div>
                <h2 class="mt-1 text-sm font-semibold text-white">{{ layer.title }}</h2>
                <p class="mt-1 text-xs leading-relaxed text-slate-400">{{ layer.summary }}</p>
              </div>
              <ul class="flex-1 divide-y divide-slate-800/70">
                @for (m of layer.models; track m.name) {
                  <li>
                    <button class="w-full p-4 text-left transition-colors hover:bg-slate-800/30" (click)="expanded.set(expanded() === m.name ? null : m.name)" [attr.aria-expanded]="expanded() === m.name">
                      <div class="flex items-center gap-2">
                        <span class="text-[13px] font-medium text-slate-100">{{ m.name }}</span>
                        <span class="chip ml-auto border-emerald-500/30 bg-emerald-500/10 font-mono text-emerald-300">{{ m.metric }}</span>
                      </div>
                      <div class="mt-0.5 text-[11px] text-indigo-300">{{ m.kind }}</div>
                      @if (expanded() === m.name) {
                        <dl class="mt-3 space-y-1.5 text-[11px] animate-fade-in">
                          <div><dt class="inline text-slate-500">Inputs: </dt><dd class="inline text-slate-300">{{ m.inputs }}</dd></div>
                          <div><dt class="inline text-slate-500">Output: </dt><dd class="inline text-slate-300">{{ m.output }}</dd></div>
                          <div><dt class="inline text-slate-500">Latency: </dt><dd class="inline font-mono text-slate-300">{{ m.latency }}</dd></div>
                        </dl>
                      }
                    </button>
                  </li>
                }
              </ul>
            </section>
          }
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          @for (c of compliance; track c.regime) {
            <div class="card flex gap-3 p-4">
              <lucide-icon [img]="icons.ShieldCheck" [size]="18" class="shrink-0 text-emerald-400" />
              <div>
                <div class="text-sm font-medium text-white">{{ c.regime }} · {{ c.market }}</div>
                <p class="mt-1 text-xs leading-relaxed text-slate-400">{{ c.detail }}</p>
              </div>
            </div>
          }
        </div>
      } @else {
        <app-model-warmup-loader />
      }
    </div>
  `,
})
export class Engine {
  protected readonly icons = Icons;
  protected readonly layers = toSignal(inject(ProspectApi).engine());
  protected readonly expanded = signal<string | null>('ICP Match Score');

  protected readonly flow = [
    { label: 'Sources', detail: 'Firmographics, technographics, job boards, SEC EDGAR, SEDAR+, web intent', icon: Icons.Globe, tone: 'border-slate-700 bg-slate-800/30' },
    { label: 'Knowledge graph', detail: 'Entity resolution, USD/CAD normalization, consent ledger', icon: Icons.Network, tone: 'border-indigo-500/30 bg-indigo-500/6' },
    { label: 'Predictive models', detail: 'ICP fit, title reachability, call-window forecast', icon: Icons.Activity, tone: 'border-indigo-500/30 bg-indigo-500/6' },
    { label: 'Agentic layer', detail: 'Scripts, signal triage, roleplay simulator', icon: Icons.Bot, tone: 'border-indigo-500/30 bg-indigo-500/6' },
    { label: 'Rep surfaces', detail: 'Lead grid, Account 360, call queue, CRM sync', icon: Icons.Rocket, tone: 'border-emerald-500/30 bg-emerald-500/6' },
  ];

  protected readonly compliance = [
    { regime: 'CASL', market: 'Canada', detail: 'Consent type (express/implied), source and expiry are tracked per contact. Email steps are blocked when consent lapses, and sender ID plus unsubscribe are enforced on every message.' },
    { regime: 'TCPA', market: 'United States', detail: 'Numbers are checked against the national DNC and reassigned-numbers databases. Wireless lines are routed to manual dial only, and state calling-hour windows are applied before a dial is released.' },
  ];
}
