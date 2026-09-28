import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import WebSocket from 'ws';
import { createApp } from '../src/app.js';
import { attachWsHub } from '../src/realtime/ws-hub.js';
import { Store } from '../src/realtime/store.js';

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`127.0.0.1:${server.address().port}`)));

// Scriptable fake of Ollama's /api/generate and /api/tags.
let behavior;
const fakeOllama = createServer(async (req, res) => {
  if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: 'good-model:latest' }] }));
  if (req.url === '/api/version') return res.end(JSON.stringify({ version: 'fake' }));
  let body = '';
  for await (const c of req) body += c;
  const { model, stream } = JSON.parse(body);
  assert.equal(stream, true);
  return behavior(model, res);
});

const BODY = {
  lead: { company: 'Northwind Logistics', contact: 'Priya Raman', title: 'Director of Sales Operations', country: 'CA', lastSignal: 'Posted 5 SDR job openings' },
  sequence: {
    name: 'Q4 Canada Expansion',
    steps: [
      { day: 1, channel: 'call', title: 'Precision AI Call Window', inbound: 1840, done: 1612, conversionRate: 21.4 },
      { day: 2, channel: 'email', title: 'Hyper-Personalized Email', conversionRate: 38.2 },
    ],
  },
};

function config(ollamaHost, overrides = {}) {
  return {
    corsOrigins: ['http://localhost:5173'],
    aiRateLimit: { windowMs: 60_000, max: 100 },
    ollama: {
      host: ollamaHost,
      models: ['missing-model', 'good-model'],
      connectTimeoutMs: 150,
      firstTokenTimeoutMs: 600,
      idleTimeoutMs: 300,
      totalTimeoutMs: 2000,
      options: { num_predict: 50 },
      ...overrides,
    },
  };
}

const post = (base, body) =>
  fetch(`http://${base}/api/ai/optimize-sequence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const ndjson = async (res) => (await res.text()).trim().split('\n').map((l) => JSON.parse(l));

describe('POST /api/ai/optimize-sequence', () => {
  let ollamaHost, server, base, store;

  before(async () => {
    ollamaHost = `http://${await listen(fakeOllama)}`;
    store = new Store();
    server = createServer(createApp({ config: config(ollamaHost), store }));
    base = await listen(server);
  });
  after(() => {
    server.close();
    fakeOllama.close();
  });
  beforeEach(() => {
    behavior = (model, res) => {
      if (model !== 'good-model') {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: `model '${model}' not found` }));
      }
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      for (const t of ['DIAGNOSIS: ', 'Day 1 call ', 'converts lowest.']) res.write(JSON.stringify({ response: t, done: false }) + '\n');
      res.end(JSON.stringify({ response: '', done: true, done_reason: 'stop', eval_count: 3, total_duration: 5e8 }) + '\n');
    };
  });

  it('rejects payloads that fail the schema with 422 and field paths', async () => {
    const res = await post(base, { ...BODY, lead: { ...BODY.lead, country: 'MX' } });
    assert.equal(res.status, 422);
    const { error } = await res.json();
    assert.equal(error.code, 'VALIDATION_FAILED');
    assert.ok(error.issues.some((i) => i.path === 'lead.country'));
  });

  it('streams NDJSON tokens, falling back past a model that is not installed', async () => {
    const creditsBefore = store.snapshot().metrics.credits.used;
    const res = await post(base, BODY);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/x-ndjson/);
    const events = await ndjson(res);
    assert.deepEqual(events[0], { type: 'meta', requestId: events[0].requestId, model: 'good-model', fallback: true });
    assert.equal(events.filter((e) => e.type === 'token').map((e) => e.text).join(''), 'DIAGNOSIS: Day 1 call converts lowest.');
    assert.equal(events.at(-1).type, 'done');
    assert.equal(events.at(-1).totalDurationMs, 500);
    assert.equal(store.snapshot().metrics.credits.used, creditsBefore + 1);
  });

  it('waits past the connect timeout while Ollama loads the model (headers arrive late)', async () => {
    behavior = (_model, res) =>
      setTimeout(() => {
        res.writeHead(200);
        res.end(`${JSON.stringify({ response: 'Loaded', done: false })}\n${JSON.stringify({ done: true })}\n`);
      }, 350); // > connectTimeoutMs, < firstTokenTimeoutMs
    const res = await post(base, BODY);
    assert.equal(res.status, 200);
    const events = await ndjson(res);
    assert.ok(events.some((e) => e.type === 'token' && e.text === 'Loaded'));
  });

  it('returns 504 when the model never produces a first token', async () => {
    behavior = (_model, res) => res.writeHead(200).flushHeaders(); // headers, then silence
    const res = await post(base, BODY);
    assert.equal(res.status, 504);
    assert.equal((await res.json()).error.code, 'OLLAMA_TIMEOUT');
  });

  it('emits an error event when the model stalls mid-stream', async () => {
    behavior = (_model, res) => {
      res.writeHead(200);
      res.write(JSON.stringify({ response: 'Partial', done: false }) + '\n');
    };
    const events = await ndjson(await post(base, BODY));
    assert.equal(events.at(-1).type, 'error');
    assert.equal(events.at(-1).code, 'OLLAMA_TIMEOUT');
    assert.ok(events.some((e) => e.type === 'token' && e.text === 'Partial'));
  });

  it('forwards Ollama stream errors as error events', async () => {
    behavior = (_model, res) => {
      res.writeHead(200);
      res.write(JSON.stringify({ response: 'Hi', done: false }) + '\n');
      res.end(JSON.stringify({ error: 'CUDA out of memory' }) + '\n');
    };
    const events = await ndjson(await post(base, BODY));
    assert.deepEqual(events.at(-1), { type: 'error', code: 'OLLAMA_STREAM_ERROR', message: 'CUDA out of memory', retryable: true });
  });

  it('returns 424 with a pull hint when no configured model is installed', async () => {
    behavior = (model, res) => {
      res.writeHead(404);
      res.end(JSON.stringify({ error: `model '${model}' not found` }));
    };
    const res = await post(base, BODY);
    assert.equal(res.status, 424);
    const { error } = await res.json();
    assert.equal(error.code, 'MODEL_NOT_FOUND');
    assert.match(error.hint, /ollama pull good-model/);
  });
});

