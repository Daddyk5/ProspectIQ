import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Forward /ai/* to the standalone AI service (ai-service/), streaming the
 * response through so Copilot drafts render token by token.
 */
const aiServiceUrl = (process.env['AI_SERVICE_URL'] ?? 'http://127.0.0.1:8787').replace(/\/$/, '');

app.use('/ai', express.raw({ type: '*/*', limit: '16kb' }), async (req, res) => {
  const upstreamAbort = new AbortController();
  res.on('close', () => upstreamAbort.abort());
  try {
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && Buffer.isBuffer(req.body);
    const upstream = await fetch(aiServiceUrl + req.url, {
      method: req.method,
      headers: { 'Content-Type': req.get('content-type') ?? 'application/json' },
      body: hasBody ? req.body : undefined,
      signal: upstreamAbort.signal,
    });
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    if (!upstream.body) return void res.end();
    Readable.fromWeb(upstream.body as WebReadableStream).pipe(res);
  } catch {
    if (!res.headersSent) res.status(503).json({ error: 'AI service unreachable' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
