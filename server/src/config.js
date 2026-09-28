const env = process.env;

function int(name, fallback) {
  const n = Number.parseInt(env[name] ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function list(name, fallback) {
  return (env[name] ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  production: env.NODE_ENV === 'production' || process.argv.includes('--production'),
  port: int('PORT', 8080),
  host: env.HOST ?? '127.0.0.1',
  corsOrigins: list('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'),
  simulateLive: (env.SIMULATE_LIVE ?? 'true') !== 'false',

  ollama: {
    host: (env.OLLAMA_HOST ?? 'http://localhost:11434').replace(/\/$/, ''),
    /** Tried in order; the next one is used if a model is not installed. */
    models: list('OLLAMA_MODELS', 'llama3.2:3b,llama3,mistral'),
    connectTimeoutMs: int('OLLAMA_CONNECT_TIMEOUT_MS', 5_000),
    firstTokenTimeoutMs: int('OLLAMA_FIRST_TOKEN_TIMEOUT_MS', 60_000),
    idleTimeoutMs: int('OLLAMA_IDLE_TIMEOUT_MS', 20_000),
    totalTimeoutMs: int('OLLAMA_TOTAL_TIMEOUT_MS', 120_000),
    // Safety caps applied to every generation regardless of what the client asks for.
    options: {
      temperature: 0.4,
      top_p: 0.9,
      repeat_penalty: 1.1,
      num_ctx: 4096,
      num_predict: int('OLLAMA_MAX_TOKENS', 600),
    },
  },

  aiRateLimit: { windowMs: 60_000, max: int('AI_RATE_LIMIT_PER_MIN', 12) },
};
