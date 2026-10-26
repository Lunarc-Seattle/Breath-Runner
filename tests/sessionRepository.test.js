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

test('list orders newest first and breaks completedAt ties by id desc', async () => {
  const fs = fakeFs();
  const t = '2026-10-01T10:00:00.000Z';
  const row = (id, completedAt = t) => ({
    id,
    patternId: 'p',
    patternName: 'P',
    rounds: 1,
    durationSec: 10,
    completedAt
  });
  fs.files.set(
    '/data/sessions.json',
    JSON.stringify([
      row('b'),
      row('a'),
      row('c'),
      row('z', '2026-09-01T00:00:00.000Z'),
      row('b2', '2026-10-01T10:00:00Z')
    ])
  );
  const repo = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  // '...Z' and '...000Z' are the same instant, so they tie and sort by id.
  assert.deepEqual(
    repo.list().map(s => s.id),
    ['c', 'b2', 'b', 'a', 'z']
  );
  const first = repo.listPage({ limit: 2 });
  assert.deepEqual(
    first.sessions.map(s => s.id),
    ['c', 'b2']
  );
  assert.equal(first.hasMore, true);
  const next = repo.listPage({ limit: 10, after: first.sessions[1] });
  assert.deepEqual(
    next.sessions.map(s => s.id),
    ['b', 'a', 'z']
  );
  assert.equal(next.hasMore, false);
});

test('flush waits for every queued write, including ones queued while waiting', async () => {
  const fs = fakeFs();
  let release;
  const gate = new Promise(r => (release = r));
  const writeFile = fs.writeFile;
  fs.writeFile = async (p, d) => {
    await gate;
    return writeFile(p, d);
  };
  const repo = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  const adds = [repo.add(run)];
  let flushed = false;
  const flushing = repo.flush().then(() => (flushed = true));
  adds.push(repo.add(run));
  await new Promise(r => setTimeout(r, 10));
  assert.equal(flushed, false, 'flush must wait for pending writes');
  release();
  await flushing;
  assert.equal(JSON.parse(fs.files.get('/data/sessions.json')).length, 2);
  await Promise.all(adds);
});

test('flush resolves even when a queued write failed, and on an in-memory repo', async () => {
  const fs = fakeFs();
  const repo = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  fs.failNext = 1;
  const failing = repo.add(run).catch(err => err);
  await repo.flush();
  assert.match((await failing).message, /disk full/);
  await (await createSessionRepository()).flush();
});

test('health: in-memory is always ok; a file store checks its directory is writable', async () => {
  assert.deepEqual(await (await createSessionRepository()).health(), { storage: 'ok' });

  const fs = fakeFs();
  const repo = await createSessionRepository({ filePath: '/data/sessions.json', fs });
  const deny = code => async () => {
    throw Object.assign(new Error(code), { code });
  };

  fs.access = async () => {};
  assert.deepEqual(await repo.health(), { storage: 'ok' });

  fs.access = deny('EACCES');
  assert.deepEqual(await repo.health(), { storage: 'error' });

  // Missing directory: created on demand, then checked.
  let created = false;
  fs.mkdir = async () => {
    created = true;
  };
  fs.access = async () => {
    if (!created) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  };
  assert.deepEqual(await repo.health(), { storage: 'ok' });

  created = false;
  fs.mkdir = deny('EROFS');
  assert.deepEqual(await repo.health(), { storage: 'error' });
});

test('health reports a real read-only directory as an error', { skip: process.getuid?.() === 0 }, async () => {
  const { mkdtemp, chmod, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'breath-health-'));
  try {
    const repo = await createSessionRepository({ filePath: join(dir, 'sessions.json') });
    assert.deepEqual(await repo.health(), { storage: 'ok' });
    await chmod(dir, 0o500);
    assert.deepEqual(await repo.health(), { storage: 'error' });
  } finally {
    await chmod(dir, 0o700);
    await rm(dir, { recursive: true, force: true });
  }
});
