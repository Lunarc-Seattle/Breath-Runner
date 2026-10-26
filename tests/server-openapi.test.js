import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pino from 'pino';
import { createApp } from '../server/app.js';
import { createSessionRepository } from '../server/models/sessionRepository.js';

let server, base;

before(async () => {
  const repository = await createSessionRepository();
  server = createApp({ repository, serveStatic: false, logger: pino({ level: 'silent' }), rateLimit: false }).listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(() => new Promise(r => server.close(r)));

/** Tiny line-based reader for the `paths:` block: [[path, method], ...]. */
function documentedOperations(yaml) {
  const ops = [];
  let inPaths = false;
  let path = null;
  for (const line of yaml.split('\n')) {
    if (/^\S/.test(line)) {
      inPaths = line.startsWith('paths:');
      continue;
    }
    if (!inPaths) continue;
    const p = line.match(/^ {2}(\/\S*):\s*$/);
    if (p) {
      path = p[1];
      continue;
    }
    const m = line.match(/^ {4}(get|post|put|patch|delete):\s*$/);
    if (m && path) ops.push([path, m[1].toUpperCase()]);
  }
  return ops;
}

test('the OpenAPI document is served as YAML and declares 3.1', async () => {
  const res = await fetch(`${base}/openapi.yaml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/yaml/);
  const text = await res.text();
  assert.match(text, /^openapi: 3\.1\.\d+/);
  assert.equal(text, await readFile(new URL('../docs/openapi.yaml', import.meta.url), 'utf8'));
});

test('every documented path and method is routed', async () => {
  const yaml = await readFile(new URL('../docs/openapi.yaml', import.meta.url), 'utf8');
  const ops = documentedOperations(yaml);
  assert.ok(ops.length >= 7, `found ${ops.length} operations`);
  for (const [path, method] of ops) {
    const init = { method };
    if (method === 'POST') {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = '{}';
    }
    const res = await fetch(`${base}${path}`, init);
    assert.notEqual(res.status, 404, `${method} ${path}`);
    assert.ok(res.status < 500, `${method} ${path} -> ${res.status}`);
  }
  // Sanity: the check really does catch an undocumented route.
  assert.equal((await fetch(`${base}/not-a-route`)).status, 404);
});
