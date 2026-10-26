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

test('malformed rows in the file are skipped, not fatal', async () => {
  const fs = fakeFs();
  const good = {
    id: 'a',
    patternId: 'p',
    patternName: 'P',
    rounds: 1,
    durationSec: 10,
    completedAt: '2026-10-01T10:00:00.000Z'
  };
  fs.files.set(
    '/data/sessions.json',
    JSON.stringify([good, { id: 'no-date' }, null, 'junk', { ...good, id: 'b', completedAt: 'nope' }])
  );
  const warnings = [];
  const repo = await createSessionRepository({
    filePath: '/data/sessions.json',
    fs,
    log: { warn: m => warnings.push(m) }
  });
  assert.deepEqual(
    repo.list().map(s => s.id),
    ['a']
  );
  assert.equal(warnings.length, 1);
});

test('interleaved adds: a failed write never resurrects its row on disk', async () => {
  const fs = fakeFs();
  const repo = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  fs.failNext = 1;
  const [a, b] = await Promise.allSettled([repo.add(run), repo.add(run)]);
  assert.equal(a.status, 'rejected');
  assert.equal(b.status, 'fulfilled');
  const onDisk = JSON.parse(fs.files.get('/data/sessions.json'));
  assert.deepEqual(
    onDisk.map(s => s.id),
    repo.list().map(s => s.id)
  );
  assert.equal(onDisk.length, 1);
});

test('a failed clear keeps rows added while it was in flight', async () => {
  const fs = fakeFs();
  const repo = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  await repo.add(run);
  fs.failNext = 1;
  const [cleared, added] = await Promise.allSettled([repo.clear(), repo.add(run)]);
  assert.equal(cleared.status, 'rejected');
  assert.equal(added.status, 'fulfilled');
  assert.equal(repo.list().length, 2);
  assert.equal(JSON.parse(fs.files.get('/data/sessions.json')).length, 2);
});
