import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api';
import { readNdjson, streamOptimizeSequence, type OptimizeSequenceRequest } from './optimize-sequence';

function byteStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      chunks.forEach((t) => c.enqueue(enc.encode(t)));
      c.close();
    },
  });
}

const payload = {
  lead: { company: 'Northwind', contact: 'Priya', title: 'Director', industry: 'Logistics', city: 'Toronto', region: 'ON', country: 'CA', intentTier: 'High', intentScore: 88, icp: 94, lastSignal: 'Hiring' },
  sequence: { id: 's', name: 'Q4', trigger: { intentMin: 60, icpMin: 80 }, steps: [{ day: 1, channel: 'call', title: 'Call', inbound: 1, done: 1, conversionRate: 20 }] },
  objective: 'improve-conversion',
} satisfies OptimizeSequenceRequest;

afterEach(() => vi.unstubAllGlobals());

describe('readNdjson', () => {
  it('reassembles objects split across arbitrary chunk boundaries', async () => {
    const out = [];
    for await (const o of readNdjson(byteStream(['{"type":"to', 'ken","text":"Hi"}\n{"type":', '"done"}']))) out.push(o);
    expect(out).toEqual([{ type: 'token', text: 'Hi' }, { type: 'done' }]);
  });
});

describe('streamOptimizeSequence', () => {
  it('yields meta, tokens and done in order', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(byteStream([
      '{"type":"meta","requestId":"r","model":"llama3.2:3b","fallback":false}\n',
      '{"type":"token","text":"DIAGNOSIS"}\n{"type":"done","model":"llama3.2:3b","evalCount":1,"totalDurationMs":10,"doneReason":"stop"}\n',
    ]))));
    const types = [];
    for await (const e of streamOptimizeSequence(payload)) types.push(e.type);
    expect(types).toEqual(['meta', 'token', 'done']);
  });

  it('throws a typed ApiError with the server hint when Ollama is offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { code: 'OLLAMA_UNREACHABLE', message: 'Cannot connect', hint: 'Start Ollama', retryable: true } }, { status: 503 })));
    const gen = streamOptimizeSequence(payload);
    await expect(gen.next()).rejects.toMatchObject({ name: 'ApiError', code: 'OLLAMA_UNREACHABLE', hint: 'Start Ollama', status: 503 });
  });

  it('reports an interrupted stream instead of ending silently', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(byteStream(['{"type":"token","text":"Half"}\n']))));
    const events = [];
    for await (const e of streamOptimizeSequence(payload)) events.push(e);
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'STREAM_INTERRUPTED' });
  });

  it('maps a network failure to NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const err = await streamOptimizeSequence(payload).next().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NETWORK_ERROR');
  });
});
