/**
 * Breath Trainer server: serves the web app and the session REST API.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pino from 'pino';
import { createApp } from './app.js';
import { createSessionRepository } from './models/sessionRepository.js';
import { createCoopServer } from './ws/coopServer.js';

const PORT = Number(process.env.PORT) || 4000;
const DATA_FILE = process.env.DATA_FILE || resolve(dirname(fileURLToPath(import.meta.url)), 'data', 'sessions.json');
const SHUTDOWN_TIMEOUT_MS = 10_000;
// Writes per minute per client; override for load tests or the e2e suite.
const RATE_LIMIT_PER_MIN = process.env.RATE_LIMIT_PER_MIN ? Number(process.env.RATE_LIMIT_PER_MIN) : undefined;
// Behind a reverse proxy (Render, Fly, nginx) set TRUST_PROXY=1 so limits apply per client, not per proxy.
const TRUST_PROXY = process.env.TRUST_PROXY;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.cookie', 'req.headers.authorization']
});

// Use SQLite if USE_SQLITE=1 or if DATA_FILE ends in .db.
const useSqlite = process.env.USE_SQLITE === '1' || DATA_FILE.endsWith('.db');
let repository;
if (useSqlite) {
  const { createSqliteRepository } = await import('./models/sqliteRepository.js');
  repository = await createSqliteRepository({ filePath: DATA_FILE, log: logger });
} else {
  repository = await createSessionRepository({ filePath: DATA_FILE, log: logger });
}
const app = createApp({
  repository,
  logger,
  rateLimit: RATE_LIMIT_PER_MIN ? { limit: RATE_LIMIT_PER_MIN } : {}
});
if (TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY);

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, dataFile: DATA_FILE }, `[Breath Trainer] http://localhost:${PORT}`);
});

// Attach WebSocket co-op server to the same HTTP server.
createCoopServer(server, { log: logger });

let shuttingDown = false;

/** Stop accepting connections, let in-flight requests finish, drain the write queue, then exit. */
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  setTimeout(() => {
    logger.error('shutdown timed out; exiting anyway');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  const closed = new Promise(r => server.close(r));
  server.closeIdleConnections();
  await closed;
  await repository.flush();
  logger.info('shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
