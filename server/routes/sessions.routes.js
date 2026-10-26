import express from 'express';
import { PATTERNS } from '../../src/core/patterns.ts';
import { summarize } from '../../src/core/stats.ts';
import { ValidationError } from '../../src/core/session.ts';

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 200;

/** Opaque cursor: base64url of the last row's completedAt and id. */
export function encodeCursor(row) {
  return Buffer.from(JSON.stringify({ c: row.completedAt, i: row.id })).toString('base64url');
}

/** Returns { completedAt, id } or null when the cursor is not one we issued. */
export function decodeCursor(cursor) {
  if (typeof cursor !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(cursor)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (parsed && typeof parsed.c === 'string' && typeof parsed.i === 'string' && !Number.isNaN(Date.parse(parsed.c))) {
      return { completedAt: parsed.c, id: parsed.i };
    }
  } catch {
    // fall through
  }
  return null;
}

function parseLimit(raw) {
  if (raw === undefined) return DEFAULT_PAGE_LIMIT;
  if (typeof raw !== 'string' || !/^\d{1,4}$/.test(raw)) return null;
  const limit = Number(raw);
  return limit >= 1 && limit <= MAX_PAGE_LIMIT ? limit : null;
}

export function createSessionsRouter(repository) {
  const router = express.Router();

  router.get('/patterns', (req, res) => {
    res.json({ patterns: PATTERNS });
  });

  router.get('/sessions', (req, res) => {
    const limit = parseLimit(req.query.limit);
    if (limit === null) return res.status(400).json({ error: `limit must be an integer 1-${MAX_PAGE_LIMIT}` });
    let after = null;
    if (req.query.cursor !== undefined) {
      after = decodeCursor(req.query.cursor);
      if (!after) return res.status(400).json({ error: 'cursor is invalid' });
    }
    const { sessions, hasMore } = repository.listPage({ limit, after });
    res.json({ sessions, nextCursor: hasMore ? encodeCursor(sessions[sessions.length - 1]) : null });
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
