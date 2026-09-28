/**
 * Typed failure from the Ollama layer. `status` is the HTTP status the API
 * returns when the error happens before streaming starts.
 */
export class OllamaError extends Error {
  constructor(code, message, { status = 503, retryable = true, hint } = {}) {
    super(message);
    this.name = 'OllamaError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.hint = hint;
  }
}

const UNREACHABLE_HINT = 'Start Ollama (`ollama serve` or the desktop app) and check that OLLAMA_HOST points to it.';

function failureFor(reason, cause, host) {
  switch (reason) {
    case 'client':
      return new OllamaError('ABORTED', 'Client disconnected', { status: 499, retryable: false });
    case 'connect':
      return new OllamaError('OLLAMA_UNREACHABLE', `No response from Ollama at ${host}`, { hint: UNREACHABLE_HINT });
    case 'first-token':
      return new OllamaError('OLLAMA_TIMEOUT', 'The model did not start responding in time (it may still be loading)', { status: 504 });
    case 'idle':
      return new OllamaError('OLLAMA_TIMEOUT', 'The model stalled mid-response', { status: 504 });
    case 'total':
      return new OllamaError('OLLAMA_TIMEOUT', 'Generation exceeded the maximum allowed time', { status: 504 });
    default:
      return new OllamaError('OLLAMA_UNREACHABLE', `Cannot connect to Ollama at ${host}: ${cause?.cause?.code ?? cause?.message ?? 'unknown error'}`, { hint: UNREACHABLE_HINT });
  }
}

/**
 * Minimal Ollama client for `/api/generate` with `stream: true`.
 *
 * Four independent timers guard each request:
 *  - connect:     reachability preflight (GET /api/version). Ollama withholds
 *                 /api/generate headers until the model is loaded, so the
 *                 generate call itself cannot be used to detect "offline" quickly
 *  - first-token: until the first token arrives (covers cold model loads)
 *  - idle:        maximum silence between tokens
 *  - total:       hard ceiling for the whole generation
 */
export function createOllamaClient(cfg) {
  async function health() {
    try {
      const r = await fetch(`${cfg.host}/api/tags`, { signal: AbortSignal.timeout(cfg.connectTimeoutMs) });
      const { models = [] } = await r.json();
      const installed = models.map((m) => m.name);
      const available = cfg.models.filter((m) => installed.includes(m) || installed.includes(`${m}:latest`));
      return { online: true, host: cfg.host, preferredModels: cfg.models, availableModels: available };
    } catch {
      return { online: false, host: cfg.host, preferredModels: cfg.models, availableModels: [] };
    }
  }

  /** Yields `{ type: 'token', text }` events, then one `{ type: 'done', ... }`. */
  async function* generate({ model, system, prompt, signal }) {
    const ctrl = new AbortController();
    let reason = null;
    const abort = (r) => {
      if (reason) return;
      reason = r;
      ctrl.abort();
    };
    const onClientAbort = () => abort('client');
    if (signal?.aborted) abort('client');
    signal?.addEventListener('abort', onClientAbort, { once: true });

    const total = setTimeout(() => abort('total'), cfg.totalTimeoutMs);
    let stage = setTimeout(() => abort('connect'), cfg.connectTimeoutMs);
    const arm = (ms, r) => {
      clearTimeout(stage);
      stage = setTimeout(() => abort(r), ms);
    };

    try {
      try {
        await fetch(`${cfg.host}/api/version`, { signal: ctrl.signal }).then((r) => r.body?.cancel());
      } catch (e) {
        throw failureFor(reason, e, cfg.host);
      }
      arm(cfg.firstTokenTimeoutMs, 'first-token');

      let res;
      try {
        res = await fetch(`${cfg.host}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, system, prompt, stream: true, options: cfg.options, keep_alive: '15m' }),
          signal: ctrl.signal,
        });
      } catch (e) {
        throw failureFor(reason, e, cfg.host);
      }

      if (res.status === 404) {
        const detail = await res.text().catch(() => '');
        throw new OllamaError('MODEL_NOT_FOUND', `Model "${model}" is not installed in Ollama`, {
          status: 424,
          retryable: false,
          hint: `Run \`ollama pull ${model}\`. ${detail.slice(0, 120)}`.trim(),
        });
      }
      if (!res.ok || !res.body) {
        throw new OllamaError('OLLAMA_BAD_RESPONSE', `Ollama responded with HTTP ${res.status}`, { status: 502 });
      }

      const decoder = new TextDecoder();
      let buffer = '';
      try {
        for await (const chunk of res.body) {
          buffer += decoder.decode(chunk, { stream: true });
          let nl;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            let msg;
            try {
              msg = JSON.parse(line);
            } catch {
              throw new OllamaError('OLLAMA_BAD_RESPONSE', 'Malformed chunk in Ollama stream', { status: 502 });
            }
            if (msg.error) throw new OllamaError('OLLAMA_STREAM_ERROR', String(msg.error), { status: 502 });
            if (msg.response) {
              arm(cfg.idleTimeoutMs, 'idle');
              yield { type: 'token', text: msg.response };
            }
            if (msg.done) {
              yield {
                type: 'done',
                doneReason: msg.done_reason ?? 'stop',
                evalCount: msg.eval_count ?? null,
                totalDurationMs: msg.total_duration ? Math.round(msg.total_duration / 1e6) : null,
              };
              return;
            }
          }
        }
      } catch (e) {
        if (e instanceof OllamaError) throw e;
        throw failureFor(reason, e, cfg.host);
      }
      throw new OllamaError('OLLAMA_STREAM_ERROR', 'Ollama closed the stream before finishing', { status: 502 });
    } finally {
      clearTimeout(total);
      clearTimeout(stage);
      signal?.removeEventListener('abort', onClientAbort);
      ctrl.abort(); // releases the upstream request if the consumer stopped early
    }
  }

  return { health, generate };
}
