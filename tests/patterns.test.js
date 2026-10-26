import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, cycleSeconds, createCustomPattern, validatePattern, getPattern } from '../src/core/patterns.ts';

test('all built-in patterns are valid', () => {
  for (const p of PATTERNS) assert.equal(validatePattern(p), true, p.id);
});

test('cycleSeconds sums phase durations', () => {
  assert.equal(cycleSeconds(getPattern('box')), 16);
  assert.equal(cycleSeconds(getPattern('478')), 19);
  assert.equal(cycleSeconds(getPattern('coherent')), 11);
});

test('createCustomPattern drops zero-length phases and clamps values', () => {
  const p = createCustomPattern({ inhale: 4, holdIn: 0, exhale: 99, holdOut: 2 });
  assert.deepEqual(p.phases.map(ph => [ph.type, ph.seconds]), [['inhale', 4], ['exhale', 20], ['hold', 2]]);
});

test('createCustomPattern rejects patterns without inhale or exhale', () => {
  assert.throws(() => createCustomPattern({ inhale: 0, exhale: 4 }), /inhale/);
  assert.throws(() => createCustomPattern({ inhale: 4, exhale: 0 }), /exhale/);
});
