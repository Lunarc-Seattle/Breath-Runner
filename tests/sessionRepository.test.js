import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionRepository } from '../server/models/sessionRepository.js';

const run = { patternId: 'MAP-FOREST-01', patternName: 'Forest', rounds: 1, durationSec: 30 };

/** In-memory fs whose next `failNext` writes throw. */
function fakeFs() {
  const files = new Map();
  const fs = {
    failNext: 0,
    files,
    readFile: async p => {
      if (!files.has(p)) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return files.get(p);
    },
    writeFile: async (p, data) => {
      if (fs.failNext > 0) {
        fs.failNext -= 1;
        throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      }
      files.set(p, data);
    },
    rename: async (from, to) => {
      files.set(to, files.get(from));
      files.delete(from);
    },
    mkdir: async () => {}
  };
  return fs;
}

test('a failed write is rolled back and does not poison later writes', async () => {
  const fs = fakeFs();
  const repo = await createSessionRepository({ filePath: '/data/sessions.json', fs });

  fs.failNext = 1;
  await assert.rejects(repo.add(run), /disk full/);
  assert.equal(repo.list().length, 0, 'memory must not keep the unsaved session');

  await repo.add(run);
  assert.equal(repo.list().length, 1);
  assert.equal(JSON.parse(fs.files.get('/data/sessions.json')).length, 1);
});

test('a failed clear keeps the sessions', async () => {
  const fs = fakeFs();
  const repo = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  await repo.add(run);
  fs.failNext = 1;
  await assert.rejects(repo.clear());
  assert.equal(repo.list().length, 1);
});

test('reloads saved sessions from disk', async () => {
  const fs = fakeFs();
  const first = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  await first.add(run);
  const second = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  assert.equal(second.list().length, 1);
});

test('concurrent adds are all persisted', async () => {
  const fs = fakeFs();
  const repo = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  await Promise.all(Array.from({ length: 10 }, () => repo.add(run)));
  assert.equal(JSON.parse(fs.files.get('/data/sessions.json')).length, 10);
});
