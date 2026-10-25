/**
 * Session storage for the API.
 * Keeps sessions in memory and, when a file path is given, persists them as JSON.
 * Writes are serialized through a promise chain so concurrent POSTs can't interleave.
 */
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { normalizeSession } from '../../src/core/session.js';

export async function createSessionRepository({ filePath = null } = {}) {
  let sessions = [];
  let writeChain = Promise.resolve();

  if (filePath) {
    try {
      const parsed = JSON.parse(await readFile(filePath, 'utf8'));
      if (Array.isArray(parsed)) sessions = parsed;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  function persist() {
    if (!filePath) return Promise.resolve();
    const snapshot = JSON.stringify(sessions, null, 2);
    writeChain = writeChain.then(async () => {
      await mkdir(dirname(filePath), { recursive: true });
      // Write-then-rename so a crash never leaves a half-written file.
      const tmp = `${filePath}.tmp`;
      await writeFile(tmp, snapshot);
      await rename(tmp, filePath);
    });
    return writeChain;
  }

  return {
    list() {
      return [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    },
    async add(input) {
      const session = normalizeSession(input);
      sessions = [session, ...sessions.filter(s => s.id !== session.id)];
      await persist();
      return session;
    },
    async clear() {
      sessions = [];
      await persist();
    }
  };
}
