/**
 * Express application factory. Kept separate from server.js so tests can
 * mount it on a random port with an in-memory repository.
 */
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createSessionsRouter } from './routes/sessions.routes.js';
import { CSP_DIRECTIVES, CSP_HEADER_ONLY } from '../config/csp.js';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OPENAPI_FILE = resolve(ROOT_DIR, 'docs', 'openapi.yaml');

/** Write routes (POST and DELETE under /api/v1) share this budget per client IP. */
export const DEFAULT_RATE_LIMIT = { windowMs: 60_000, limit: 30 };
const WRITE_METHODS = new Set(['POST', 'DELETE']);

/**
 * @param {object} options
 * @param {object} options.repository  session store (see models/sessionRepository.js)
 * @param {boolean} [options.serveStatic=true]  also serve the built front end from dist/
 * @param {import('pino').Logger} [options.logger]  request/error logger; defaults to pino at LOG_LEVEL or info
 * @param {{ windowMs?: number, limit?: number } | false} [options.rateLimit]  write-route limit, or false to disable
 */
export function createApp({ repository, serveStatic = true, logger, rateLimit: rateLimitOptions = {} }) {
  const log = logger ?? pino({ level: process.env.LOG_LEVEL || 'info' });
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { ...CSP_DIRECTIVES, ...CSP_HEADER_ONLY }
      }
    })
  );

  // Logs method, url, status and timing; pino-http's serializers never include request bodies.
  app.use(pinoHttp({ logger: log }));

  if (rateLimitOptions !== false) {
    app.use(
      '/api/v1',
      rateLimit({
        ...DEFAULT_RATE_LIMIT,
        ...rateLimitOptions,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        skip: req => !WRITE_METHODS.has(req.method),
        handler: (req, res, _next, options) =>
          res.status(options.statusCode).json({ error: 'Too many requests, please try again later' })
      })
    );
  }

  app.use(express.json({ limit: '16kb' }));

  app.get('/api/v1/health', async (req, res, next) => {
    try {
      const { storage } = repository.health ? await repository.health() : { storage: 'ok' };
      const ok = storage === 'ok';
      res.status(ok ? 200 : 503).json({
        status: ok ? 'ok' : 'degraded',
        storage,
        service: 'breath-runner-api',
        time: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/v1/openapi.yaml', (req, res, next) => {
    res.type('application/yaml').sendFile(OPENAPI_FILE, err => err && next(err));
  });

  app.use('/api/v1', createSessionsRouter(repository));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (serveStatic) {
    // Serve only the built browser app (npm run build -> dist/), never server code or local data.
    const distDir = resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('/', (req, res) =>
      res.sendFile(resolve(distDir, 'index.html'), err => {
        if (err)
          res
            .status(503)
            .type('text')
            .send('The front end is not built yet. Run `npm run build` (or `npm start`), then reload.');
      })
    );
  }

  // Express only treats a middleware as an error handler when it declares all four arguments.
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    // Other client errors from body-parser (bad charset, etc.) keep their 4xx status.
    if (err.status >= 400 && err.status < 500)
      return res.status(err.status).json({ error: err.expose ? err.message : 'Bad request' });
    (req.log ?? log).error({ err }, 'unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
