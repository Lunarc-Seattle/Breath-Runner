/**
 * Session storage for the API.
 * Keeps sessions in memory and, when a file path is given, persists them as JSON.
 * Writes are serialized through a promise chain so concurrent POSTs can't interleave.
 * A failed write is reported to that caller and rolled back in memory, and never
 * blocks the writes queued after it.
 */
import * as nodeFs from 'node:fs/promises';
import { dirname } from 'node:path';
import { normalizeSession } from '../../src/core/session.ts';

export async function createSessionRepository({ filePath = null, fs = nodeFs } = {}) {
  let sessions = [];
  let writeChain = Promise.resolve();

  if (filePath) {
    try {
      const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
      if (Array.isArray(parsed)) sessions = parsed;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  function persist() {
    if (!filePath) return Promise.resolve();
    const snapshot = JSON.stringify(sessions, null, 2);
    const write = writeChain.then(async () => {
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
        sessions = previous;
        throw err;
      }
    }
  };
}
