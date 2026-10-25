import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { createSessionRepository } from '../server/models/sessionRepository.js';

let server, base, dir, filePath;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'breath-api-'));
  filePath = join(dir, 'sessions.json');
  const repository = await createSessionRepository({ filePath });
  server = createApp({ repository, serveStatic: false }).listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  await new Promise(r => server.close(r));
  await rm(dir, { recursive: true, force: true });
});

const post = body => fetch(`${base}/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});

test('health endpoint', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('creates, lists, persists and clears sessions', async () => {
  const res = await post({ patternId: 'box', patternName: 'Box Breathing', rounds: 6, durationSec: 96, completed: true });
  assert.equal(res.status, 201);
  const { session } = await res.json();
  assert.ok(session.id);
  assert.equal(session.completed, true);

  const list = await (await fetch(`${base}/sessions`)).json();
  assert.equal(list.sessions.length, 1);

  const onDisk = JSON.parse(await readFile(filePath, 'utf8'));
  assert.equal(onDisk[0].id, session.id);

  const stats = await (await fetch(`${base}/stats`)).json();
  assert.equal(stats.stats.totalSessions, 1);

  assert.equal((await fetch(`${base}/sessions`, { method: 'DELETE' })).status, 204);
  assert.equal((await (await fetch(`${base}/sessions`)).json()).sessions.length, 0);
});

test('rejects invalid sessions with 400', async () => {
  for (const body of [
    { patternName: 'x', rounds: 1, durationSec: 10 },
    { patternId: 'box', patternName: 'Box', rounds: 1.5, durationSec: 10 },
    { patternId: 'box', patternName: 'Box', rounds: 1, durationSec: -1 },
    { patternId: 'box', patternName: 'Box', rounds: 1, durationSec: 10, completedAt: 'not-a-date' }
  ]) {
    const res = await post(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.ok((await res.json()).error);
  }
});

test('malformed JSON returns 400, unknown API route returns 404', async () => {
  assert.equal((await post('{bad json')).status, 400);
  assert.equal((await fetch(`${base}/nope`)).status, 404);
});

test('serves built-in patterns', async () => {
  const { patterns } = await (await fetch(`${base}/patterns`)).json();
  assert.ok(patterns.some(p => p.id === 'box'));
});
