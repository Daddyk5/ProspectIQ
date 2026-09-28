// ProspectIQ AI service: a standalone HTTP gateway in front of a local Ollama model.
// Zero dependencies; run with `node server.mjs` (Node 20+).
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { buildMessages, complianceLine, COPILOT_KINDS, sanitizeLead } from './prompts.mjs';

export const config = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? '127.0.0.1',
  ollamaUrl: (process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, ''),
  model: process.env.OLLAMA_MODEL ?? 'prospectiq-copilot',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:4200,http://localhost:4000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

const MAX_BODY_BYTES = 16 * 1024;

function log(msg, extra = {}) {
  console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra }));
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

async function health(res) {
  try {
    const r = await fetch(`${config.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const { models = [] } = await r.json();
    const names = models.map((m) => m.name);
    const modelAvailable = names.some((n) => n === config.model || n === `${config.model}:latest`);
    json(res, modelAvailable ? 200 : 503, { status: modelAvailable ? 'ok' : 'model-missing', model: config.model, ollama: true, modelAvailable });
  } catch {
    json(res, 503, { status: 'ollama-unreachable', model: config.model, ollama: false, modelAvailable: false });
  }
}

/** Streams the model's reply to the client as plain UTF-8 text. */
async function copilot(req, res) {
  const body = await readJson(req);
  const kind = body?.kind;
  if (!COPILOT_KINDS.includes(kind)) return json(res, 400, { error: `kind must be one of ${COPILOT_KINDS.join(', ')}` });
  const lead = sanitizeLead(body?.lead);
  if (!lead) return json(res, 400, { error: 'lead must include company, contact, title and country (US|CA)' });

  // Cancel the model run if the browser goes away (drawer closed, regenerate clicked).
  const upstream = new AbortController();
  res.on('close', () => upstream.abort());

  let ollama;
  try {
    ollama = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages: buildMessages(kind, lead), stream: true, keep_alive: '30m' }),
      signal: upstream.signal,
    });
  } catch (e) {
    return json(res, 503, { error: 'Ollama is unreachable', detail: String(e.message ?? e) });
  }
  if (!ollama.ok || !ollama.body) {
    const detail = await ollama.text().catch(() => '');
    return json(res, 503, { error: `Ollama returned ${ollama.status}`, detail: detail.slice(0, 300) });
  }

  const started = Date.now();
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
    'X-Model': config.model,
  });

  const decoder = new TextDecoder();
  let buffered = '';
  let chars = 0;
  try {
    for await (const chunk of ollama.body) {
      buffered += decoder.decode(chunk, { stream: true });
      let nl;
      while ((nl = buffered.indexOf('\n')) >= 0) {
        const line = buffered.slice(0, nl).trim();
        buffered = buffered.slice(nl + 1);
        if (!line) continue;
        const msg = JSON.parse(line);
        if (msg.error) throw new Error(msg.error);
        const token = msg.message?.content ?? '';
        if (token) {
          chars += token.length;
          res.write(token);
        }
      }
    }
    const compliance = complianceLine(kind, lead);
    if (compliance) res.write(`

${compliance}`);
    log('copilot.done', { kind, company: lead.company, chars, ms: Date.now() - started });
  } catch (e) {
    if (!upstream.signal.aborted) log('copilot.error', { kind, error: String(e.message ?? e) });
  } finally {
    res.end();
  }
}

export function createApp() {
  return createServer(async (req, res) => {
    cors(req, res);
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (req.method === 'OPTIONS') return res.writeHead(204).end();
      if (req.method === 'GET' && pathname === '/health') return await health(res);
      if (req.method === 'POST' && pathname === '/v1/copilot') return await copilot(req, res);
      json(res, 404, { error: 'Not found' });
    } catch (e) {
      if (!res.headersSent) json(res, e.status ?? 500, { error: e.status ? e.message : 'Internal error' });
      else res.end();
      if (!e.status) log('request.error', { path: pathname, error: String(e.stack ?? e) });
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  createApp().listen(config.port, config.host, () =>
    log('listening', { url: `http://${config.host}:${config.port}`, model: config.model, ollama: config.ollamaUrl }),
  );
}
