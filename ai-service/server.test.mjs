import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, describe, it } from 'node:test';
import { buildMessages, sanitizeLead } from './prompts.mjs';
import { config, createApp } from './server.mjs';

const LEAD = {
  company: 'Northwind Logistics', industry: 'Logistics', contact: 'Priya Raman', title: 'Director of Sales Operations',
  seniority: 'Director', city: 'Toronto', region: 'ON', country: 'CA', bestWindow: 'Tue–Thu · 9:30–11:00', timezone: 'ET',
  painPoint: 'ramping a new SDR pod', signals: ['Hiring 5 SDRs', 'Series C'], techStack: ['Salesforce'],
  headcount: 420, headcountGrowth: 18, icp: 94, reachability: 78, intentScore: 88,
};

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
}

describe('prompts', () => {
  it('whitelists and truncates lead fields', () => {
    const lead = sanitizeLead({ ...LEAD, painPoint: 'x'.repeat(500), secret: 'nope', signals: [...Array(10)].map((_, i) => `s${i}`) });
    assert.equal(lead.painPoint.length, 160);
    assert.equal(lead.signals.length, 6);
    assert.equal('secret' in lead, false);
  });

  it('rejects leads without required fields or with an unknown country', () => {
    assert.equal(sanitizeLead({ ...LEAD, country: 'MX' }), null);
    assert.equal(sanitizeLead({ ...LEAD, contact: '' }), null);
    assert.equal(sanitizeLead(null), null);
  });

  it('grounds the prompt on the lead and its compliance regime', () => {
    const [msg] = buildMessages('email', sanitizeLead(LEAD));
    assert.match(msg.content, /Priya Raman, Director of Sales Operations/);
    assert.match(msg.content, /Hiring 5 SDRs/);
    assert.match(msg.content, /CASL \(Canada\)/);
  });
});

describe('http service', () => {
  let fakeOllama, app, base, lastChat;

  before(async () => {
    fakeOllama = createServer(async (req, res) => {
      if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: `${config.model}:latest` }] }));
      let body = '';
      for await (const c of req) body += c;
      lastChat = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      for (const t of ['OPENER\n', 'Hi Priya', ', quick one.']) res.write(JSON.stringify({ message: { content: t } }) + '\n');
      res.end(JSON.stringify({ done: true }) + '\n');
    });
    config.ollamaUrl = await listen(fakeOllama);
    app = createApp();
    base = await listen(app);
  });
  after(() => {
    app.close();
    fakeOllama.close();
  });

  it('reports health when the model is installed', async () => {
    const r = await fetch(`${base}/health`);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).modelAvailable, true);
  });

  it('streams the model output as plain text', async () => {
    const r = await fetch(`${base}/v1/copilot`, { method: 'POST', body: JSON.stringify({ kind: 'phone', lead: LEAD }) });
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.ok(text.startsWith('OPENER\nHi Priya, quick one.\n\n⚑ Compliance: CASL'), text);
    assert.equal(lastChat.model, config.model);
    assert.equal(lastChat.stream, true);
  });

  it('rejects invalid requests', async () => {
    const bad = await fetch(`${base}/v1/copilot`, { method: 'POST', body: JSON.stringify({ kind: 'poem', lead: LEAD }) });
    assert.equal(bad.status, 400);
    const huge = await fetch(`${base}/v1/copilot`, { method: 'POST', body: 'x'.repeat(20_000) });
    assert.equal(huge.status, 413);
  });

  it('returns 503 when Ollama is down', async () => {
    const saved = config.ollamaUrl;
    config.ollamaUrl = 'http://127.0.0.1:9';
    const r = await fetch(`${base}/v1/copilot`, { method: 'POST', body: JSON.stringify({ kind: 'email', lead: LEAD }) });
    config.ollamaUrl = saved;
    assert.equal(r.status, 503);
  });
});
