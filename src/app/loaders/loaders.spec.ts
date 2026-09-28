import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LEADS } from '../core/mock-data';
import { Campaigns } from '../features/campaigns/campaigns';
import { Dashboard } from '../features/dashboard/dashboard';
import { Engine } from '../features/engine/engine';
import { LeadDrawer } from '../features/leads/lead-drawer';
import { Leads } from '../features/leads/leads';

/** Each screen must show its own loader first, then swap it for real content. */
describe('screen loading states', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => vi.useRealTimers());

  function render<T>(cmp: Type<T>, setup?: (f: ComponentFixture<T>) => void): ComponentFixture<T> {
    const fixture = TestBed.createComponent(cmp);
    setup?.(fixture);
    fixture.detectChanges();
    return fixture;
  }

  function settle(fixture: ComponentFixture<unknown>, ms = 2500): HTMLElement {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const cases: [string, Type<unknown>, string, string][] = [
    ['Dashboard', Dashboard, 'app-radar-loader', 'Real-time AI signal feed'],
    ['Leads', Leads, 'app-enrichment-loader', LEADS[0].company],
    ['Campaigns', Campaigns, 'app-sequence-loader', 'Sequence workflow'],
    ['Engine', Engine, 'app-model-warmup-loader', 'ICP Match Score'],
  ];

  for (const [name, cmp, loader, content] of cases) {
    it(`${name}: ${loader} → content`, () => {
      const fixture = render(cmp);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector(loader)).toBeTruthy();
      expect(el.textContent).not.toContain(content);

      settle(fixture);
      expect(el.querySelector(loader)).toBeNull();
      expect(el.textContent).toContain(content);
      fixture.destroy();
    });
  }

  function streamResponse(chunks: string[]): Response {
    const enc = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(c) {
          chunks.forEach((t) => c.enqueue(enc.encode(t)));
          c.close();
        },
      }),
      { status: 200, headers: { 'Content-Type': 'text/plain' } },
    );
  }

  async function openCopilot(fetchImpl: typeof fetch) {
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
    const lead = LEADS[0];
    const fixture = render(LeadDrawer, (f) => f.componentRef.setInput('lead', lead));
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-graph-loader')?.textContent).toContain(lead.company);

    await vi.advanceTimersByTimeAsync(2000);
    fixture.detectChanges();
    expect(el.querySelector('app-graph-loader')).toBeNull();
    expect(el.textContent).toContain('Buying signals timeline');

    const tabs = el.querySelectorAll<HTMLButtonElement>('[role=tab]');
    tabs[1].click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Recommended entry point');

    tabs[2].click();
    fixture.detectChanges();
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Phone script'))!.click();
    fixture.detectChanges();
    expect(el.querySelector('app-token-stream-loader')).toBeTruthy();
    return { fixture, el, lead };
  }

  afterEach(() => vi.unstubAllGlobals());

  it('Account 360 drawer: graph loader → intel; copilot streams from Ollama', async () => {
    const { fixture, el } = await openCopilot(async (url) =>
      String(url).endsWith('/health')
        ? new Response(JSON.stringify({ status: 'ok', model: 'prospectiq-copilot' }))
        : streamResponse(['OPENER\n', 'Hi Priya, it is Jordan.']),
    );
    await vi.advanceTimersByTimeAsync(50);
    fixture.detectChanges();
    expect(el.querySelector('app-token-stream-loader')).toBeNull();
    expect(el.querySelector('pre')?.textContent).toContain('Hi Priya, it is Jordan.');
    expect(el.textContent).toContain('prospectiq-copilot · Ollama');
    expect(el.textContent).toContain('· Ollama');
    fixture.destroy();
  });

  it('Account 360 drawer: copilot falls back to templates when the AI service is down', async () => {
    const { fixture, el, lead } = await openCopilot(async () => {
      throw new TypeError('fetch failed');
    });
    await vi.advanceTimersByTimeAsync(6000);
    fixture.detectChanges();
    expect(el.querySelector('app-token-stream-loader')).toBeNull();
    expect(el.querySelector('pre')?.textContent).toContain(`Hi ${lead.contact.split(' ')[0]}`);
    expect(el.textContent).toContain('AI offline · templates');
    fixture.destroy();
  });
});
