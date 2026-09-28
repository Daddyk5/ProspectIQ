import { env } from '../../lib/env';
import { ApiError, toApiError } from '../api';
import type { Campaign, Lead } from '../../types';

export type OptimizeObjective = 'improve-conversion' | 'shorten-cycle' | 'personalize';

export interface OptimizeSequenceRequest {
  lead: Pick<Lead, 'company' | 'contact' | 'title' | 'industry' | 'city' | 'region' | 'country' | 'intentTier' | 'intentScore' | 'icp' | 'lastSignal'>;
  sequence: {
    id: string;
    name: string;
    trigger: Campaign['trigger'];
    steps: Pick<Campaign['steps'][number], 'day' | 'channel' | 'title' | 'inbound' | 'done' | 'conversionRate'>[];
  };
  objective: OptimizeObjective;
  model?: string;
}

export type OptimizeEvent =
  | { type: 'meta'; requestId: string; model: string; fallback: boolean }
  | { type: 'token'; text: string }
  | { type: 'done'; model: string; evalCount: number | null; totalDurationMs: number | null; doneReason: string }
  | { type: 'error'; code: string; message: string; retryable: boolean };

/** Builds the request payload from live workspace state. */
export function buildOptimizeRequest(lead: Lead, campaign: Campaign, objective: OptimizeObjective): OptimizeSequenceRequest {
  return {
    lead: {
      company: lead.company,
      contact: lead.contact,
      title: lead.title,
      industry: lead.industry,
      city: lead.city,
      region: lead.region,
      country: lead.country,
      intentTier: lead.intentTier,
      intentScore: Math.round(lead.intentScore),
      icp: Math.round(lead.icp),
      lastSignal: lead.lastSignal,
    },
    sequence: {
      id: campaign.id,
      name: campaign.name,
      trigger: campaign.trigger,
      steps: campaign.steps.map(({ day, channel, title, inbound, done, conversionRate }) => ({ day, channel, title, inbound, done, conversionRate })),
    },
    objective,
  };
}

/** Splits an NDJSON byte stream into parsed objects, tolerating chunk boundaries anywhere. */
export async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) yield JSON.parse(line);
      }
      if (done) {
        if (buffer.trim()) yield JSON.parse(buffer);
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Calls POST /api/ai/optimize-sequence and yields events as tokens stream in.
 * Throws ApiError for failures before streaming (offline, validation, rate limit);
 * failures after streaming started arrive as `{ type: 'error' }` events.
 */
export async function* streamOptimizeSequence(payload: OptimizeSequenceRequest, signal?: AbortSignal): AsyncGenerator<OptimizeEvent> {
  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/api/ai/optimize-sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the ProspectIQ server', { retryable: true });
  }
  if (!res.ok) throw await toApiError(res);
  if (!res.body) throw new ApiError(502, 'EMPTY_STREAM', 'The AI service returned an empty response');

  let finished = false;
  for await (const event of readNdjson(res.body)) {
    const e = event as OptimizeEvent;
    if (e.type === 'done' || e.type === 'error') finished = true;
    yield e;
  }
  if (!finished && !signal?.aborted) {
    yield { type: 'error', code: 'STREAM_INTERRUPTED', message: 'The connection closed before the answer finished', retryable: true };
  }
}
