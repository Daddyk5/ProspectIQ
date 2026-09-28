import { Injectable } from '@angular/core';
import { Observable, delay, interval, map, of, switchMap, takeWhile, timer } from 'rxjs';
import {
  Account360,
  Campaign,
  CopilotKind,
  DashboardData,
  EngineLayer,
  Lead,
  MarketSignal,
} from './models';
import {
  buildAccount360,
  CALL_HEATMAP,
  CAMPAIGNS,
  ENGINE_LAYERS,
  LEADS,
  METRICS,
  REGIONS,
  SIGNAL_POOL,
} from './mock-data';

/** Base path of the standalone AI service (proxied in dev and by the SSR server). */
export const AI_BASE_URL = '/ai';

export interface AiStatus {
  online: boolean;
  model: string;
  status: string;
}

export interface CopilotChunk {
  /** Full text generated so far. */
  text: string;
  source: 'ollama' | 'template';
}

/**
 * Mock backend. Every call resolves after a realistic latency so each screen's
 * loading state is exercised exactly as it would be against the real API.
 */
@Injectable({ providedIn: 'root' })
export class ProspectApi {
  private signalSeq = 0;

  dashboard(): Observable<DashboardData> {
    const signals = SIGNAL_POOL.slice(0, 6).map((s, i) => this.toSignal(s, 2 + i * 7));
    return of({ metrics: METRICS, regions: REGIONS, signals, callHeatmap: CALL_HEATMAP }).pipe(delay(1500));
  }

  leads(): Observable<Lead[]> {
    return of(LEADS).pipe(delay(1700));
  }

  account360(lead: Lead): Observable<Account360> {
    return of(buildAccount360(lead)).pipe(delay(1300));
  }

  campaigns(): Observable<Campaign[]> {
    return of(structuredClone(CAMPAIGNS)).pipe(delay(1500));
  }

  engine(): Observable<EngineLayer[]> {
    return of(ENGINE_LAYERS).pipe(delay(1400));
  }

  /** Next item for the live signal ticker. */
  nextSignal(): MarketSignal {
    const s = SIGNAL_POOL[(6 + this.signalSeq) % SIGNAL_POOL.length];
    return this.toSignal(s, 0);
  }

