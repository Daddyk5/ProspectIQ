import { ServerMessageSchema, type ServerMessage } from '../types';

export type SocketStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

interface Options {
  onMessage: (msg: ServerMessage) => void;
  onStatus: (status: SocketStatus) => void;
  /** Injected for tests. */
  createSocket?: (url: string) => WebSocket;
}

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * WebSocket client with exponential backoff + jitter. Incoming frames are
 * parsed and schema-validated; anything malformed is dropped, never dispatched.
 */
export class RealtimeSocket {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private readonly url: string;
  private readonly opts: Options;

  constructor(url: string, opts: Options) {
    this.url = url;
    this.opts = opts;
  }

  connect(): void {
    this.stopped = false;
    this.opts.onStatus(this.attempt === 0 ? 'connecting' : 'reconnecting');
    const ws = (this.opts.createSocket ?? ((u) => new WebSocket(u)))(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.opts.onStatus('open');
    };
    ws.onmessage = (event) => {
      let data: unknown;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        console.warn('[realtime] dropped non-JSON frame');
        return;
      }
      const parsed = ServerMessageSchema.safeParse(data);
      if (!parsed.success) {
        console.warn('[realtime] dropped message that failed validation', parsed.error.issues[0]);
        return;
      }
      this.opts.onMessage(parsed.data);
    };
    ws.onclose = () => {
      this.ws = null;
      if (this.stopped) return this.opts.onStatus('closed');
      this.scheduleReconnect();
    };
    ws.onerror = () => ws.close();
  }

  close(): void {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    this.ws?.close(1000, 'client closed');
    this.ws = null;
  }

  private scheduleReconnect(): void {
    this.opts.onStatus('reconnecting');
    const base = Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** this.attempt++);
    const delay = base / 2 + Math.random() * (base / 2);
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }
}
