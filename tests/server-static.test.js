import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pino from 'pino';
import { createApp } from '../server/app.js';
import { createSessionRepository } from '../server/models/sessionRepository.js';

const silent = pino({ level: 'silent' });

// Express 5 rejects absolute sendFile paths that pass through a dot-directory. The app must still
// serve its docs and front end when the checkout lives somewhere like ~/.cache/... or .claude/...
test('serves openapi.yaml and index.html from a root inside a dot-directory', async () => {
  const base = await mkdtemp(join(tmpdir(), 'br-'));
  const root = join(base, '.hidden', 'checkout');
  await mkdir(join(root, 'docs'), { recursive: true });
  await mkdir(join(root, 'dist'), { recursive: true });
  await writeFile(join(root, 'docs', 'openapi.yaml'), 'openapi: 3.1.0\n');
  await writeFile(join(root, 'dist', 'index.html'), '<!doctype html><title>ok</title>');

  const app = createApp({
    repository: await createSessionRepository(),
    logger: silent,
    rateLimit: false,
    rootDir: root
  });
  const server = app.listen(0);
  const base_ = `http://127.0.0.1:${server.address().port}`;
  try {
    const spec = await fetch(`${base_}/api/v1/openapi.yaml`);
    assert.equal(spec.status, 200);
    assert.match(await spec.text(), /openapi: 3\.1\.0/);
    const page = await fetch(`${base_}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>ok<\/title>/);
  } finally {
    await new Promise(r => server.close(r));
    await rm(base, { recursive: true, force: true });
  }
});
