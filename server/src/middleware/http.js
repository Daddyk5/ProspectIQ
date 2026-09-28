/** Allows the configured browser origins (the Vite dev server by default). */
export function cors(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Expose-Headers': 'X-Request-Id',
        Vary: 'Origin',
      });
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  };
}

/** Fixed-window, per-IP limiter. Good enough for a single instance; use Redis when scaling out. */
export function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const key = req.ip ?? 'unknown';
    const count = (hits.get(key) ?? 0) + 1;
    hits.set(key, count);
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - count)));
    if (count > max) {
      return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many AI requests. Try again in a minute.', retryable: true } });
    }
    next();
  };
}

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return res.end();
  // body-parser failures: malformed JSON (400) or oversized payload (413)
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: {
      code: status === 400 ? 'BAD_REQUEST' : status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR',
      message: status >= 500 ? 'Internal server error' : err.message,
    },
  });
}
