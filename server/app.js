/**
 * Express application factory. Kept separate from server.js so tests can
 * mount it on a random port with an in-memory repository.
 */
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createSessionsRouter } from './routes/sessions.routes.js';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function createApp({ repository, serveStatic = true }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', service: 'breath-runner-api', time: new Date().toISOString() });
  });

  app.use('/api/v1', createSessionsRouter(repository));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (serveStatic) {
    // Serve only the built browser app (npm run build -> dist/), never server code or local data.
    const distDir = resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('/', (req, res, next) => res.sendFile(resolve(distDir, 'index.html'), err => err && next()));
  }

  // Express only treats a middleware as an error handler when it declares all four arguments.
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    // Other client errors from body-parser (bad charset, etc.) keep their 4xx status.
    if (err.status >= 400 && err.status < 500)
      return res.status(err.status).json({ error: err.expose ? err.message : 'Bad request' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
