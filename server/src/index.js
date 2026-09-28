import { createServer } from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { attachWsHub } from './realtime/ws-hub.js';
import { Store } from './realtime/store.js';

const store = new Store();
const app = createApp({ config, store });
const server = createServer(app);
const wss = attachWsHub(server, store, { path: '/ws', allowedOrigins: config.corsOrigins });

if (config.simulateLive) store.startSimulation();

server.listen(config.port, config.host, () => {
  console.log(
    `ProspectIQ server on http://${config.host}:${config.port} (ws: /ws, ${config.production ? 'production' : 'development'}, ` +
      `ollama: ${config.ollama.host} [${config.ollama.models.join(', ')}], live simulation: ${config.simulateLive})`,
  );
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  store.stopSimulation();
  for (const ws of wss.clients) ws.close(1001, 'Server shutting down');
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
