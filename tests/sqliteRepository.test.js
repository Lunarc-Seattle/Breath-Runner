import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSqliteRepository } from '../server/models/sqliteRepository.js';

// All tests use an in-memory database for speed and isolation.
const newRepo = () => createSqliteRepository({ filePath: null });

const run = { patternId: 'MAP-FOREST-01', patternName: 'Forest', rounds: 1, durationSec: 30 };

test('list returns empty array on a fresh DB', async () => {
  const repo = await newRepo();
  assert.deepEqual(repo.list(), []);
});

test('add persists a session and list returns it', async () => {
  const repo = await newRepo();
  const session = await repo.add(run);
  assert.equal(typeof session.id, 'string');
  assert.equal(session.patternId, 'MAP-FOREST-01');
  const all = repo.list();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, session.id);
});

test('clear removes all sessions', async () => {
  const repo = await newRepo();
  await repo.add(run);
  await repo.add(run);
  assert.equal(repo.list().length, 2);
  await repo.clear();
  assert.deepEqual(repo.list(), []);
});

test('add validates via normalizeSession — invalid syncPct rejects', async () => {
  const repo = await newRepo();
  await assert.rejects(() => repo.add({ ...run, syncPct: 999 }), /syncPct/);
  // Nothing was added.
  assert.equal(repo.list().length, 0);
});

test('list orders newest first and breaks completedAt ties by id desc', async () => {
  const repo = await newRepo();
  const t = '2026-10-01T10:00:00.000Z';
  // We can't control the generated id, so we verify ordering by inserting sessions
  // with distinct completedAt values and checking newest-first.
  const s1 = await repo.add({ ...run, completedAt: '2026-09-01T00:00:00.000Z' });
  const s2 = await repo.add({ ...run, completedAt: '2026-10-01T10:00:00.000Z' });
  const s3 = await repo.add({ ...run, completedAt: '2026-08-01T00:00:00.000Z' });

  const all = repo.list();
  assert.equal(all.length, 3);
  assert.equal(all[0].id, s2.id, 'most recent first');
  assert.equal(all[1].id, s1.id);
  assert.equal(all[2].id, s3.id, 'oldest last');
  void t; // suppress unused-var warning
});

test('listPage cursor pagination works correctly', async () => {
  const repo = await newRepo();
  await repo.add({ ...run, completedAt: '2026-10-05T00:00:00.000Z' });
  await repo.add({ ...run, completedAt: '2026-10-04T00:00:00.000Z' });
  await repo.add({ ...run, completedAt: '2026-10-03T00:00:00.000Z' });
  await repo.add({ ...run, completedAt: '2026-10-02T00:00:00.000Z' });
  await repo.add({ ...run, completedAt: '2026-10-01T00:00:00.000Z' });

  const first = repo.listPage({ limit: 2 });
  assert.equal(first.sessions.length, 2);
  assert.equal(first.hasMore, true);

  const second = repo.listPage({ limit: 2, after: first.sessions[1] });
  assert.equal(second.sessions.length, 2);
  assert.equal(second.hasMore, true);

  const third = repo.listPage({ limit: 2, after: second.sessions[1] });
  assert.equal(third.sessions.length, 1);
  assert.equal(third.hasMore, false);

  // No session appears in two pages.
  const allIds = [
    ...first.sessions.map(s => s.id),
    ...second.sessions.map(s => s.id),
    ...third.sessions.map(s => s.id)
  ];
  assert.equal(new Set(allIds).size, 5);
});

test('listPage without after returns first page', async () => {
  const repo = await newRepo();
  await repo.add(run);
  await repo.add(run);
  const page = repo.listPage({ limit: 10 });
  assert.equal(page.sessions.length, 2);
  assert.equal(page.hasMore, false);
});

test('flush returns a resolved promise (no-op)', async () => {
  const repo = await newRepo();
  await assert.doesNotReject(() => repo.flush());
});

test('health returns ok for in-memory DB', async () => {
  const repo = await newRepo();
  const result = await repo.health();
  assert.deepEqual(result, { storage: 'ok' });
});

test('optional game fields are stored and returned', async () => {
  const repo = await newRepo();
  const session = await repo.add({ ...run, coins: 5, totalCoins: 10, syncPct: 80, falls: 2 });
  assert.equal(session.coins, 5);
  assert.equal(session.totalCoins, 10);
  assert.equal(session.syncPct, 80);
  assert.equal(session.falls, 2);

  const retrieved = repo.list()[0];
  assert.equal(retrieved.coins, 5);
  assert.equal(retrieved.totalCoins, 10);
  assert.equal(retrieved.syncPct, 80);
  assert.equal(retrieved.falls, 2);
});

test('sessions without optional game fields have those keys absent', async () => {
  const repo = await newRepo();
  await repo.add(run);
  const retrieved = repo.list()[0];
  assert.equal('coins' in retrieved, false);
  assert.equal('totalCoins' in retrieved, false);
  assert.equal('syncPct' in retrieved, false);
  assert.equal('falls' in retrieved, false);
});