  aiStatus(): Observable<AiStatus> {
    return new Observable<AiStatus>((sub) => {
      const ctrl = new AbortController();
      fetch(`${AI_BASE_URL}/health`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((h) => sub.next({ online: h.status === 'ok', model: h.model ?? 'unknown', status: h.status ?? 'unknown' }))
        .catch(() => !ctrl.signal.aborted && sub.next({ online: false, model: 'prospectiq-copilot', status: 'unreachable' }))
        .finally(() => sub.complete());
      return () => ctrl.abort();
    });
  }

  /**
   * Streams a Copilot draft from the local Ollama model via the AI service.
   * Falls back to the built-in templates if the service is unavailable.
   * Unsubscribing cancels the generation end to end.
   */
  copilot(lead: Lead, kind: CopilotKind): Observable<CopilotChunk> {
    return new Observable<CopilotChunk>((sub) => {
      const ctrl = new AbortController();
      let fallback: { unsubscribe(): void } | undefined;
      let text = '';

      (async () => {
        try {
          const res = await fetch(`${AI_BASE_URL}/v1/copilot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, lead }),
            signal: ctrl.signal,
          });
          if (!res.ok || !res.body) throw new Error(`AI service responded ${res.status}`);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
            if (text) sub.next({ text, source: 'ollama' });
          }
          sub.complete();
        } catch {
          if (ctrl.signal.aborted) return;
          // Mid-stream failure: keep what the model already wrote.
          if (text) return sub.complete();
          fallback = templateStream(lead, kind).subscribe(sub);
        }
      })();

      return () => {
        ctrl.abort();
        fallback?.unsubscribe();
      };
    });
  }

  private toSignal(s: (typeof SIGNAL_POOL)[number], minutesAgo: number): MarketSignal {
    return { ...s, id: `sig-${this.signalSeq++}`, minutesAgo };
  }
}

/** Offline fallback: types out the template draft so the UI behaves like a live stream. */
function templateStream(lead: Lead, kind: CopilotKind): Observable<CopilotChunk> {
  const full = draft(lead, kind);
  return timer(900).pipe(
    switchMap(() => interval(16)),
    map((i) => Math.min(full.length, (i + 1) * 9)),
    takeWhile((n) => n < full.length, true),
    map((n) => ({ text: full.slice(0, n), source: 'template' as const })),
  );
}

function draft(lead: Lead, kind: CopilotKind): string {
  const first = lead.contact.split(' ')[0];
  const trigger = lead.signals[0].toLowerCase();
  const consent =
    lead.country === 'CA'
      ? 'CASL: include sender ID + unsubscribe in every email.'
      : 'TCPA: business line verified; manual dial only.';

  switch (kind) {
    case 'phone':
      return `OPENER (${lead.bestWindow} ${lead.timezone})
"Hi ${first}, it's Jordan from ProspectIQ. I know I'm catching you out of the blue. Can I take 30 seconds to tell you why I called, and you decide if it's worth a conversation?"

REASON FOR CALL
"I saw ${lead.company} is ${trigger}. Usually that means ${lead.painPoint}. Is that on your plate right now?"

DISCOVERY
• How are reps choosing who to call first and when?
• What's your live connect rate today? The benchmark for ${lead.industry} in ${lead.city} is about 12%.
• Who else in ${lead.company} cares about pipeline coverage?

VALUE BRIDGE
"Teams like yours use our call-window model to reach decision-makers when they're actually at their phone. On average that's a +6 pt connect-rate lift in the first 30 days."

CLOSE
"Is it worth 20 minutes on Thursday to see which ${lead.region} accounts are showing buying intent right now?"

⚑ ${consent}`;

    case 'email':
      return `EMAIL 1 · Day 2 · Subject: ${lead.company} + ${trigger}
Hi ${first},
Congrats on the momentum. ${lead.company} is ${trigger}, which usually comes with pressure around ${lead.painPoint}.
We help ${lead.industry} teams in ${lead.city} reach decision-makers at the right hour. Customers see about 50% more live conversations.
Worth a 15-min look next week?

EMAIL 2 · Day 6 · Subject: the 9:30am window
${first}, quick data point: Directors in ${lead.industry} answer 3.1× more often between 9:30 and 11:00 ${lead.timezone} than after lunch. We schedule every dial around that.
Happy to share the ${lead.region} heatmap.

EMAIL 3 · Day 11 · Subject: close the loop?
Should I close this out, ${first}, or is ${lead.painPoint} still a priority this quarter?

⚑ ${consent}`;

    case 'objections':
      return `"We already have a dialer."
→ "Makes sense. Most of our customers do. We don't replace it. We tell it who to call and when, so the same number of dials produces more conversations."

"Send me some information."
→ "Happy to. So I send the right thing: is the bigger issue who to target or getting them on the phone?"

"No budget until next year."
→ "Understood. Teams like ${lead.company} usually fund this from existing SDR headcount, because a 6-pt connect lift is worth roughly one extra rep. Would a quick ROI model for ${lead.headcount} employees help?"

"We're focused on ${lead.country === 'CA' ? 'Canadian' : 'US'} compliance right now."
→ "So are we. Every contact is pre-screened for ${lead.country === 'CA' ? 'CASL consent' : 'TCPA and DNC'} before it reaches a rep."

"Now's not a good time."
→ "No problem. Our model says Tuesday around ${lead.bestWindow.split('·')[1]?.trim() ?? '10:00'} works better for you. Can I call you back then?"`;

    case 'roleplay':
      return `ROLEPLAY · ${first} (${lead.title}, ${lead.company}) · Mood: guarded, time-pressed

${first.toUpperCase()}: "${lead.company}, this is ${first}."
YOU: (Use the permission-based opener.)
${first.toUpperCase()}: "I've got two minutes before a pipeline review. What is this?"
YOU: (Tie it to: ${trigger}.)
${first.toUpperCase()}: "We already get plenty of intent data. It's noisy."
YOU: (Handle it: signals get turned into who to call and when.)
${first.toUpperCase()}: "Okay… how does it know when I'll pick up?"
YOU: (Explain the call-window model in one sentence, then ask for the meeting.)

SCORECARD TARGETS
• Talk ratio ≤ 45%  • 1+ open-ended question  • Clear next step with date/time`;
  }
}
