import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSessionFrame, sessionDuration, phaseStartLevels } from '../src/core/breathEngine.js';
import { getPattern } from '../src/core/patterns.js';

const box = getPattern('box');
const sigh = getPattern('sigh');

test('session starts at the first inhale with empty lungs', () => {
  const f = getSessionFrame(box, 3, 0);
  assert.equal(f.done, false);
  assert.equal(f.round, 1);
  assert.equal(f.phase.type, 'inhale');
  assert.equal(f.level, 0);
  assert.equal(f.phaseRemaining, 4);
});

test('phases advance in order within a round', () => {
  assert.equal(getSessionFrame(box, 3, 4.5).phaseIndex, 1);
  assert.equal(getSessionFrame(box, 3, 8.5).phase.type, 'exhale');
  assert.equal(getSessionFrame(box, 3, 12.5).phaseIndex, 3);
});

test('rounds roll over after a full cycle', () => {
  const f = getSessionFrame(box, 3, 16.2);
  assert.equal(f.round, 2);
  assert.equal(f.phaseIndex, 0);
});

test('level is full during the hold after inhale and halfway mid-inhale', () => {
  assert.equal(getSessionFrame(box, 1, 6).level, 1);
  assert.ok(Math.abs(getSessionFrame(box, 1, 2).level - 0.5) < 1e-9);
});

test('session reports done at and after total duration', () => {
  const total = sessionDuration(box, 3);
  assert.equal(total, 48);
  const f = getSessionFrame(box, 3, total);
  assert.equal(f.done, true);
  assert.equal(f.sessionProgress, 1);
  assert.equal(f.remaining, 0);
  assert.equal(getSessionFrame(box, 3, total + 100).done, true);
});

test('negative elapsed time is treated as zero', () => {
  assert.equal(getSessionFrame(box, 1, -5).phaseElapsed, 0);
});

test('double-inhale pattern tops up from a partial level', () => {
  assert.deepEqual(phaseStartLevels(sigh), [0, 0.75, 1]);
  const mid = getSessionFrame(sigh, 1, 2.5).level;
  assert.ok(mid > 0.75 && mid < 1);
});
