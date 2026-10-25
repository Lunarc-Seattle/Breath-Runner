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
    res.json({ status: 'ok', service: 'breath-trainer-api', time: new Date().toISOString() });
  });

  app.use('/api/v1', createSessionsRouter(repository));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  if (serveStatic) {
    // Serve only the browser app, never server code or local data.
    app.get('/', (req, res) => res.sendFile(resolve(ROOT_DIR, 'index.html')));
    app.use('/src', express.static(resolve(ROOT_DIR, 'src')));
  }

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
