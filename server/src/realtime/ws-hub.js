import { WebSocketServer } from 'ws';

const HEARTBEAT_MS = 25_000;

/**
 * Pushes the workspace state to every connected client: a full `snapshot` on
 * connect, then one message per store event. Messages are JSON envelopes:
 *   { "type": "snapshot" | "campaign.updated" | "lead.updated" | "metrics.updated",
 *     "ts": "<ISO time>", "payload": { ... } }
 */
export function attachWsHub(httpServer, store, { path = '/ws', allowedOrigins = [] } = {}) {
  const wss = new WebSocketServer({
    server: httpServer,
    path,
    maxPayload: 4 * 1024,
    verifyClient: ({ origin }) => !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin),
  });

  const send = (ws, type, payload) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ts: new Date().toISOString(), payload }));
  };

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));
    // Clients only listen; anything they send is ignored apart from a ping.
    ws.on('message', (raw) => {
      if (raw.toString() === 'ping') send(ws, 'pong', {});
    });
    send(ws, 'snapshot', store.snapshot());
  });

  const onEvent = ({ type, payload }) => {
    for (const ws of wss.clients) send(ws, type, payload);
  };
  store.on('event', onEvent);

  // Drop connections that stopped answering pings (sleeping laptops, dead proxies).
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  wss.on('close', () => {
    clearInterval(heartbeat);
    store.off('event', onEvent);
  });
  return wss;
}