describe('when Ollama is offline', () => {
  it('returns 503 OLLAMA_UNREACHABLE with a hint, and health reports offline', async () => {
    const server = createServer(createApp({ config: config('http://127.0.0.1:9'), store: new Store() }));
    const base = await listen(server);
    const res = await post(base, BODY);
    assert.equal(res.status, 503);
    const { error } = await res.json();
    assert.equal(error.code, 'OLLAMA_UNREACHABLE');
    assert.equal(error.retryable, true);
    assert.match(error.hint, /ollama serve/);
    const health = await fetch(`http://${base}/api/ai/health`);
    assert.equal(health.status, 503);
    server.close();
  });
});

describe('rate limiting', () => {
  it('returns 429 once the per-minute budget is spent', async () => {
    const cfg = config('http://127.0.0.1:9');
    cfg.aiRateLimit = { windowMs: 60_000, max: 1 };
    const server = createServer(createApp({ config: cfg, store: new Store() }));
    const base = await listen(server);
    await post(base, BODY);
    const res = await post(base, BODY);
    assert.equal(res.status, 429);
    server.close();
  });
});

describe('WebSocket hub', () => {
  it('sends a snapshot, then pushes updates when a lead is enrolled over REST', async () => {
    const store = new Store();
    const server = createServer(createApp({ config: config('http://127.0.0.1:9'), store }));
    const wss = attachWsHub(server, store, { allowedOrigins: [] });
    const base = await listen(server);

    const ws = new WebSocket(`ws://${base}/ws`);
    const messages = [];
    const waitFor = (pred) =>
      new Promise((resolve) => {
        const check = () => {
          const m = messages.find(pred);
          if (m) resolve(m);
          else setTimeout(check, 10);
        };
        check();
      });
    ws.on('message', (raw) => messages.push(JSON.parse(raw)));

    const snapshot = await waitFor((m) => m.type === 'snapshot');
    assert.equal(snapshot.payload.metrics.signalsToday, 2104);
    assert.equal(snapshot.payload.metrics.credits.used, 6812);
    const lead = snapshot.payload.leads.find((l) => l.country === 'US');

    const res = await fetch(`http://${base}/api/leads/${lead.id}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequenceId: 'seq-ca-q4' }),
    });
    assert.equal(res.status, 201);
    const update = await waitFor((m) => m.type === 'lead.updated');
    assert.equal(update.payload.enrolledSequenceId, 'seq-ca-q4');
    const campaign = await waitFor((m) => m.type === 'campaign.updated');
    assert.equal(campaign.payload.steps[0].inbound, 1841);

    const again = await fetch(`http://${base}/api/leads/${lead.id}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequenceId: 'seq-ca-q4' }),
    });
    assert.equal(again.status, 409);

    ws.close();
    wss.close();
    server.close();
  });
});
