/**
 * Session storage for the API.
 * Keeps sessions in memory and, when a file path is given, persists them as JSON.
 * Writes are serialized through a promise chain so concurrent POSTs can't interleave.
 * Each write snapshots memory when it actually runs, so the file always matches memory
 * after the queue drains. A failed write is reported to that caller and rolled back in
 * memory, and never blocks the writes queued after it.
 */
import * as nodeFs from 'node:fs/promises';
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

  return {
    list() {
      return [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
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
