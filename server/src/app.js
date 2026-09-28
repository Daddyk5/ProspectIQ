import express from 'express';
import { z } from 'zod';
import { createOllamaClient } from './ai/ollama-client.js';
import { optimizeSequenceController } from './ai/optimize-sequence.js';
import { cors, errorHandler, notFound, rateLimit } from './middleware/http.js';

const enrollSchema = z.object({ sequenceId: z.string().min(1).max(64) });
const statusSchema = z.object({ status: z.enum(['Running', 'Paused']) });

function validate(schema, body, res) {
  const r = schema.safeParse(body);
  if (!r.success) {
    res.status(422).json({ error: { code: 'VALIDATION_FAILED', message: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') } });
    return null;
  }
  return r.data;
}

export function createApp({ config, store, ollama = createOllamaClient(config.ollama) }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(config.corsOrigins));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', async (_req, res) => {
    res.json({ status: 'ok', ai: await ollama.health() });
  });

  // REST reads mirror the WebSocket snapshot for clients that cannot hold a socket.
  app.get('/api/campaigns', (_req, res) => res.json(store.campaigns()));
  app.get('/api/leads', (_req, res) => res.json(store.leads()));

  app.post('/api/leads/:id/enroll', (req, res) => {
    const body = validate(enrollSchema, req.body, res);
    if (!body) return;
    res.status(201).json(store.enroll(req.params.id, body.sequenceId));
  });

  app.patch('/api/campaigns/:id/status', (req, res) => {
    const body = validate(statusSchema, req.body, res);
    if (!body) return;
    res.json(store.setStatus(req.params.id, body.status));
  });

  app.get('/api/ai/health', async (_req, res) => {
    const h = await ollama.health();
    res.status(h.online ? 200 : 503).json(h);
  });
  app.post(
    '/api/ai/optimize-sequence',
    rateLimit(config.aiRateLimit),
    optimizeSequenceController({ ollama, models: config.ollama.models, store }),
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
