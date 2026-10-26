import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import pino from 'pino';
import { createApp } from '../server/app.js';
import { createSessionRepository } from '../server/models/sessionRepository.js';
import { CSP_DIRECTIVES, CSP_HEADER_ONLY, cspString } from '../config/csp.js';

const silent = pino({ level: 'silent' });
const servers = [];

async function start(options) {
  const repository = options.repository ?? (await createSessionRepository());
  const server = createApp({ serveStatic: false, logger: silent, rateLimit: false, ...options, repository }).listen(0);
  await new Promise(r => server.once('listening', r));
  servers.push(server);
  return { repository, base: `http://127.0.0.1:${server.address().port}/api/v1` };
}

after(async () => {
  await Promise.all(servers.map(s => new Promise(r => s.close(r))));
});

const run = (overrides = {}) => ({
  patternId: 'MAP-FOREST-01',
  patternName: 'Forest',
  rounds: 1,
  durationSec: 30,
  ...overrides
});

const post = (base, body) =>
  fetch(`${base}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

test('security headers: our CSP exactly, no x-powered-by', async () => {
  const { base } = await start({});
  const res = await fetch(`${base}/health`);
  // helmet joins directives with ';' and no space; compare the directives, not the separator.
  const norm = csp => csp.split(';').map(d => d.trim());
  assert.deepEqual(
    norm(res.headers.get('content-security-policy')),
    norm(cspString({ ...CSP_DIRECTIVES, ...CSP_HEADER_ONLY }))
  );
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('x-frame-options'));
});

test('write routes are rate limited with a JSON 429; reads are not', async () => {
  const { base } = await start({ rateLimit: { windowMs: 60_000, limit: 2 } });
  assert.equal((await post(base, run())).status, 201);
  assert.equal((await fetch(`${base}/sessions`, { method: 'DELETE' })).status, 204);
  const limited = await post(base, run());
  assert.equal(limited.status, 429);
  assert.match((await limited.json()).error, /too many/i);
  assert.ok(limited.headers.get('ratelimit'), 'standard RateLimit header');
  assert.ok(limited.headers.get('ratelimit-policy'));
  assert.equal(limited.headers.get('x-ratelimit-limit'), null, 'no legacy headers');
  for (let i = 0; i < 5; i++) assert.equal((await fetch(`${base}/sessions`)).status, 200);
});

test('the default rate limit allows a normal burst of writes', async () => {
  const { base } = await start({ rateLimit: undefined });
  for (let i = 0; i < 15; i++) assert.equal((await post(base, run())).status, 201);
  const res = await post(base, run());
  assert.match(res.headers.get('ratelimit'), /limit=30/);
});

test('health is 503 degraded when storage is not writable', async () => {
  const repository = await createSessionRepository();
  repository.health = async () => ({ storage: 'error' });
  const { base } = await start({ repository });
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.status, 'degraded');
  assert.equal(body.storage, 'error');
});

test('a failing health check is a 500, and unexpected errors are logged not leaked', async () => {
  const lines = [];
  const logger = pino({ level: 'error' }, { write: l => lines.push(l) });
  const repository = await createSessionRepository();
  repository.health = async () => {
    throw new Error('boom');
  };
  const { base } = await start({ repository, logger });
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: 'Internal server error' });
  assert.ok(lines.some(l => l.includes('boom')));
});

test('request logs never include the body', async () => {
  const lines = [];
  const logger = pino({ level: 'info' }, { write: l => lines.push(l) });
  const { base } = await start({ logger });
  await post(base, run({ patternName: 'SECRET-BODY-MARKER' }));
  await new Promise(r => setTimeout(r, 20));
  assert.ok(lines.length > 0, 'a request was logged');
  assert.ok(!lines.some(l => l.includes('SECRET-BODY-MARKER')));
});

test('pagination: page boundary, equal timestamps, last page', async () => {
  const { base } = await start({});
  const t = '2026-10-01T10:00:00.000Z';
  // Five runs share one timestamp so only the id tie-break orders them.
  const stamps = [t, t, t, t, t, '2026-10-02T10:00:00.000Z', '2026-09-30T10:00:00.000Z'];
  for (const completedAt of stamps) assert.equal((await post(base, run({ completedAt }))).status, 201);

  const full = (await (await fetch(`${base}/sessions?limit=200`)).json()).sessions;
  assert.equal(full.length, 7);
  assert.equal(full[0].completedAt, '2026-10-02T10:00:00.000Z');
  assert.equal(full[6].completedAt, '2026-09-30T10:00:00.000Z');
  const tied = full.slice(1, 6).map(s => s.id);
  assert.deepEqual(tied, [...tied].sort().reverse(), 'ties ordered by id desc');

  const seen = [];
  let cursor = null;
  let pages = 0;
  do {
    const qs = new URLSearchParams({ limit: '3' });
    if (cursor) qs.set('cursor', cursor);
    const body = await (await fetch(`${base}/sessions?${qs}`)).json();
    seen.push(...body.sessions.map(s => s.id));
    cursor = body.nextCursor;
    pages++;
    if (pages < 3) assert.equal(body.sessions.length, 3);
    else {
      assert.equal(body.sessions.length, 1);
      assert.equal(cursor, null, 'last page has no nextCursor');
    }
  } while (cursor);
  assert.equal(pages, 3);
  assert.deepEqual(
    seen,
    full.map(s => s.id),
    'pages concatenate to the full list, no gaps or repeats'
  );

  // Exactly one page's worth: nextCursor is still null.
  const exact = await (await fetch(`${base}/sessions?limit=7`)).json();
  assert.equal(exact.nextCursor, null);

  // Default limit and stats over everything.
  const def = await (await fetch(`${base}/sessions`)).json();
  assert.equal(def.sessions.length, 7);
  assert.equal(def.nextCursor, null);
  const { stats } = await (await fetch(`${base}/stats`)).json();
  assert.equal(stats.totalSessions, 7);
});

test('default page size is 50 and stats still cover every session', async () => {
  const repository = await createSessionRepository();
  for (let i = 0; i < 55; i++) await repository.add(run());
  const { base } = await start({ repository });
  const page = await (await fetch(`${base}/sessions`)).json();
  assert.equal(page.sessions.length, 50);
  assert.ok(page.nextCursor);
  const rest = await (await fetch(`${base}/sessions?cursor=${page.nextCursor}`)).json();
  assert.equal(rest.sessions.length, 5);
  assert.equal(rest.nextCursor, null);
  const { stats } = await (await fetch(`${base}/stats`)).json();
  assert.equal(stats.totalSessions, 55);
});

test('bad limit or cursor is a 400', async () => {
  const { base } = await start({});
  const garbage = Buffer.from('{"c":"not-a-date","i":"x"}').toString('base64url');
  for (const qs of [
    'limit=0',
    'limit=201',
    'limit=abc',
    'limit=1.5',
    'limit=-1',
    'limit=',
    'limit=1&limit=2',
    'cursor=',
    'cursor=***',
    'cursor=bm90LWpzb24',
    `cursor=${garbage}`,
    `cursor=${Buffer.from('null').toString('base64url')}`
  ]) {
    const res = await fetch(`${base}/sessions?${qs}`);
    assert.equal(res.status, 400, qs);
    assert.ok((await res.json()).error, qs);
  }
});

test('helmet headers are on static responses too', async () => {
  const repository = await createSessionRepository();
  const server = createApp({ repository, logger: silent, rateLimit: false }).listen(0);
  await new Promise(r => server.once('listening', r));
  servers.push(server);
  const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
  assert.ok(res.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
});
