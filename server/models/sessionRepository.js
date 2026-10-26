/**
 * Session storage for the API.
 * Keeps sessions in memory and, when a file path is given, persists them as JSON.
 * Writes are serialized through a promise chain so concurrent POSTs can't interleave.
 * Each write snapshots memory when it actually runs, so the file always matches memory
 * after the queue drains. A failed write is reported to that caller and rolled back in
 * memory, and never blocks the writes queued after it.
 *
 * Rows are ordered newest first by (completedAt desc, id desc), so pages are stable
 * even when several runs share a timestamp.
 */
import * as nodeFs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname } from 'node:path';
import { normalizeSession } from '../../src/core/session.ts';

/** A stored row the API can list and sort; anything else in the file is skipped on load. */
function isStoredSession(row) {
  return (
    row !== null &&
    typeof row === 'object' &&
    typeof row.id === 'string' &&
    typeof row.completedAt === 'string' &&
    !Number.isNaN(Date.parse(row.completedAt))
  );
}

/** Newest first; ties on completedAt are broken by id so the order is total. */
export function compareSessions(a, b) {
  const dt = Date.parse(b.completedAt) - Date.parse(a.completedAt);
  if (dt !== 0) return dt;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export async function createSessionRepository({ filePath = null, fs = nodeFs, log = console } = {}) {
  let sessions = [];
  let writeChain = Promise.resolve();

  if (filePath) {
    try {
      const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
      if (Array.isArray(parsed)) {
        sessions = parsed.filter(isStoredSession);
        const skipped = parsed.length - sessions.length;
        if (skipped > 0) log.warn(`sessions: skipped ${skipped} malformed row(s) in ${filePath}`);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  function persist() {
    if (!filePath) return Promise.resolve();
    const write = writeChain.then(async () => {
      const snapshot = JSON.stringify(sessions, null, 2);
      await fs.mkdir(dirname(filePath), { recursive: true });
      // Write-then-rename so a crash never leaves a half-written file.
      const tmp = `${filePath}.tmp`;
      await fs.writeFile(tmp, snapshot);
      await fs.rename(tmp, filePath);
    });
    writeChain = write.catch(() => {}); // keep the queue alive for the next write
    return write;
  }

  function sorted() {
    return [...sessions].sort(compareSessions);
  }

  return {
    /** Every session, newest first. */
    list() {
      return sorted();
    },
    /**
     * One page of sessions, newest first. `after` is the last row of the previous page
     * ({ completedAt, id }); only rows strictly after it in the ordering are returned.
     */
    listPage({ limit, after = null }) {
      let rows = sorted();
      if (after) rows = rows.filter(s => compareSessions(after, s) < 0);
      const page = rows.slice(0, limit);
      return { sessions: page, hasMore: rows.length > limit };
    },
    /** Whether the store can accept writes: the data directory must be writable. */
    async health() {
      if (!filePath) return { storage: 'ok' };
      const dir = dirname(filePath);
      try {
        await fs.access(dir, fsConstants.W_OK);
        return { storage: 'ok' };
      } catch (err) {
        if (err.code === 'ENOENT') {
          // Not created yet: the first write would create it, so check that can happen.
          try {
            await fs.mkdir(dir, { recursive: true });
            await fs.access(dir, fsConstants.W_OK);
            return { storage: 'ok' };
          } catch {
            return { storage: 'error' };
          }
        }
        return { storage: 'error' };
      }
    },
    /** Resolves once every queued write has finished (successfully or not). */
    async flush() {
      let current;
      // Writes queued while we wait extend the chain, so wait until it stops moving.
      do {
        current = writeChain;
        await current;
      } while (current !== writeChain);
    },
    async add(input) {
      const session = normalizeSession(input);
      sessions = [session, ...sessions];
      try {
        await persist();
      } catch (err) {
        sessions = sessions.filter(s => s !== session);
        throw err;
      }
      return session;
    },
    async clear() {
      const previous = sessions;
      sessions = [];
      try {
        await persist();
      } catch (err) {
        // Put the cleared rows back, keeping anything added while the clear was in flight.
        sessions = [...sessions, ...previous];
        throw err;
      }
    }
  };
}
