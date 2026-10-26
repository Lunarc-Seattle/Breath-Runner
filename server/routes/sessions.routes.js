import express from 'express';
import { PATTERNS } from '../../src/core/patterns.ts';
import { summarize } from '../../src/core/stats.ts';
import { ValidationError } from '../../src/core/session.ts';

export function createSessionsRouter(repository) {
  const router = express.Router();

  router.get('/patterns', (req, res) => {
    res.json({ patterns: PATTERNS });
  });

  router.get('/sessions', (req, res) => {
    res.json({ sessions: repository.list() });
  });

  router.post('/sessions', async (req, res, next) => {
    try {
      const session = await repository.add(req.body);
      res.status(201).json({ session });
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
      next(err);
    }
  });

  router.delete('/sessions', async (req, res, next) => {
    try {
      await repository.clear();
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.get('/stats', (req, res) => {
    res.json({ stats: summarize(repository.list()) });
  });

  return router;
}
